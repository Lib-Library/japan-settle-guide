// 홈: 입국일과 체크 상태로 오늘 카드·이번 주 할 일·지금 시기를 채운다. 마크업은 Home.astro가 미리 그려 둔다.
import {
	addDays,
	currentPhase,
	daysBetween,
	dLabel,
	formatKo,
	groupSchedule,
	PHASE_WINDOW_DAYS,
	planItem,
	todayYmd,
	type Due,
	type PlanItem,
} from '../lib/due.ts';
import { getArrival, onArrivalChange } from './arrival.ts';
import { BADGE } from './calendar.ts';
import { getProgress, PROGRESS_EVENT } from './checklist.ts';

interface TaskMeta {
	id: string;
	title: string;
	phase: string;
	deadline: string;
	due?: Due;
}

const WEEK_LIMIT = 3;
let tasks: TaskMeta[] = [];

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;

function render() {
	const arrival = getArrival();
	const today = todayYmd();
	const progress = getProgress();
	const done = new Set(Object.keys(progress).filter((id) => progress[id]));

	// 지금 시기: 입국일이 있으면 날짜로, 없으면 다 끝내지 않은 첫 시기
	const phaseEls = [...document.querySelectorAll<HTMLElement>('[data-home-phase]')];
	const phase = arrival
		? currentPhase(arrival, today)
		: (phaseEls.map((li) => li.dataset.homePhase!).find((p) => tasks.some((t) => t.phase === p && !done.has(t.id))) ??
			'pre-arrival');
	phaseEls.forEach((li) => {
		const here = li.dataset.homePhase === phase;
		li.classList.toggle('is-current', here);
		$('.home-here', li).hidden = !here;
		const days = PHASE_WINDOW_DAYS[li.dataset.homePhase!];
		$('[data-phase-when]', li).textContent =
			arrival && days ? `${formatKo(addDays(arrival, days), today)}까지 권장` : '';
	});

	$('[data-home-today]').classList.toggle('is-set', Boolean(arrival));
	document.querySelectorAll<HTMLElement>('[data-today-phase]').forEach((el) => {
		el.hidden = !arrival || el.dataset.todayPhase !== phase;
	});

	const week = $('[data-home-week]');
	const urgent = $('[data-home-urgent]');
	week.hidden = urgent.hidden = !arrival;
	if (!arrival) return;

	const items = tasks.map((t) => planItem(t, arrival));
	const g = groupSchedule(items, today, done);

	// 가장 급한 마감: 법정·예상 기한을 권장 시기보다 먼저 본다
	const dated = [...g.overdue, ...g.thisWeek, ...g.upcoming];
	const top: PlanItem | undefined = dated.find((it) => it.kind !== 'window') ?? dated[0];
	urgent.hidden = !top;
	if (top) {
		const t = tasks.find((x) => x.id === top.id)!;
		const left = daysBetween(today, top.date!);
		$('[data-urgent-d]').textContent = dLabel(left);
		urgent.classList.toggle('is-overdue', left < 0);
		Object.assign($<HTMLAnchorElement>('[data-urgent-link]'), { href: `/tasks/${t.id}/`, textContent: t.title });
		$('[data-urgent-date]').textContent = `${formatKo(top.date!, today)}까지`;
		const badge = $('[data-urgent-badge]');
		badge.hidden = !BADGE[top.kind];
		badge.textContent = BADGE[top.kind] ?? '';
		$('[data-urgent-basis]').textContent = top.kind === 'exact' ? '' : t.deadline;
	}

	// 이번 주(지난 기한 포함)가 비면 다음 할 일을 보여 준다
	const soon = [...g.overdue, ...g.thisWeek];
	$('[data-week-title]').textContent = soon.length ? '이번 주 할 일' : '다음 할 일';
	const shown = (soon.length ? soon : g.upcoming).slice(0, WEEK_LIMIT);
	const list = $('.home-week-list', week);
	list.querySelectorAll<HTMLElement>('[data-home-task]').forEach((li) => (li.hidden = true));
	week.hidden = shown.length === 0;
	for (const it of shown) {
		const li = $(`[data-home-task="${it.id}"]`, list);
		const left = daysBetween(today, it.date!);
		const chip = $('[data-chip]', li);
		chip.textContent = it.kind === 'window' ? '권장' : dLabel(left);
		chip.className = `home-chip ${it.kind === 'window' ? 'is-window' : left < 0 ? 'is-overdue' : ''}`;
		li.hidden = false;
		list.append(li); // 날짜순으로 맨 뒤에 다시 붙인다
	}
}

export function initHome() {
	const data = document.getElementById('jsg-home-data');
	if (!data) return;
	tasks = JSON.parse(data.textContent ?? '[]') as TaskMeta[];
	render();
	onArrivalChange(render);
	document.addEventListener(PROGRESS_EVENT, render);
}
