// 휴대폰 캘린더에 넣는 .ics 파일 내용을 만든다. DOM을 쓰지 않는다 (검사: scripts/check-due.mjs).
import { addDays, type PlanItem } from './due.ts';

export interface IcsEvent {
	uid: string;
	date: string;
	title: string;
	description: string;
	url: string;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const compact = (ymd: string) => ymd.replaceAll('-', '');

/** 75바이트(UTF-8)를 넘는 줄을 접는다 (RFC 5545 3.1). 글자 중간에서 자르지 않는다. */
export function foldLine(line: string): string {
	const enc = new TextEncoder();
	const out: string[] = [];
	let cur = '';
	let bytes = 0;
	for (const ch of line) {
		const b = enc.encode(ch).length;
		const limit = out.length === 0 ? 75 : 74; // 이어지는 줄은 앞에 공백 1바이트가 붙는다
		if (bytes + b > limit) {
			out.push(cur);
			cur = '';
			bytes = 0;
		}
		cur += ch;
		bytes += b;
	}
	out.push(cur);
	return out.join('\r\n ');
}

export function buildIcs(events: IcsEvent[], now: Date): string {
	const stamp = now.toISOString().replace(/\.\d{3}/, '').replace(/[-:]/g, '');
	const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//japan-settle-guide//ko', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
	for (const e of events) {
		lines.push(
			'BEGIN:VEVENT',
			`UID:${e.uid}`,
			`DTSTAMP:${stamp}`,
			`DTSTART;VALUE=DATE:${compact(e.date)}`,
			`DTEND;VALUE=DATE:${compact(addDays(e.date, 1))}`,
			`SUMMARY:${esc(e.title)}`,
			`DESCRIPTION:${esc(e.description)}`,
			`URL:${e.url}`,
			'END:VEVENT',
		);
	}
	lines.push('END:VCALENDAR');
	return lines.map(foldLine).join('\r\n') + '\r\n';
}

/**
 * 할 일 하나를 캘린더 일정으로. UID를 고정해 두지만, 다시 넣었을 때 기존 일정을 고칠지
 * 새로 만들지는 캘린더 앱마다 다르다.
 */
export function taskEvent(task: { id: string; title: string }, item: PlanItem, origin: string): IcsEvent {
	const note =
		item.kind === 'estimate'
			? '예상 날짜입니다 (입국일로 어림). '
			: item.kind === 'window'
				? '이 사이트가 권하는 시기입니다 (법정 기한 아님). '
				: '';
	const url = `${origin}/tasks/${task.id}/`;
	return {
		uid: `${task.id}@japan-settle-guide`,
		date: item.date!,
		title: `[일본 정착] ${task.title} 마감`,
		description: `${note}자세한 내용: ${url}`,
		url,
	};
}
