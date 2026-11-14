// KRDS 달력(calendar) 모양의 날짜 선택기. 마크업: [data-datepicker] 안에 input, [data-datepicker-open], [data-datepicker-pop].
// 입력칸에 직접 쳐도 되고(parseLooseYmd), 달력에서 고르면 '2026.11.02' 형식으로 넣는다.
// 키보드: 방향키 하루/한 주, PageUp/PageDown 한 달, Home/End 주 처음/끝, Esc 닫기.
import { addDays, addMonths, parseLooseYmd, toDots, todayYmd } from '../lib/due.ts';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}) =>
	Object.assign(document.createElement(tag), props);

function draw(root: HTMLElement, focusYmd: string, moveFocus: boolean) {
	const pop = root.querySelector<HTMLElement>('[data-datepicker-pop]')!;
	const input = root.querySelector<HTMLInputElement>('input')!;
	const selected = parseLooseYmd(input.value);
	const today = todayYmd();
	root.dataset.focus = focusYmd;
	const [y, m] = focusYmd.split('-').map(Number);
	const first = `${y}-${String(m).padStart(2, '0')}-01`;
	// 달력 첫 칸: 그달 1일이 있는 주의 일요일
	const start = addDays(first, -new Date(Date.UTC(y, m - 1, 1)).getUTCDay());

	const head = el('div', { className: 'datepicker-head' });
	const prev = el('button', { type: 'button', className: 'datepicker-move', innerHTML: '<span aria-hidden="true">‹</span>' });
	prev.setAttribute('aria-label', '이전 달');
	prev.dataset.move = '-1';
	const next = el('button', { type: 'button', className: 'datepicker-move', innerHTML: '<span aria-hidden="true">›</span>' });
	next.setAttribute('aria-label', '다음 달');
	next.dataset.move = '1';
	const title = el('p', { className: 'datepicker-title', textContent: `${y}년 ${m}월` });
	title.setAttribute('aria-live', 'polite');
	head.append(prev, title, next);

	const table = el('table', { className: 'datepicker-table' });
	table.append(el('caption', { className: 'sr-only', textContent: `${y}년 ${m}월` }));
	const thead = el('thead');
	const hr = el('tr');
	WEEK.forEach((w) => hr.append(el('th', { scope: 'col', textContent: w })));
	thead.append(hr);
	const tbody = el('tbody');
	for (let week = 0; week < 6; week++) {
		const tr = el('tr');
		for (let d = 0; d < 7; d++) {
			const ymd = addDays(start, week * 7 + d);
			const td = el('td');
			const btn = el('button', { type: 'button', className: 'datepicker-day', textContent: String(+ymd.slice(8)) });
			btn.dataset.date = ymd;
			btn.tabIndex = ymd === focusYmd ? 0 : -1;
			btn.setAttribute('aria-label', `${+ymd.slice(5, 7)}월 ${+ymd.slice(8)}일 ${WEEK[d]}요일`);
			if (ymd.slice(0, 7) !== first.slice(0, 7)) btn.classList.add('is-other');
			if (d === 0) btn.classList.add('is-sun');
			if (ymd === today) btn.setAttribute('aria-current', 'date');
			if (ymd === selected) btn.setAttribute('aria-pressed', 'true');
			td.append(btn);
			tr.append(td);
		}
		tbody.append(tr);
	}
	table.append(thead, tbody);

	const foot = el('div', { className: 'datepicker-foot' });
	const todayBtn = el('button', { type: 'button', className: 'datepicker-text-btn', textContent: '오늘' });
	todayBtn.dataset.date = today;
	const close = el('button', { type: 'button', className: 'datepicker-text-btn', textContent: '닫기' });
	close.dataset.close = '';
	foot.append(todayBtn, close);

	pop.replaceChildren(head, table, foot);
	if (moveFocus) pop.querySelector<HTMLElement>(`[data-date="${focusYmd}"].datepicker-day`)?.focus();
}

function open(root: HTMLElement) {
	const input = root.querySelector<HTMLInputElement>('input')!;
	root.querySelector<HTMLElement>('[data-datepicker-pop]')!.hidden = false;
	root.querySelector('[data-datepicker-open]')!.setAttribute('aria-expanded', 'true');
	draw(root, parseLooseYmd(input.value) ?? todayYmd(), true);
}

function close(root: HTMLElement, focusButton = true) {
	const pop = root.querySelector<HTMLElement>('[data-datepicker-pop]')!;
	if (pop.hidden) return;
	pop.hidden = true;
	const btn = root.querySelector<HTMLElement>('[data-datepicker-open]')!;
	btn.setAttribute('aria-expanded', 'false');
	if (focusButton) btn.focus();
}

function pick(root: HTMLElement, ymd: string) {
	const input = root.querySelector<HTMLInputElement>('input')!;
	input.value = toDots(ymd);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	close(root, false);
	input.focus();
}

let initialized = false;

export function initDatepicker() {
	if (initialized) return;
	initialized = true;

	document.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		const root = target.closest<HTMLElement>('[data-datepicker]');
		// 바깥을 누르면 열린 달력을 모두 닫는다
		document.querySelectorAll<HTMLElement>('[data-datepicker]').forEach((r) => {
			if (r !== root) close(r, false);
		});
		if (!root) return;
		if (target.closest('[data-datepicker-open]')) {
			const pop = root.querySelector<HTMLElement>('[data-datepicker-pop]')!;
			if (pop.hidden) open(root);
			else close(root);
			return;
		}
		const move = target.closest<HTMLElement>('[data-move]');
		if (move) {
			draw(root, addMonths(root.dataset.focus!, Number(move.dataset.move)), false);
			return;
		}
		const day = target.closest<HTMLElement>('[data-date]');
		if (day) pick(root, day.dataset.date!);
		if (target.closest('[data-close]')) close(root);
	});

	document.addEventListener('keydown', (e) => {
		const target = e.target as HTMLElement;
		const root = target.closest<HTMLElement>('[data-datepicker]');
		if (!root) return;
		if (e.key === 'Escape') {
			close(root);
			return;
		}
		if (!target.matches('.datepicker-day')) return;
		const from = target.dataset.date!;
		const dow = new Date(`${from}T00:00:00Z`).getUTCDay();
		const to: Record<string, () => string> = {
			ArrowLeft: () => addDays(from, -1),
			ArrowRight: () => addDays(from, 1),
			ArrowUp: () => addDays(from, -7),
			ArrowDown: () => addDays(from, 7),
			PageUp: () => addMonths(from, -1),
			PageDown: () => addMonths(from, 1),
			Home: () => addDays(from, -dow),
			End: () => addDays(from, 6 - dow),
		};
		if (!to[e.key]) return;
		e.preventDefault();
		draw(root, to[e.key](), true);
	});
}
