// 입국일 일정 계산 검사. 사용법: npm run check
import assert from 'node:assert/strict';
import {
	addDays,
	addMonths,
	arrivalSummary,
	currentPhase,
	daysBetween,
	dueDate,
	formatKo,
	groupSchedule,
	parseLooseYmd,
	parseYmd,
	planItem,
	relLabel,
	todayYmd,
} from '../src/lib/due.ts';
import { buildIcs, foldLine, taskEvent } from '../src/lib/ics.ts';
import { parseProgress } from '../src/scripts/checklist.ts';

// 실제로 있는 날짜만 받는다 (깨진 저장값 방어)
assert.equal(parseYmd('2026-12-01'), '2026-12-01');
assert.equal(parseYmd('2028-02-29'), '2028-02-29');
assert.equal(parseYmd('2026-02-29'), null);
assert.equal(parseYmd('2026-13-40'), null);
assert.equal(parseYmd(''), null);
assert.equal(parseYmd('{"a":1}'), null);
assert.equal(parseYmd(null), null);

// 오늘은 기기 달력 기준 (일본 0시 30분은 UTC로 전날이지만 일본 날짜여야 한다)
assert.equal(todayYmd(new Date(2026, 11, 1, 0, 30)), '2026-12-01');

// 날짜 더하기
assert.equal(addDays('2026-12-25', 14), '2027-01-08');
assert.equal(addMonths('2027-01-31', 1), '2027-02-28');
assert.equal(addMonths('2028-02-29', 12), '2029-02-28');
assert.equal(addMonths('2026-12-01', 12), '2027-12-01');
assert.equal(daysBetween('2026-12-01', '2026-12-15'), 14);
assert.equal(daysBetween('2027-03-01', '2027-04-01'), 31);

// 마감일
assert.equal(dueDate({ kind: 'estimate', days: 14 }, '2026-12-01'), '2026-12-15');
assert.equal(dueDate({ kind: 'estimate', months: 12 }, '2026-12-01'), '2027-12-01');
assert.equal(dueDate({ kind: 'yearly', yearOffset: 1, month: 3, day: 15 }, '2026-12-01'), '2027-03-15');

// 종류: due가 있으면 exact/estimate, 없으면 시기별 권장(window), 귀국은 날짜 없음
assert.deepEqual(planItem({ id: 'a', phase: 'arrival-2w', due: { kind: 'estimate', days: 14 } }, '2026-12-01'), {
	id: 'a',
	date: '2026-12-15',
	kind: 'estimate',
});
assert.deepEqual(planItem({ id: 'b', phase: 'pre-arrival', due: { kind: 'arrival', days: 0 } }, '2026-12-01'), {
	id: 'b',
	date: '2026-12-01',
	kind: 'exact',
});
assert.deepEqual(planItem({ id: 'c', phase: 'first-3m' }, '2026-12-01'), { id: 'c', date: '2027-03-01', kind: 'window' });
assert.deepEqual(planItem({ id: 'd', phase: 'leaving' }, '2026-12-01'), { id: 'd', date: null, kind: 'none' });
// 권장 시기가 오해를 부르는 항목(연말정산 등)은 날짜를 만들지 않는다
assert.deepEqual(planItem({ id: 'e', phase: 'first-1y', due: { kind: 'none' } }, '2026-11-08'), { id: 'e', date: null, kind: 'none' });

// 묶기: 지난 기한 / 이번 주(오늘 포함 7일: 12/9~12/15) / 그 뒤 / 날짜 없음 / 완료
const items = [
	{ id: 'past', date: '2026-11-30', kind: 'exact' },
	{ id: 'today', date: '2026-12-09', kind: 'estimate' },
	{ id: 'week', date: '2026-12-15', kind: 'window' },
	{ id: 'later', date: '2026-12-16', kind: 'window' },
	{ id: 'none', date: null, kind: 'none' },
	{ id: 'checked', date: '2026-11-01', kind: 'exact' },
];
const g = groupSchedule(items, '2026-12-09', new Set(['checked']));
assert.deepEqual(g.overdue.map((i) => i.id), ['past']);
assert.deepEqual(g.thisWeek.map((i) => i.id), ['today', 'week']);
assert.deepEqual(g.upcoming.map((i) => i.id), ['later']);
assert.deepEqual(g.undated.map((i) => i.id), ['none']);
assert.deepEqual(g.done.map((i) => i.id), ['checked']);

// 입국 전(미래 입국일) 사용자에게는 지난 기한이 없다
const future = groupSchedule(
	[planItem({ id: 'x', phase: 'arrival-2w', due: { kind: 'estimate', days: 14 } }, '2027-01-10')],
	'2026-12-09',
	new Set(),
);
assert.equal(future.overdue.length, 0);

// 표시 문구
assert.equal(relLabel(6), '6일 남음');
assert.equal(relLabel(0), '오늘까지');
assert.equal(relLabel(-8), '8일 지남');
assert.equal(formatKo('2026-12-15', '2026-12-01'), '12월 15일');
assert.equal(formatKo('2027-03-15', '2026-12-01'), '2027년 3월 15일');
assert.equal(arrivalSummary('2026-12-24', '2026-12-01'), '입국까지 23일');
assert.equal(arrivalSummary('2026-12-01', '2026-12-01'), '오늘 입국');
assert.equal(arrivalSummary('2026-12-01', '2026-12-09'), '입국 후 9일째');

// 캘린더 파일
const ev = taskEvent(
	{ id: 'tennyu-todoke', title: '전입신고 하기 (주소 등록)' },
	{ id: 'tennyu-todoke', date: '2026-12-15', kind: 'estimate' },
	'https://example.com',
);
assert.equal(ev.uid, 'tennyu-todoke@japan-settle-guide');
assert.equal(ev.url, 'https://example.com/tasks/tennyu-todoke/');
assert.equal(ev.title, '[일본 정착] 전입신고 하기 (주소 등록) 마감');
assert.ok(ev.description.startsWith('예상 날짜입니다'));
const ics = buildIcs([ev], new Date(Date.UTC(2026, 10, 8, 3, 0, 0)));
const unfolded = ics.replace(/\r\n /g, '');
assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
assert.ok(unfolded.includes('DTSTART;VALUE=DATE:20261215\r\n'));
assert.ok(unfolded.includes('DTEND;VALUE=DATE:20261216\r\n'));
assert.ok(unfolded.includes('DTSTAMP:20261108T030000Z\r\n'));
assert.ok(unfolded.includes('SUMMARY:[일본 정착] 전입신고 하기 (주소 등록) 마감\r\n'));
assert.ok(unfolded.includes('DESCRIPTION:예상 날짜입니다 (입국일로 어림). 자세한 내용: https://example.com/tasks/tennyu-todoke/\r\n'));
assert.ok(unfolded.includes('METHOD:PUBLISH\r\n'));
// 쉼표·세미콜론은 이스케이프
assert.ok(buildIcs([{ ...ev, title: 'a,b;c' }], new Date(0)).includes('SUMMARY:a\\,b\\;c'));
// 긴 줄은 75바이트 이하로 접히고, 펼치면 원래 줄
const long = foldLine('DESCRIPTION:' + '가'.repeat(60));
for (const line of long.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
assert.equal(long.replace(/\r\n /g, ''), 'DESCRIPTION:' + '가'.repeat(60));

// 깨진 진행 상황 저장값은 빈 값으로
assert.deepEqual(parseProgress('null'), {});
assert.deepEqual(parseProgress('[1,2]'), {});
assert.deepEqual(parseProgress('"x"'), {});
assert.deepEqual(parseProgress('{"tennyu-todoke":true}'), { 'tennyu-todoke': true });
assert.deepEqual(parseProgress(null), {});

// 손으로 친 날짜
assert.equal(parseLooseYmd('2026.11.2'), '2026-11-02');
assert.equal(parseLooseYmd('2026-11-02'), '2026-11-02');
assert.equal(parseLooseYmd('20261102'), '2026-11-02');
assert.equal(parseLooseYmd(' 2026/1/5. '), '2026-01-05');
assert.equal(parseLooseYmd('2026.2.30'), null);
assert.equal(parseLooseYmd('2026.11'), null);
assert.equal(parseLooseYmd(''), null);

// 지금 시기: 입국 전날은 입국 전, 입국일·13일 뒤는 2주 이내, 14일 뒤는 첫 3개월, 1년 넘으면 첫 1년
assert.equal(currentPhase('2026-12-01', '2026-11-30'), 'pre-arrival');
assert.equal(currentPhase('2026-12-01', '2026-12-01'), 'arrival-2w');
assert.equal(currentPhase('2026-12-01', '2026-12-14'), 'arrival-2w');
assert.equal(currentPhase('2026-12-01', '2026-12-15'), 'first-3m');
assert.equal(currentPhase('2026-12-01', '2028-01-01'), 'first-1y');

console.log('입국일 일정 계산 검사 통과');
