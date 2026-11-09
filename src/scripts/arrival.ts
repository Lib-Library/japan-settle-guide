// 입국일을 localStorage에 저장/복원하고 입국일 입력칸([data-arrival])을 그린다.
// 저장 형식: 'YYYY-MM-DD' 하나. 체크 진행 상황(jsg:progress:v1)과는 따로 둔다.
import { arrivalSummary, formatKo, parseLooseYmd, parseYmd, todayYmd, toDots } from '../lib/due.ts';

const STORAGE_KEY = 'jsg:arrival:v1';
const EVENT = 'jsg:arrival';
// 저장소를 쓸 수 없을 때 이번 방문 동안만 유지
let memory: string | null = null;

export function getArrival(): string | null {
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v !== null) return parseYmd(v);
	} catch {
		/* 시크릿 모드 등 */
	}
	return memory;
}

export function setArrival(value: string | null) {
	memory = value;
	try {
		if (value) localStorage.setItem(STORAGE_KEY, value);
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		/* 저장 실패는 무시 (이번 방문 동안만 유지) */
	}
	document.dispatchEvent(new CustomEvent(EVENT));
}

export function onArrivalChange(cb: () => void) {
	document.addEventListener(EVENT, cb);
	// 다른 탭에서 바꾼 입국일도 반영
	window.addEventListener('storage', (e) => {
		if (e.key === STORAGE_KEY) cb();
	});
}

function render() {
	const arrival = getArrival();
	const today = todayYmd();
	document.querySelectorAll<HTMLElement>('[data-arrival]').forEach((root) => {
		const editing = root.dataset.editing === 'true';
		root.querySelector<HTMLElement>('[data-arrival-form]')!.hidden = Boolean(arrival) && !editing;
		root.querySelector<HTMLElement>('[data-arrival-set]')!.hidden = !arrival || editing;
		root.querySelector<HTMLElement>('[data-arrival-clear]')!.hidden = !arrival;
		if (!arrival) return;
		root.querySelector('[data-arrival-summary]')!.textContent = `입국일 ${formatKo(arrival, today)} · ${arrivalSummary(arrival, today)}`;
		root.querySelector<HTMLInputElement>('[data-arrival-input]')!.value = toDots(arrival);
	});
}

/** 입력칸을 다시 입력 상태로 연다 (할 일 페이지의 "입국일 바꾸기" 등에서 쓴다) */
export function editArrival(root: HTMLElement) {
	root.dataset.editing = 'true';
	render();
	root.querySelector<HTMLInputElement>('[data-arrival-input]')!.focus();
}

let initialized = false;

export function initArrival() {
	if (initialized) return;
	initialized = true;
	render();
	onArrivalChange(render);
	// 페이지를 연 채 날짜가 바뀌었을 수 있으니, 탭으로 돌아오면 남은 일수를 다시 계산한다
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') document.dispatchEvent(new CustomEvent(EVENT));
	});

	document.addEventListener('submit', (e) => {
		const form = (e.target as HTMLElement).closest?.<HTMLFormElement>('[data-arrival-form]');
		if (!form) return;
		e.preventDefault();
		const value = parseLooseYmd(form.querySelector<HTMLInputElement>('[data-arrival-input]')!.value);
		form.querySelector<HTMLElement>('[data-arrival-error]')!.hidden = Boolean(value);
		if (!value) return;
		const root = form.closest<HTMLElement>('[data-arrival]')!;
		root.dataset.editing = 'false';
		setArrival(value);
		// 누른 버튼이 숨겨지므로 저장 결과 문구로 포커스를 옮긴다
		root.querySelector<HTMLElement>('[data-arrival-summary]')!.focus();
	});

	document.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		const edit = target.closest('[data-arrival-edit]');
		if (edit) editArrival(edit.closest<HTMLElement>('[data-arrival]')!);
		const clear = target.closest('[data-arrival-clear]');
		if (clear) {
			const root = clear.closest<HTMLElement>('[data-arrival]')!;
			root.dataset.editing = 'false';
			setArrival(null);
			const input = root.querySelector<HTMLInputElement>('[data-arrival-input]')!;
			input.value = '';
			input.focus();
		}
	});
}
