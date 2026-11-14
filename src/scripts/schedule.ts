// 내 일정 페이지: 입국일로 할 일을 묶어 그린다.
// 2주 날짜 띠(오늘~13일 뒤)에서 고른 날의 할 일 / 지난 기한 / 다가오는 일(2주 뒤) / 날짜 없는 일 / 완료.
// 체크칸은 기존 체크리스트와 같은 data-task-id를 써서 진행 상황이 공유된다.
import { addDays, daysBetween, formatKo, groupSchedule, planItem, todayYmd, type Due, type PlanItem } from '../lib/due.ts';
import { taskEvent } from '../lib/ics.ts';
import { getArrival, onArrivalChange } from './arrival.ts';
import { BADGE, downloadIcs, dueText } from './calendar.ts';
import { getProgress, PROGRESS_EVENT } from './checklist.ts';

interface TaskMeta {
	id: string;
	title: string;
	phase: string;
	topic: string;
	deadline: string;
	optional: boolean;
	due?: Due;
}

const STRIP_DAYS = 14;
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
let tasks: TaskMeta[] = [];
let items: PlanItem[] = [];
/** 날짜 띠에서 고른 날. 범위를 벗어나면 다시 고른다. */
let selected: string | null = null;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}) =>
	Object.assign(document.createElement(tag), props);
const weekday = (ymd: string) => WEEK[new Date(`${ymd}T00:00:00Z`).getUTCDay()];

function row(item: PlanItem, done: boolean, today: string, overdue: boolean): HTMLLIElement {
	const t = tasks.find((x) => x.id === item.id)!;
	const li = el('li', { className: done ? 'schedule-item is-done' : 'schedule-item' });
	li.dataset.taskCard = t.id;

	const label = el('label', { className: 'task-check-wrap' });
	const input = el('input', { type: 'checkbox', className: 'task-check', checked: done });
	input.dataset.taskId = t.id;
	input.setAttribute('aria-label', `${t.title} 완료 표시`);
	label.append(input);

	const icon = document.querySelector(`[data-topic-icon="${t.topic}"] > *`)?.cloneNode(true);

	const body = el('div', { className: 'schedule-item-body' });
	body.append(el('a', { href: `/tasks/${t.id}/`, textContent: t.title, className: 'schedule-title' }));
	if (t.optional) body.append(el('span', { className: 'task-tag', textContent: '선택' }));
	const when = el('p', {
		className: overdue ? 'schedule-when is-overdue' : 'schedule-when',
		textContent: item.date ? dueText(item, today) : t.deadline,
	});
	body.append(when);
	// 예상·권장 날짜는 원래 기준 문장을 함께 보여 준다
	if (item.kind === 'estimate' || item.kind === 'window') {
		body.append(el('p', { className: 'schedule-basis', textContent: `기준: ${t.deadline}` }));
	}

	li.append(label);
	if (icon) li.append(icon);
	li.append(body);
	if (BADGE[item.kind]) li.append(el('span', { className: 'home-chip is-window', textContent: BADGE[item.kind] }));
	return li;
}

function renderStrip(today: string, byDate: Map<string, PlanItem[]>) {
	const strip = document.querySelector<HTMLElement>('[data-strip]')!;
	const buttons = Array.from({ length: STRIP_DAYS }, (_, i) => {
		const ymd = addDays(today, i);
		const count = byDate.get(ymd)?.length ?? 0;
		const btn = el('button', { type: 'button', className: 'strip-day' });
		btn.dataset.date = ymd;
		btn.setAttribute('aria-pressed', String(ymd === selected));
		btn.setAttribute(
			'aria-label',
			`${formatKo(ymd, today)} ${weekday(ymd)}요일${i === 0 ? ' 오늘' : ''}, ${count ? `할 일 ${count}개` : '할 일 없음'}`,
		);
		if (i === 0) btn.classList.add('is-today');
		btn.append(
			el('span', { className: 'strip-wd', textContent: i === 0 ? '오늘' : weekday(ymd) }),
			el('span', { className: 'strip-num', textContent: String(+ymd.slice(8)) }),
			el('span', { className: count ? 'strip-dot' : 'strip-dot is-empty' }),
		);
		return btn;
	});
	strip.replaceChildren(...buttons);
}

function render() {
	const arrival = getArrival();
	document.querySelector<HTMLElement>('[data-schedule]')!.hidden = !arrival;
	document.querySelector<HTMLElement>('[data-schedule-empty]')!.hidden = Boolean(arrival);
	if (!arrival) return;

	// 체크칸·날짜 버튼을 다시 만들면 포커스가 사라지므로, 새로 만든 같은 요소로 옮긴다
	const active = document.activeElement as HTMLElement | null;
	const focusedId = active?.closest?.('[data-schedule]') ? active.dataset.taskId : undefined;
	const focusedDate = active?.matches?.('.strip-day') ? active.dataset.date : undefined;

	const today = todayYmd();
	const end = addDays(today, STRIP_DAYS - 1);
	const progress = getProgress();
	const done = new Set(Object.keys(progress).filter((id) => progress[id]));
	items = tasks.map((t) => planItem(t, arrival));
	const g = groupSchedule(items, today, done);

	// 2주 안의 안 끝낸 일은 날짜 띠로, 그 뒤는 다가오는 일로
	const inStrip = [...g.thisWeek, ...g.upcoming].filter((it) => it.date! <= end);
	const later = g.upcoming.filter((it) => it.date! > end);
	const byDate = new Map<string, PlanItem[]>();
	for (const it of inStrip) byDate.set(it.date!, [...(byDate.get(it.date!) ?? []), it]);
	if (!selected || selected < today || selected > end) selected = inStrip[0]?.date ?? today;

	renderStrip(today, byDate);

	const status = document.querySelector<HTMLElement>('[data-status]')!;
	status.className = g.overdue.length ? 'schedule-status is-overdue' : 'schedule-status is-ok';
	status.textContent = g.overdue.length
		? `지난 기한 ${g.overdue.length}개 — 아래 「지난 기한」에서 확인하세요`
		: '지난 기한 없음';

	const dayItems = byDate.get(selected) ?? [];
	document.querySelector('[data-day-title]')!.textContent =
		`${formatKo(selected, today)} (${weekday(selected)})${dayItems.length ? ` · ${dayItems.length}개` : ''}`;
	const left = daysBetween(today, selected);
	document.querySelector('[data-day-note]')!.textContent = dayItems.length
		? left === 0
			? '오늘까지 할 일이에요'
			: `${left}일 남았어요`
		: inStrip.length
			? '이날은 마감이 없어요. 점이 있는 날을 눌러 보세요.'
			: '앞으로 2주 안에 마감이 없어요. 아래 「다가오는 일」을 확인하세요.';
	document.querySelector('[data-day-list]')!.replaceChildren(...dayItems.map((it) => row(it, false, today, false)));

	const groups: Record<string, PlanItem[]> = { overdue: g.overdue, upcoming: later, undated: g.undated, done: g.done };
	document.querySelectorAll<HTMLDetailsElement>('[data-group]').forEach((el) => {
		const key = el.dataset.group!;
		const list = groups[key];
		el.hidden = list.length === 0;
		el.querySelector('[data-group-count]')!.textContent = String(list.length);
		el.querySelector('[data-group-list]')!.replaceChildren(
			...list.map((it) => row(it, done.has(it.id), today, key === 'overdue')),
		);
	});

	if (focusedDate) document.querySelector<HTMLElement>(`.strip-day[data-date="${focusedDate}"]`)?.focus();
	if (focusedId) {
		const input = document.querySelector<HTMLInputElement>(`[data-schedule] input[data-task-id="${focusedId}"]`);
		const group = input?.closest<HTMLDetailsElement>('details');
		if (group) group.open = true;
		input?.focus();
	}
}

export function initSchedule() {
	const data = document.getElementById('jsg-task-data');
	if (!data) return;
	tasks = JSON.parse(data.textContent ?? '[]') as TaskMeta[];
	render();
	onArrivalChange(render);
	// checklist.ts가 진행 상황을 바꾼 뒤 보내는 이벤트로 다시 묶는다 (다른 탭에서 바꾼 것도 포함)
	document.addEventListener(PROGRESS_EVENT, render);

	document.querySelector('[data-strip]')?.addEventListener('click', (e) => {
		const day = (e.target as HTMLElement).closest<HTMLElement>('.strip-day');
		if (!day) return;
		selected = day.dataset.date!;
		render();
	});

	document.querySelector('[data-ics-all]')?.addEventListener('click', () => {
		const progress = getProgress();
		const events = items
			.filter((it) => it.date && !progress[it.id])
			.map((it) => taskEvent(tasks.find((t) => t.id === it.id)!, it, location.origin));
		downloadIcs(events, 'japan-settle-guide.ics');
	});
}
