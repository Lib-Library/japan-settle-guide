// 브라우저에서 .ics 파일을 만들어 내려받게 한다 (서버 없음).
import { daysBetween, formatKo, relLabel, type PlanItem } from '../lib/due.ts';
import { buildIcs, type IcsEvent } from '../lib/ics.ts';

export function downloadIcs(events: IcsEvent[], filename: string) {
	const blob = new Blob([buildIcs(events, new Date())], { type: 'text/calendar;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = Object.assign(document.createElement('a'), { href: url, download: filename });
	document.body.append(a);
	a.click();
	a.remove();
	// iOS는 캘린더 가져오기 화면이 늦게 열리므로 넉넉히 기다린 뒤 해제한다
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** '12월 15일까지 · 6일 남음' */
export const dueText = (item: PlanItem, today: string) =>
	`${formatKo(item.date!, today)}까지 · ${relLabel(daysBetween(today, item.date!))}`;

export const BADGE: Record<string, string> = { estimate: '예상', window: '권장' };
