// 할 일 카드의 마감 칩([data-due-chip])과 시기 요약의 '입국 후 N일째'([data-arrival-days])를 입국일로 채운다.
// 입국일이 없으면 모두 숨긴다.
import { arrivalSummary, daysBetween, dLabel, formatKo, planItem, todayYmd, type Due } from '../lib/due.ts';
import { getArrival, onArrivalChange } from './arrival.ts';

function render() {
	const arrival = getArrival();
	const today = todayYmd();
	document.querySelectorAll<HTMLElement>('[data-arrival-days]').forEach((el) => {
		el.hidden = !arrival;
		if (arrival) el.textContent = arrivalSummary(arrival, today);
	});
	document.querySelectorAll<HTMLElement>('[data-due-chip]').forEach((chip) => {
		const item = arrival
			? planItem(
					{
						id: chip.dataset.dueChip!,
						phase: chip.dataset.phase!,
						due: chip.dataset.due ? (JSON.parse(chip.dataset.due) as Due) : undefined,
					},
					arrival,
				)
			: null;
		chip.hidden = !item?.date;
		if (!item?.date) return;
		const left = daysBetween(today, item.date);
		const date = formatKo(item.date, today);
		chip.textContent = item.kind === 'window' ? `권장 · ${date}` : `${dLabel(left)} · ${date}`;
		chip.classList.toggle('is-window', item.kind === 'window');
		chip.classList.toggle('is-overdue', item.kind !== 'window' && left < 0);
	});
}

let initialized = false;

export function initDueChips() {
	if (initialized) return;
	initialized = true;
	render();
	onArrivalChange(render);
}
