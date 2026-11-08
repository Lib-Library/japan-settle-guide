// 내 일정 페이지: 입국일로 할 일을 지난 기한 / 이번 주 / 다가오는 일 / 날짜 없는 일 / 완료로 묶어 그린다.
// 체크칸은 기존 체크리스트와 같은 data-task-id를 써서 진행 상황이 공유된다.
import { groupSchedule, planItem, todayYmd, type Due, type PlanItem } from '../lib/due.ts';
import { taskEvent } from '../lib/ics.ts';
import { getArrival, onArrivalChange } from './arrival.ts';
import { BADGE, downloadIcs, dueText } from './calendar.ts';
import { getProgress, PROGRESS_EVENT } from './checklist.ts';

interface TaskMeta {
	id: string;
	title: string;
	phase: string;
	deadline: string;
	optional: boolean;
	due?: Due;
}

let tasks: TaskMeta[] = [];
let items: PlanItem[] = [];

function row(item: PlanItem, done: boolean, today: string, overdue: boolean): HTMLLIElement {
	const t = tasks.find((x) => x.id === item.id)!;
	const li = document.createElement('li');
	li.className = done ? 'schedule-item is-done' : 'schedule-item';
	li.dataset.taskCard = t.id;

	const label = document.createElement('label');
	label.className = 'task-check-wrap';
	const input = Object.assign(document.createElement('input'), { type: 'checkbox', className: 'task-check', checked: done });
	input.dataset.taskId = t.id;
	input.setAttribute('aria-label', `${t.title} 완료 표시`);
	label.append(input);

	const body = document.createElement('div');
	const link = Object.assign(document.createElement('a'), { href: `/tasks/${t.id}/`, textContent: t.title });
	link.className = 'schedule-title';
	body.append(link);
	if (t.optional) body.append(Object.assign(document.createElement('span'), { className: 'task-tag', textContent: '선택' }));

	const when = document.createElement('p');
	when.className = overdue ? 'schedule-when is-overdue' : 'schedule-when';
	when.textContent = item.date ? dueText(item, today) : t.deadline;
	if (BADGE[item.kind]) {
		when.append(' ', Object.assign(document.createElement('span'), { className: 'due-badge', textContent: BADGE[item.kind] }));
	}
	body.append(when);
	// 예상·권장 날짜는 원래 기준 문장을 함께 보여 준다
	if (item.kind === 'estimate' || item.kind === 'window') {
		body.append(Object.assign(document.createElement('p'), { className: 'schedule-basis', textContent: `기준: ${t.deadline}` }));
	}

	li.append(label, body);
	return li;
}

function render() {
	const arrival = getArrival();
	document.querySelector<HTMLElement>('[data-schedule]')!.hidden = !arrival;
	document.querySelector<HTMLElement>('[data-schedule-empty]')!.hidden = Boolean(arrival);
	if (!arrival) return;

	// 체크칸을 다시 만들면 포커스가 사라지므로, 새로 만든 같은 체크칸으로 옮긴다
	const focusedId = (document.activeElement as HTMLElement | null)?.closest?.('[data-schedule]')
		? (document.activeElement as HTMLElement).dataset.taskId
		: undefined;
	const today = todayYmd();
	const progress = getProgress();
	const done = new Set(Object.keys(progress).filter((id) => progress[id]));
	items = tasks.map((t) => planItem(t, arrival));
	const groups = groupSchedule(items, today, done);

	document.querySelectorAll<HTMLDetailsElement>('[data-group]').forEach((el) => {
		const list = groups[el.dataset.group as keyof typeof groups];
		el.hidden = list.length === 0;
		el.querySelector('[data-group-count]')!.textContent = String(list.length);
		const overdue = el.dataset.group === 'overdue';
		el.querySelector('[data-group-list]')!.replaceChildren(...list.map((it) => row(it, done.has(it.id), today, overdue)));
	});

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

	document.querySelector('[data-ics-all]')?.addEventListener('click', () => {
		const progress = getProgress();
		const events = items
			.filter((it) => it.date && !progress[it.id])
			.map((it) => taskEvent(tasks.find((t) => t.id === it.id)!, it, location.origin));
		downloadIcs(events, 'japan-settle-guide.ics');
	});
}
