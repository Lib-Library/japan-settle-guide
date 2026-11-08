# 입국일 일정 · 할 일 개별 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 할 일 37개에 각자 페이지를 주고, 입국일 하나로 마감일·내 일정·캘린더 파일을 보여 준다.

**Architecture:** 날짜 계산과 .ics 생성은 DOM 없는 순수 함수(`src/lib/due.ts`, `src/lib/ics.ts`)로 만들고 Node 검사 스크립트로 검증한다. 화면은 기존처럼 Astro 컴포넌트 + `src/scripts/*.ts` 바닐라 스크립트이며, 입국일은 localStorage `jsg:arrival:v1`에 둔다. 할 일 페이지는 `src/pages/tasks/[id].astro`에서 `StarlightPage`로 만든다.

**Tech Stack:** Astro 7, Starlight 0.42, astro/zod v4, Node 24 (TS 타입 제거 실행), sharp(설치됨)

**Spec:** `docs/superpowers/specs/2026-11-08-arrival-schedule-ux-design.md` (전략: `.omc/specs/deep-interview-site-growth-ux.md`)

## Global Constraints

- 정적 사이트 유지. 서버·계정·이메일 없음. 새 npm 의존성 추가 금지.
- tasks 파일명 변경 금지. 할 일 페이지 URL = `/tasks/<파일명>/`.
- 기존 localStorage `jsg:progress:v1` 형식·키 변경 금지. 입국일은 `jsg:arrival:v1`, 값 `YYYY-MM-DD`.
- 공식 출처에 없는 숫자로 `due`를 만들지 않는다. 근사값은 `deadline` 문장의 숫자 그대로.
- `estimate` 항목은 항상 "예상" 배지 + 원래 `deadline` 문장을 함께 보인다.
- 모바일 우선: 터치 영역 44px 이상, 1열, 3열 이상 표 금지. 날짜는 "12월 15일" 형식.
- `.ts`끼리 import할 때 확장자 `.ts`를 붙인다 (Node 검사 스크립트가 직접 실행하므로).
- 이 폴더는 git 저장소가 아니다. 커밋 단계 대신 각 Task 끝에 `npm run build`·`npm run check`로 체크포인트를 둔다.

## 설계 대비 변경 (구현 전 사용자 확인 대상)

1. 37개 중 `deadline` 문장에 입국일로 바꿀 수 있는 숫자가 있는 항목은 **9개**뿐이다. 나머지를 모두 "날짜 없는 일"로 두면 내 일정이 거의 비므로, 날짜 근거가 없는 항목은 **시기별 권장 시기**(입국 전 → 입국일, 2주 이내 → +14일, 첫 3개월 → +90일, 첫 1년 → +365일, 귀국 → 날짜 없음)에 놓고 **"권장" 배지 + "이 사이트가 권하는 시기, 법정 기한 아님"** 문구를 붙인다.
2. 설계의 `before-arrival` 종류는 해당 항목이 없어 만들지 않는다 ("출국 전" 항목은 `estimate`, 0일).
3. 주민세(`jumin-zei`)는 "6월부터 공제 시작"이라 마감일이 아니므로 `yearly`로 넣지 않는다 (권장 시기 처리).

## Review Focus

1. 입국 전 사용자(미래 입국일) — "입국까지 N일", 지난 기한 0개 → Task 1 테스트
2. 월말·윤년 계산 (1/31 + 1개월, 2/29 + 12개월) → Task 1 테스트
3. localStorage에 깨진 값('2026-13-40', JSON 등) — 입국일 없음으로 처리, 오류 없음 → Task 1 `parseYmd` 테스트
4. "오늘"이 UTC가 아니라 기기 달력 기준 (일본 0시 30분) → Task 1 `todayYmd` 테스트
5. 저장소를 못 쓰는 환경 — 이번 방문 동안은 동작 → Task 4 수동 확인

---

### Task 1: 마감일 계산 (`due.ts`)

**Files:**
- Create: `src/lib/due.ts`
- Create: `scripts/check-due.mjs`
- Modify: `package.json` (`check` 스크립트)

**Interfaces:**
- Produces:
  - `type Due = { kind: 'arrival' | 'estimate'; days?: number; months?: number } | { kind: 'yearly'; yearOffset: number; month: number; day: number }`
  - `type PlanKind = 'exact' | 'estimate' | 'window' | 'none'`
  - `interface PlanTask { id: string; phase: string; due?: Due }`
  - `interface PlanItem { id: string; date: string | null; kind: PlanKind }`
  - `interface Schedule { overdue; thisWeek; upcoming; undated; done: PlanItem[] }`
  - `PHASE_WINDOW_DAYS`, `parseYmd(v: unknown): string | null`, `todayYmd(now?: Date): string`, `addDays(ymd, n): string`, `addMonths(ymd, n): string`, `daysBetween(from, to): number`, `dueDate(due, arrival): string`, `planItem(task, arrival): PlanItem`, `groupSchedule(items, today, done: ReadonlySet<string>): Schedule`, `formatKo(ymd, today): string`, `relLabel(left: number): string`, `arrivalSummary(arrival, today): string`

- [ ] **Step 1: 실패하는 검사 작성** — `scripts/check-due.mjs`

```js
// 입국일 일정 계산 검사. 사용법: npm run check
import assert from 'node:assert/strict';
import {
	addDays,
	addMonths,
	arrivalSummary,
	daysBetween,
	dueDate,
	formatKo,
	groupSchedule,
	parseYmd,
	planItem,
	relLabel,
	todayYmd,
} from '../src/lib/due.ts';

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

// 묶기: 지난 기한 / 7일 이내 / 그 뒤 / 날짜 없음 / 완료
const items = [
	{ id: 'past', date: '2026-11-30', kind: 'exact' },
	{ id: 'today', date: '2026-12-09', kind: 'estimate' },
	{ id: 'week', date: '2026-12-16', kind: 'window' },
	{ id: 'later', date: '2026-12-17', kind: 'window' },
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

console.log('입국일 일정 계산 검사 통과');
```

- [ ] **Step 2: 실패 확인**

Run: `node scripts/check-due.mjs`
Expected: FAIL — `Cannot find module ... src/lib/due.ts`

- [ ] **Step 3: 구현** — `src/lib/due.ts`

```ts
// 입국일 기준 마감일 계산. 브라우저 밖에서도 돌도록 DOM을 쓰지 않는다 (검사: scripts/check-due.mjs).
// 날짜는 모두 'YYYY-MM-DD' 문자열로 다루고, 계산은 UTC 자정 기준으로 해 시간대·서머타임 영향을 없앤다.

export type Due =
	| { kind: 'arrival' | 'estimate'; days?: number; months?: number }
	| { kind: 'yearly'; yearOffset: number; month: number; day: number };

export type PlanKind = 'exact' | 'estimate' | 'window' | 'none';

export interface PlanTask {
	id: string;
	phase: string;
	due?: Due;
}

export interface PlanItem {
	id: string;
	date: string | null;
	kind: PlanKind;
}

export interface Schedule {
	overdue: PlanItem[];
	thisWeek: PlanItem[];
	upcoming: PlanItem[];
	undated: PlanItem[];
	done: PlanItem[];
}

/** 날짜 근거가 없는 할 일을 놓는 이 사이트의 권장 시기 (입국일부터 며칠). 법정 기한이 아니다. */
export const PHASE_WINDOW_DAYS: Record<string, number | null> = {
	'pre-arrival': 0,
	'arrival-2w': 14,
	'first-3m': 90,
	'first-1y': 365,
	leaving: null,
};

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY = 86_400_000;

const toUtc = (ymd: string) => {
	const [, y, m, d] = YMD.exec(ymd)!;
	return Date.UTC(+y, +m - 1, +d);
};
const fromUtc = (t: number) => new Date(t).toISOString().slice(0, 10);

/** 실제로 있는 날짜면 그대로, 아니면 null ('2026-02-30', '', 'abc' → null) */
export function parseYmd(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const m = YMD.exec(value);
	if (!m) return null;
	return fromUtc(Date.UTC(+m[1], +m[2] - 1, +m[3])) === value ? value : null;
}

/** 기기 시간대의 오늘 (UTC가 아니라 사용자가 보는 달력 기준) */
export function todayYmd(now = new Date()): string {
	const p = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export const addDays = (ymd: string, n: number) => fromUtc(toUtc(ymd) + n * DAY);

/** 달 더하기. 없는 날은 그달 마지막 날로 (1/31 + 1개월 → 2/28) */
export function addMonths(ymd: string, n: number): string {
	const [, y, m, d] = YMD.exec(ymd)!;
	const first = new Date(Date.UTC(+y, +m - 1 + n, 1));
	const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
	return fromUtc(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(+d, lastDay)));
}

/** to - from (일) */
export const daysBetween = (from: string, to: string) => Math.round((toUtc(to) - toUtc(from)) / DAY);

export function dueDate(due: Due, arrival: string): string {
	if (due.kind === 'yearly') {
		return fromUtc(Date.UTC(+arrival.slice(0, 4) + due.yearOffset, due.month - 1, due.day));
	}
	return addDays(addMonths(arrival, due.months ?? 0), due.days ?? 0);
}

export function planItem(task: PlanTask, arrival: string): PlanItem {
	if (task.due) {
		return { id: task.id, date: dueDate(task.due, arrival), kind: task.due.kind === 'estimate' ? 'estimate' : 'exact' };
	}
	const days = PHASE_WINDOW_DAYS[task.phase];
	if (days == null) return { id: task.id, date: null, kind: 'none' };
	return { id: task.id, date: addDays(arrival, days), kind: 'window' };
}

/** 이번 주 = 오늘부터 7일 이내 (오늘 포함). 각 묶음은 날짜순. */
export function groupSchedule(items: PlanItem[], today: string, done: ReadonlySet<string>): Schedule {
	const s: Schedule = { overdue: [], thisWeek: [], upcoming: [], undated: [], done: [] };
	const sorted = [...items].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
	for (const it of sorted) {
		if (done.has(it.id)) s.done.push(it);
		else if (!it.date) s.undated.push(it);
		else {
			const left = daysBetween(today, it.date);
			if (left < 0) s.overdue.push(it);
			else if (left <= 7) s.thisWeek.push(it);
			else s.upcoming.push(it);
		}
	}
	return s;
}

/** '12월 15일', 올해가 아니면 '2027년 3월 15일' */
export function formatKo(ymd: string, today: string): string {
	const md = `${+ymd.slice(5, 7)}월 ${+ymd.slice(8, 10)}일`;
	return ymd.slice(0, 4) === today.slice(0, 4) ? md : `${ymd.slice(0, 4)}년 ${md}`;
}

export function relLabel(left: number): string {
	if (left === 0) return '오늘까지';
	return left > 0 ? `${left}일 남음` : `${-left}일 지남`;
}

/** '입국까지 23일' / '오늘 입국' / '입국 후 9일째' (입국일이 1일째) */
export function arrivalSummary(arrival: string, today: string): string {
	const d = daysBetween(arrival, today);
	if (d < 0) return `입국까지 ${-d}일`;
	if (d === 0) return '오늘 입국';
	return `입국 후 ${d + 1}일째`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node scripts/check-due.mjs`
Expected: `입국일 일정 계산 검사 통과`

- [ ] **Step 5: `npm run check`에 연결** — `package.json`

```json
"check": "node scripts/check-content.mjs && node scripts/check-initial-cost.mjs && node scripts/check-due.mjs"
```

Run: `npm run check` → 마지막 줄 `입국일 일정 계산 검사 통과`

---

### Task 2: 캘린더 파일 (`ics.ts`)

**Files:**
- Create: `src/lib/ics.ts`
- Modify: `scripts/check-due.mjs` (끝에 검사 추가)

**Interfaces:**
- Consumes: `addDays`, `PlanItem` (Task 1)
- Produces: `interface IcsEvent { uid; date; title; description; url: string }`, `foldLine(line: string): string`, `buildIcs(events: IcsEvent[], now: Date): string`, `taskEvent(task: { id: string; title: string }, item: PlanItem, origin: string): IcsEvent`

- [ ] **Step 1: 실패하는 검사 추가** — `scripts/check-due.mjs`의 `console.log` 바로 위에 넣고, 맨 위 import에 한 줄 추가

```js
import { buildIcs, foldLine, taskEvent } from '../src/lib/ics.ts';
```

```js
// 캘린더 파일
const ev = taskEvent(
	{ id: 'tennyu-todoke', title: '전입신고 하기 (주소 등록)' },
	{ id: 'tennyu-todoke', date: '2026-12-15', kind: 'estimate' },
	'https://example.com',
);
assert.equal(ev.uid, 'tennyu-todoke@japan-settle-guide');
assert.equal(ev.url, 'https://example.com/tasks/tennyu-todoke/');
assert.ok(ev.title.endsWith('(예상 날짜)'));
const ics = buildIcs([ev], new Date(Date.UTC(2026, 10, 8, 3, 0, 0)));
const unfolded = ics.replace(/\r\n /g, '');
assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
assert.ok(unfolded.includes('DTSTART;VALUE=DATE:20261215\r\n'));
assert.ok(unfolded.includes('DTEND;VALUE=DATE:20261216\r\n'));
assert.ok(unfolded.includes('DTSTAMP:20261108T030000Z\r\n'));
assert.ok(unfolded.includes('SUMMARY:[일본 정착] 전입신고 하기 (주소 등록) (예상 날짜)\r\n'));
// 쉼표·세미콜론은 이스케이프
assert.ok(buildIcs([{ ...ev, title: 'a,b;c' }], new Date(0)).includes('SUMMARY:a\\,b\\;c'));
// 긴 줄은 75바이트 이하로 접히고, 펼치면 원래 줄
const long = foldLine('DESCRIPTION:' + '가'.repeat(60));
for (const line of long.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
assert.equal(long.replace(/\r\n /g, ''), 'DESCRIPTION:' + '가'.repeat(60));
```

- [ ] **Step 2: 실패 확인**

Run: `node scripts/check-due.mjs`
Expected: FAIL — `Cannot find module ... src/lib/ics.ts`

- [ ] **Step 3: 구현** — `src/lib/ics.ts`

```ts
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
	const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//japan-settle-guide//ko', 'CALSCALE:GREGORIAN'];
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

/** 할 일 하나를 캘린더 일정으로. UID가 고정이라 다시 넣어도 같은 일정으로 바뀐다. */
export function taskEvent(task: { id: string; title: string }, item: PlanItem, origin: string): IcsEvent {
	const note = item.kind === 'estimate' ? ' (예상 날짜)' : item.kind === 'window' ? ' (권장 시기)' : '';
	const url = `${origin}/tasks/${task.id}/`;
	return {
		uid: `${task.id}@japan-settle-guide`,
		date: item.date!,
		title: `[일본 정착] ${task.title}${note}`,
		description: `자세한 내용: ${url}`,
		url,
	};
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm run check`
Expected: `입국일 일정 계산 검사 통과`

---

### Task 3: 기한 데이터 (`due` 필드)

**Files:**
- Modify: `src/content.config.ts` (tasks 스키마)
- Modify: tasks 9개 (아래 표)

**Interfaces:**
- Consumes: `Due` 모양 (Task 1)과 같은 스키마
- Produces: `task.data.due?: Due`

- [ ] **Step 1: 스키마 추가** — `src/content.config.ts`, `const source = ...` 아래

```ts
// 입국일로 마감일을 계산하기 위한 값. 공식 출처의 기한 문장(deadline)에 있는 숫자만 쓴다.
const due = z.union([
	z.object({
		kind: z.enum(['arrival', 'estimate']),
		days: z.number().int().optional(),
		months: z.number().int().optional(),
	}),
	z.object({
		kind: z.literal('yearly'),
		yearOffset: z.number().int().min(0),
		month: z.number().int().min(1).max(12),
		day: z.number().int().min(1).max(31),
	}),
]);
```

그리고 tasks 스키마의 `deadline: z.string(),` 다음 줄에:

```ts
			due: due.optional(),
```

- [ ] **Step 2: 잘못된 값이 빌드에서 걸리는지 확인** — `src/content/tasks/tennyu-todoke.md`의 `deadline:` 다음 줄에 임시로 `due: { kind: soon, days: 14 }`를 넣는다.

Run: `npm run build`
Expected: FAIL — `tennyu-todoke` 의 `due` 오류. 확인 후 다음 단계 값으로 바꾼다.

- [ ] **Step 3: 9개 항목에 `due` 추가** — 각 파일 `deadline:` 바로 다음 줄

| 파일 | 추가할 줄 | 근거(deadline 문장) |
|---|---|---|
| `zairyu-card-kuko.md` | `due: { kind: arrival, days: 0 }` | 입국 심사 때 |
| `bessouhin-shinkoku.md` | `due: { kind: arrival, days: 0 }` | 입국할 때 |
| `tennyu-todoke.md` | `due: { kind: estimate, days: 14 }` | 살 곳을 정한 날부터 14일 이내 |
| `menkyo-kirikae.md` | `due: { kind: estimate, months: 12 }` | 일본 상륙일부터 1년 (기간 계산 규칙 미확인이라 예상) |
| `kakutei-shinkoku.md` | `due: { kind: yearly, yearOffset: 1, month: 3, day: 15 }` | 다음 해 2월 16일~3월 15일 (마지막 날) |
| `byeongyeok-gugoe-yeohaeng.md` | `due: { kind: estimate, days: 0 }` | 출국 전 |
| `kr-haeoe-chaeryu-singo.md` | `due: { kind: estimate, days: 0 }` | 출국 전 |
| `kr-geojuja-panjeong.md` | `due: { kind: estimate, days: 0 }` | 출국 전 |
| `kr-gukmin-yeongeum.md` | `due: { kind: estimate, days: 0 }` | 출국 전 |

나머지 28개는 `due`를 넣지 않는다 (시기별 권장 시기 처리).

- [ ] **Step 4: 체크포인트**

Run: `npm run build` → `Complete!`
Run: `npm run check` → 3개 검사 모두 통과

---

### Task 4: 입국일 저장 + 입력칸 (홈)

**Files:**
- Create: `src/scripts/arrival.ts`
- Create: `src/components/ArrivalInput.astro`
- Modify: `src/content/docs/index.mdx` (PhasePicker 위에 배치)
- Modify: `src/styles/custom.css` (끝에 추가)

**Interfaces:**
- Consumes: `parseYmd`, `todayYmd`, `formatKo`, `arrivalSummary` (Task 1)
- Produces: `getArrival(): string | null`, `setArrival(v: string | null): void`, `onArrivalChange(cb: () => void): void`, `initArrival(): void`. 컴포넌트 `<ArrivalInput id="..." />` (페이지 안에서 id는 서로 달라야 함)

- [ ] **Step 1: 저장 스크립트** — `src/scripts/arrival.ts`

```ts
// 입국일을 localStorage에 저장/복원하고 입국일 입력칸([data-arrival])을 그린다.
// 저장 형식: 'YYYY-MM-DD' 하나. 체크 진행 상황(jsg:progress:v1)과는 따로 둔다.
import { arrivalSummary, formatKo, parseYmd, todayYmd } from '../lib/due.ts';

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
		root.querySelector<HTMLInputElement>('input[type="date"]')!.value = arrival;
	});
}

let initialized = false;

export function initArrival() {
	if (initialized) return;
	initialized = true;
	render();
	onArrivalChange(render);

	document.addEventListener('submit', (e) => {
		const form = (e.target as HTMLElement).closest?.<HTMLFormElement>('[data-arrival-form]');
		if (!form) return;
		e.preventDefault();
		const value = parseYmd(form.querySelector<HTMLInputElement>('input[type="date"]')!.value);
		form.querySelector<HTMLElement>('[data-arrival-error]')!.hidden = Boolean(value);
		if (!value) return;
		form.closest<HTMLElement>('[data-arrival]')!.dataset.editing = 'false';
		setArrival(value);
	});

	document.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		const edit = target.closest('[data-arrival-edit]');
		if (edit) {
			const root = edit.closest<HTMLElement>('[data-arrival]')!;
			root.dataset.editing = 'true';
			render();
			root.querySelector<HTMLInputElement>('input[type="date"]')!.focus();
		}
		const clear = target.closest('[data-arrival-clear]');
		if (clear) {
			clear.closest<HTMLElement>('[data-arrival]')!.dataset.editing = 'false';
			setArrival(null);
		}
	});
}
```

- [ ] **Step 2: 입력칸 컴포넌트** — `src/components/ArrivalInput.astro`

```astro
---
// 입국일 입력칸. 홈·할 일 페이지·내 일정에서 함께 쓴다. 한 곳에서 넣으면 모든 페이지에 반영된다.
interface Props {
	/** 한 페이지에 여러 개 둘 때 서로 달라야 한다 */
	id: string;
}
const { id } = Astro.props;
---

<div class="arrival not-content" data-arrival>
	<form class="arrival-form" data-arrival-form novalidate>
		<label class="arrival-label" for={id}>내 입국일 (예정일도 괜찮아요)</label>
		<div class="arrival-row">
			<input class="arrival-input" type="date" id={id} name="arrival" />
			<button type="submit" class="arrival-submit">마감일 보기</button>
		</div>
		<p class="arrival-error" data-arrival-error role="alert" hidden>입국일을 골라 주세요.</p>
		<p class="arrival-hint">입력한 날짜는 이 브라우저에만 저장돼요.</p>
		<button type="button" class="arrival-link" data-arrival-clear hidden>입국일 지우기</button>
	</form>
	<div class="arrival-set" data-arrival-set hidden>
		<p class="arrival-summary" data-arrival-summary></p>
		<div class="arrival-actions">
			<a class="arrival-cta" href="/my/">내 일정 보기 →</a>
			<button type="button" class="arrival-link" data-arrival-edit>바꾸기</button>
		</div>
	</div>
</div>

<script>
	import { initArrival } from '../scripts/arrival';
	initArrival();
</script>
```

- [ ] **Step 3: 홈에 배치** — `src/content/docs/index.mdx`

import 줄 아래에 추가:

```mdx
import ArrivalInput from '../../components/ArrivalInput.astro';
```

`<PhasePicker />` 바로 위 줄에:

```mdx
<ArrivalInput id="arrival-home" />
```

- [ ] **Step 4: 스타일** — `src/styles/custom.css` 끝에 추가

```css
/* 입국일 입력칸 */
.arrival {
	margin-block: 1.5rem;
	padding: 1rem;
	border: 1px solid var(--sl-color-hairline);
	border-radius: var(--radius);
	background: var(--sl-color-gray-7, var(--sl-color-gray-6));
}
.arrival-label {
	display: block;
	font-weight: 700;
	margin-bottom: 0.5rem;
}
.arrival-row,
.arrival-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	align-items: center;
}
.arrival-input {
	flex: 1 1 10rem;
	min-height: 44px;
	padding: 0 0.75rem;
	font: inherit;
	border: 1px solid var(--sl-color-gray-4);
	border-radius: var(--radius);
	background: var(--sl-color-black);
	color: var(--sl-color-white);
}
.arrival-submit,
.arrival-cta {
	min-height: 44px;
	padding: 0 1rem;
	display: inline-flex;
	align-items: center;
	font: inherit;
	font-weight: 700;
	border: 0;
	border-radius: var(--radius);
	background: var(--sl-color-accent);
	color: var(--c-on-accent);
	text-decoration: none;
	cursor: pointer;
}
.arrival-link {
	min-height: 44px;
	padding: 0 0.5rem;
	font: inherit;
	border: 0;
	background: none;
	color: var(--sl-color-text-accent);
	text-decoration: underline;
	cursor: pointer;
}
.arrival-error {
	margin: 0.5rem 0 0;
	color: var(--c-mark-fg);
	font-weight: 700;
}
.arrival-hint {
	margin: 0.5rem 0 0;
	font-size: var(--sl-text-sm);
	color: var(--sl-color-gray-3);
}
.arrival-summary {
	margin: 0 0 0.5rem;
	font-weight: 700;
}
```

- [ ] **Step 5: 확인** — `npm run build` 통과 후 `npx astro dev --background`, http://localhost:4321/ 을 375px 너비로 열어:
  1. 빈 채로 [마감일 보기] → "입국일을 골라 주세요." 표시
  2. 날짜 선택 후 [마감일 보기] → "입국일 ○월 ○일 · 입국까지 N일"(미래) 또는 "입국 후 N일째"(과거)
  3. 새로고침 → 그대로 유지
  4. [바꾸기] → 입력 상태, [입국일 지우기] → 입력 전 상태
  5. (Review Focus 5) 개발자 도구 콘솔에서 `localStorage.setItem = () => { throw new Error('blocked') }` 실행 후 날짜 입력 → 요약이 뜨고 오류 없음. 새로고침하면 사라짐(정상).

---

### Task 5: 할 일 개별 페이지 + 내 마감일 상자

**Files:**
- Create: `src/pages/tasks/[id].astro`
- Create: `src/components/MyDue.astro`
- Create: `src/scripts/calendar.ts`
- Modify: `src/components/TaskCard.astro` (props `open`, `standalone`, 페이지 링크)
- Modify: `src/styles/custom.css` (끝에 추가)

**Interfaces:**
- Consumes: `planItem`, `daysBetween`, `formatKo`, `relLabel`, `todayYmd`, `Due` (Task 1), `taskEvent`, `buildIcs` (Task 2), `getArrival`, `onArrivalChange`, `initArrival` (Task 4), `initChecklist` (`src/scripts/checklist.ts`)
- Produces: `downloadIcs(events: IcsEvent[], filename: string): void`, `dueText(item: PlanItem, today: string): string`, URL `/tasks/<id>/`

- [ ] **Step 1: 캘린더 내려받기 + 공용 문구** — `src/scripts/calendar.ts`

```ts
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
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** '12월 15일까지 · 6일 남음' */
export const dueText = (item: PlanItem, today: string) =>
	`${formatKo(item.date!, today)}까지 · ${relLabel(daysBetween(today, item.date!))}`;

export const BADGE: Record<string, string> = { estimate: '예상', window: '권장' };
```

- [ ] **Step 2: TaskCard 수정** — `src/components/TaskCard.astro`

Props를 다음으로 바꾼다:

```ts
interface Props {
	task: CollectionEntry<'tasks'>;
	showPhase?: boolean;
	/** 처음부터 펼쳐 보여 줄지 (할 일 개별 페이지) */
	open?: boolean;
	/** 할 일 개별 페이지 안이면 true — 자기 페이지 링크를 숨긴다 */
	standalone?: boolean;
}
const { task, showPhase = false, open = false, standalone = false } = Astro.props;
```

`<details class="task-details">` → `<details class="task-details" open={open}>`

`<Sources sources={data.sources} lastVerified={data.lastVerified} />` 다음 줄에:

```astro
		{!standalone && <a class="task-permalink" href={`/tasks/${task.id}/`}>이 할 일 페이지로 가기 →</a>}
```

- [ ] **Step 3: 내 마감일 상자** — `src/components/MyDue.astro`

```astro
---
// 할 일 개별 페이지의 "내 마감일" 상자. 입국일이 없으면 입력칸을 보여 준다.
// 귀국 시기 항목처럼 날짜를 만들 수 없으면 상자를 그리지 않는다.
import type { CollectionEntry } from 'astro:content';
import ArrivalInput from './ArrivalInput.astro';
import { PHASE_WINDOW_DAYS } from '../lib/due';

interface Props {
	task: CollectionEntry<'tasks'>;
}
const { task } = Astro.props;
const { phase, due, deadline, title } = task.data;
const datable = Boolean(due) || PHASE_WINDOW_DAYS[phase] != null;
---

{
	datable && (
		<section
			class="my-due not-content"
			data-my-due
			data-id={task.id}
			data-title={title}
			data-phase={phase}
			data-due={due ? JSON.stringify(due) : ''}
			data-deadline={deadline}
			aria-labelledby="my-due-title"
		>
			<h2 id="my-due-title" class="my-due-title">내 마감일</h2>
			<div data-my-due-result hidden>
				<p class="my-due-date">
					<strong data-my-due-text />
					<span class="due-badge" data-my-due-badge hidden />
				</p>
				<p class="my-due-basis" data-my-due-basis />
				<div class="arrival-actions">
					<button type="button" class="arrival-submit" data-ics-one>캘린더에 넣기</button>
					<a class="arrival-link" href="/my/">내 일정 전체 보기</a>
				</div>
			</div>
			<div data-my-due-empty>
				<ArrivalInput id="arrival-task" />
			</div>
		</section>
	)
}

<script>
	import { planItem, todayYmd, type Due, type PlanItem } from '../lib/due';
	import { taskEvent } from '../lib/ics';
	import { getArrival, onArrivalChange } from '../scripts/arrival';
	import { BADGE, downloadIcs, dueText } from '../scripts/calendar';

	const box = document.querySelector<HTMLElement>('[data-my-due]');
	let current: PlanItem | null = null;

	function render() {
		if (!box) return;
		const arrival = getArrival();
		const result = box.querySelector<HTMLElement>('[data-my-due-result]')!;
		box.querySelector<HTMLElement>('[data-my-due-empty]')!.hidden = Boolean(arrival);
		result.hidden = !arrival;
		if (!arrival) return;
		const { id, phase, due, deadline } = box.dataset;
		current = planItem({ id: id!, phase: phase!, due: due ? (JSON.parse(due) as Due) : undefined }, arrival);
		const today = todayYmd();
		box.querySelector('[data-my-due-text]')!.textContent = dueText(current, today);
		const badge = box.querySelector<HTMLElement>('[data-my-due-badge]')!;
		badge.hidden = !BADGE[current.kind];
		badge.textContent = BADGE[current.kind] ?? '';
		const basis =
			current.kind === 'estimate'
				? `입국일로 어림한 날짜예요. 실제 기준: ${deadline}`
				: current.kind === 'window'
					? `이 사이트가 권하는 시기예요 (법정 기한 아님). 기준: ${deadline}`
					: `기준: ${deadline}`;
		box.querySelector('[data-my-due-basis]')!.textContent = basis;
	}

	render();
	onArrivalChange(render);
	box?.querySelector('[data-ics-one]')?.addEventListener('click', () => {
		if (!current) return;
		downloadIcs([taskEvent({ id: box.dataset.id!, title: box.dataset.title! }, current, location.origin)], `${box.dataset.id}.ics`);
	});
</script>
```

- [ ] **Step 4: 할 일 페이지 라우트** — `src/pages/tasks/[id].astro`

```astro
---
// 할 일 하나의 개별 페이지 (검색으로 들어오는 곳). URL은 tasks 파일명 그대로.
import StarlightPage from '@astrojs/starlight/components/StarlightPage.astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import TaskCard from '../../components/TaskCard.astro';
import MyDue from '../../components/MyDue.astro';
import { phaseOf } from '../../lib/taxonomy';

type Task = CollectionEntry<'tasks'>;

export async function getStaticPaths() {
	const tasks = (await getCollection('tasks')).sort(
		(a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title, 'ko'),
	);
	return tasks.map((task) => {
		const siblings = tasks.filter((t) => t.data.phase === task.data.phase);
		const i = siblings.indexOf(task);
		return { params: { id: task.id }, props: { task, prev: siblings[i - 1], next: siblings[i + 1] } };
	});
}

interface Props {
	task: Task;
	prev?: Task;
	next?: Task;
}
const { task, prev, next } = Astro.props;
const { data } = task;
const phase = phaseOf(data.phase)!;
const term = data.term ? ` ${data.term.ja}(${data.term.reading})` : '';
const pager = (t?: Task) => (t ? { link: `/tasks/${t.id}/`, label: t.data.title } : false);
---

<StarlightPage
	frontmatter={{
		title: data.title,
		description: `${data.title}${term} — 어디서 하는지, 언제까지인지, 준비물과 놓치기 쉬운 점을 공식 출처와 함께 정리했습니다.`,
		lastVerified: data.lastVerified,
		prev: pager(prev),
		next: pager(next),
	}}
>
	<p class="task-breadcrumb"><a href={phase.href}>{phase.label}</a> 할 일</p>
	<MyDue task={task} />
	<div class="task-list not-content">
		<TaskCard task={task} open standalone />
	</div>
	<p><a href={phase.href}>{phase.label} 할 일 전체 보기</a> · <a href="/my/">내 일정 보기</a></p>
</StarlightPage>

<script>
	import { initChecklist } from '../../scripts/checklist';
	initChecklist();
</script>
```

`needsExpert`는 frontmatter에 넣지 않는다 (TaskCard가 이미 ExpertNote를 그려서, 넣으면 두 번 나온다).

- [ ] **Step 5: 스타일** — `src/styles/custom.css` 끝에 추가

```css
/* 할 일 개별 페이지 */
.task-breadcrumb {
	font-size: var(--sl-text-sm);
	color: var(--sl-color-gray-3);
}
.task-permalink {
	display: inline-flex;
	align-items: center;
	min-height: 44px;
	font-weight: 700;
}
.my-due {
	margin-block: 1rem 1.5rem;
	padding: 1rem;
	border: 2px solid var(--sl-color-accent);
	border-radius: var(--radius);
}
.my-due .arrival {
	margin: 0;
	padding: 0;
	border: 0;
	background: none;
}
.my-due-title {
	margin: 0 0 0.5rem;
	font-size: var(--sl-text-lg);
}
.my-due-date {
	margin: 0;
	font-size: var(--sl-text-lg);
}
.my-due-basis {
	margin: 0.25rem 0 0.75rem;
	font-size: var(--sl-text-sm);
	color: var(--sl-color-gray-3);
}
.due-badge {
	display: inline-block;
	margin-left: 0.25rem;
	padding: 0 0.5rem;
	border-radius: 999px;
	font-size: var(--sl-text-xs);
	font-weight: 700;
	vertical-align: middle;
	background: var(--c-mark-bg);
	color: var(--c-mark-fg);
}
```

- [ ] **Step 6: 체크포인트**

Run: `npm run build` → `Complete!`, 페이지 수 19 → 56
Run (Bash): `ls dist/tasks | wc -l` → `37`
Run (Bash): `grep -c '/tasks/' dist/sitemap-0.xml` → `37` 이상
Run: `npm run check` → 통과

- [ ] **Step 7: 화면 확인** (dev 서버, 375px)
  1. `/tasks/tennyu-todoke/`: 제목 아래 "마지막 확인일" 표시, 카드가 펼쳐진 상태, "이 할 일 페이지로 가기" 링크 없음, 아래쪽 이전/다음이 같은 시기 항목
  2. 입국일 없음 → 상자 안에 입력칸. 입력 → "○월 ○일까지 · N일 남음 [예상]" + "입국일로 어림한 날짜예요. 실제 기준: 살 곳을 정한 날부터 14일 이내"
  3. `/tasks/gomi-bunbetsu/`(due 없음, arrival-2w) → [권장] 배지 + "법정 기한 아님" 문구
  4. `/tasks/dattai-ichijikin/`(leaving) → 내 마감일 상자 없음
  5. [캘린더에 넣기] → `tennyu-todoke.ics` 내려받기, 파일을 열어 날짜가 화면과 같은지 확인
  6. 시기 페이지 `/timeline/arrival-2w/` 카드를 펼치면 "이 할 일 페이지로 가기 →" 링크가 있음
  7. 체크칸을 누르고 시기 페이지로 가면 같은 항목이 체크된 상태

---

### Task 6: 내 일정 페이지 (`/my/`)

**Files:**
- Create: `src/content/docs/my.mdx`
- Create: `src/components/MySchedule.astro`
- Create: `src/scripts/schedule.ts`
- Modify: `src/scripts/checklist.ts` (`load` 내보내기)
- Modify: `astro.config.mjs` (사이드바)
- Modify: `src/styles/custom.css` (끝에 추가)

**Interfaces:**
- Consumes: `planItem`, `groupSchedule`, `daysBetween`, `todayYmd`, `Due` (Task 1), `taskEvent` (Task 2), `getArrival`, `onArrivalChange` (Task 4), `downloadIcs`, `dueText`, `BADGE` (Task 5), `initChecklist`
- Produces: `loadProgress(): Record<string, boolean>` (checklist.ts), `initSchedule(): void`

- [ ] **Step 1: checklist.ts에서 진행 상황 읽기 내보내기** — `function load(): Progress {` → `export function loadProgress(): Progress {`, 파일 안의 `load()` 호출 두 곳(`initChecklist` 안, `storage` 이벤트 안)을 `loadProgress()`로 바꾼다.

- [ ] **Step 2: 일정 그리기** — `src/scripts/schedule.ts`

```ts
// 내 일정 페이지: 입국일로 할 일을 지난 기한 / 이번 주 / 다가오는 일 / 날짜 없는 일 / 완료로 묶어 그린다.
// 체크칸은 기존 체크리스트와 같은 data-task-id를 써서 진행 상황이 공유된다.
import { groupSchedule, planItem, todayYmd, type Due, type PlanItem } from '../lib/due.ts';
import { taskEvent } from '../lib/ics.ts';
import { getArrival, onArrivalChange } from './arrival.ts';
import { BADGE, downloadIcs, dueText } from './calendar.ts';
import { loadProgress } from './checklist.ts';

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

function row(item: PlanItem, done: boolean, today: string): HTMLLIElement {
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
	when.className = 'schedule-when';
	when.textContent = item.date ? dueText(item, today) : t.deadline;
	if (BADGE[item.kind]) {
		when.append(' ', Object.assign(document.createElement('span'), { className: 'due-badge', textContent: BADGE[item.kind] }));
	}
	body.append(when);

	li.append(label, body);
	return li;
}

function render() {
	const arrival = getArrival();
	document.querySelector<HTMLElement>('[data-schedule]')!.hidden = !arrival;
	document.querySelector<HTMLElement>('[data-schedule-empty]')!.hidden = Boolean(arrival);
	if (!arrival) return;

	const today = todayYmd();
	const progress = loadProgress();
	const done = new Set(Object.keys(progress).filter((id) => progress[id]));
	items = tasks.map((t) => planItem(t, arrival));
	const groups = groupSchedule(items, today, done);

	document.querySelectorAll<HTMLDetailsElement>('[data-group]').forEach((el) => {
		const list = groups[el.dataset.group as keyof typeof groups];
		el.hidden = list.length === 0;
		el.querySelector('[data-group-count]')!.textContent = String(list.length);
		el.querySelector('[data-group-list]')!.replaceChildren(...list.map((it) => row(it, done.has(it.id), today)));
	});
}

export function initSchedule() {
	const data = document.getElementById('jsg-task-data');
	if (!data) return;
	tasks = JSON.parse(data.textContent ?? '[]') as TaskMeta[];
	render();
	onArrivalChange(render);
	// checklist.ts가 먼저 저장한 뒤 다시 묶는다 (같은 document 리스너, 등록 순서대로 실행)
	document.addEventListener('change', (e) => {
		if ((e.target as HTMLElement).matches?.('input[data-task-id]')) render();
	});
	window.addEventListener('storage', render);

	document.querySelector('[data-ics-all]')?.addEventListener('click', () => {
		const progress = loadProgress();
		const events = items
			.filter((it) => it.date && !progress[it.id])
			.map((it) => taskEvent(tasks.find((t) => t.id === it.id)!, it, location.origin));
		downloadIcs(events, 'japan-settle-guide.ics');
	});
}
```

- [ ] **Step 3: 컴포넌트** — `src/components/MySchedule.astro`

```astro
---
// 내 일정: 입국일 입력칸 + 묶음별 할 일 목록. 목록은 브라우저에서 그린다 (src/scripts/schedule.ts).
import { getCollection } from 'astro:content';
import ArrivalInput from './ArrivalInput.astro';

const tasks = (await getCollection('tasks')).map((t) => ({
	id: t.id,
	title: t.data.title,
	phase: t.data.phase,
	deadline: t.data.deadline,
	optional: t.data.optional,
	due: t.data.due,
}));
const json = JSON.stringify(tasks).replace(/</g, '\\u003c');

const GROUPS = [
	['overdue', '지난 기한'],
	['thisWeek', '이번 주 (7일 이내)'],
	['upcoming', '다가오는 일'],
	['undated', '날짜 없는 일'],
	['done', '완료한 일'],
] as const;
---

<div class="schedule not-content">
	<ArrivalInput id="arrival-my" />

	<div data-schedule hidden>
		<button type="button" class="arrival-submit" data-ics-all>휴대폰 캘린더에 전부 넣기</button>
		<p class="task-hint">날짜가 있고 아직 안 한 일만 넣습니다. [예상]은 입국일로 어림한 날짜, [권장]은 이 사이트가 권하는 시기(법정 기한 아님)입니다.</p>
		{
			GROUPS.map(([key, label], i) => (
				<details class="schedule-group" data-group={key} open={i < 2}>
					<summary>
						{label} (<span data-group-count>0</span>)
					</summary>
					<ul class="schedule-list" data-group-list />
				</details>
			))
		}
	</div>

	<div class="schedule-sample" data-schedule-empty>
		<p class="schedule-sample-title">입국일을 넣으면 이렇게 보여요</p>
		<ul class="schedule-list" aria-hidden="true">
			<li class="schedule-item">
				<span class="task-check-wrap" />
				<div>
					<span class="schedule-title">전입신고 하기 (주소 등록)</span>
					<p class="schedule-when">12월 15일까지 · 6일 남음 <span class="due-badge">예상</span></p>
				</div>
			</li>
			<li class="schedule-item">
				<span class="task-check-wrap" />
				<div>
					<span class="schedule-title">동네 쓰레기 규칙 확인</span>
					<p class="schedule-when">12월 15일까지 · 6일 남음 <span class="due-badge">권장</span></p>
				</div>
			</li>
		</ul>
	</div>
</div>

<script type="application/json" id="jsg-task-data" set:html={json} />

<script>
	import { initChecklist } from '../scripts/checklist';
	import { initSchedule } from '../scripts/schedule';
	initChecklist();
	initSchedule();
</script>
```

예시의 "동네 쓰레기 규칙 확인" 제목은 실제 `src/content/tasks/gomi-bunbetsu.md`의 `title` 값으로 바꿔 넣는다.

- [ ] **Step 4: 페이지** — `src/content/docs/my.mdx`

```mdx
---
title: 내 일정
description: 입국일을 넣으면 일본 정착 할 일의 마감일과 남은 날짜를 한눈에 보여 주고, 휴대폰 캘린더에 넣을 수 있습니다.
lastVerified: 2026-11-08
tableOfContents: false
prev: false
next: false
---

import MySchedule from '../../components/MySchedule.astro';

입국일을 기준으로 할 일을 날짜순으로 정리합니다. 날짜는 각 할 일의 공식 기한 문장으로 계산하며, 정확한 기준은 할 일 페이지에서 확인하세요.

<MySchedule />
```

- [ ] **Step 5: 사이드바** — `astro.config.mjs`의 `sidebar` 배열에서 홈 항목 바로 다음에:

```js
				{ label: '내 일정', link: '/my/' },
```

- [ ] **Step 6: 스타일** — `src/styles/custom.css` 끝에 추가

```css
/* 내 일정 */
.schedule-group {
	margin-block: 1rem;
	border-top: 1px solid var(--sl-color-hairline);
}
.schedule-group > summary {
	min-height: 44px;
	display: flex;
	align-items: center;
	font-weight: 700;
	cursor: pointer;
}
.schedule-list {
	list-style: none;
	margin: 0;
	padding: 0;
}
.schedule-item {
	display: flex;
	gap: 0.75rem;
	align-items: flex-start;
	padding-block: 0.5rem;
}
.schedule-item.is-done .schedule-title {
	text-decoration: line-through;
	color: var(--sl-color-gray-3);
}
.schedule-title {
	font-weight: 700;
}
.schedule-when {
	margin: 0.125rem 0 0;
	font-size: var(--sl-text-sm);
	color: var(--sl-color-gray-3);
}
.schedule-sample {
	opacity: 0.6;
}
.schedule-sample-title {
	font-weight: 700;
}
```

- [ ] **Step 7: 체크포인트 + 화면 확인**

Run: `npm run build` → `Complete!` (57페이지)
Run: `npm run check` → 통과 (my.mdx는 topics가 아니므로 출처 경고 대상 아님)

dev 서버 375px, `/my/`:
  1. 입국일 없음 → 입력칸 + 흐린 예시
  2. 입국일 = 오늘 - 9일 → "지난 기한"에 입국 전 항목들(권장), "이번 주"에 2주 이내 항목
  3. 입국일 = 오늘 + 30일 → "지난 기한" 묶음 숨김 (Review Focus 1)
  4. 항목 체크 → "완료한 일"로 이동, 홈 진행률에도 반영
  5. [휴대폰 캘린더에 전부 넣기] → `japan-settle-guide.ics`, 완료한 항목·귀국 항목은 빠짐
  6. 사이드바에 "내 일정"이 홈 아래에 보임
  7. 다크 모드에서 배지·버튼 글자가 읽힘

---

### Task 7: 검색·공유·측정

**Files:**
- Create: `public/robots.txt`
- Create: `scripts/make-og.mjs`, `public/og.png` (생성물)
- Create: `docs/analytics.md`
- Modify: `astro.config.mjs` (head)
- Modify: `src/content/docs/about.md` (방문 통계 안내)
- Modify: `CLAUDE.md` (구조 설명)

**Interfaces:**
- Consumes: 없음
- Produces: 환경 변수 `PUBLIC_CF_BEACON_TOKEN` (없으면 통계 스크립트를 넣지 않음)

- [ ] **Step 1: robots.txt** — `public/robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://japan-settle-guide.lib-library.workers.dev/sitemap-index.xml
```

- [ ] **Step 2: 공유 이미지 생성 스크립트** — `scripts/make-og.mjs`

```js
// 링크 공유 미리보기 이미지(public/og.png, 1200x630)를 만든다. 사용법: node scripts/make-og.mjs
// 색은 KRDS 토큰(primary-50 #256ef4, gray-90 #1e2124, gray-70 #464c53).
import sharp from 'sharp';

const font = "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
	<rect width="1200" height="630" fill="#ffffff"/>
	<rect width="24" height="630" fill="#256ef4"/>
	<text x="96" y="290" font-family="${font}" font-size="80" font-weight="700" fill="#1e2124">일본 정착 기초 가이드</text>
	<text x="96" y="380" font-family="${font}" font-size="40" fill="#464c53">입국 전부터 첫 1년까지, 시기별 할 일과 마감일</text>
	<text x="96" y="540" font-family="${font}" font-size="28" fill="#256ef4">공식 출처 기반 · 회원가입 없음</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og.png');
console.log('public/og.png 생성');
```

Run: `node scripts/make-og.mjs`
그다음 Read 도구로 `public/og.png`를 열어 한글이 네모(□)로 깨지지 않았는지 눈으로 확인한다. 깨지면 이 컴퓨터에 있는 한글 글꼴 이름(`fc-list :lang=ko` 또는 Windows 글꼴 폴더)으로 `font`를 바꿔 다시 만든다.

- [ ] **Step 3: head 설정** — `astro.config.mjs`

파일 맨 위 import 아래에:

```js
const SITE = 'https://japan-settle-guide.lib-library.workers.dev';
// Cloudflare Web Analytics 토큰. 빌드 환경 변수로 넣는다 (docs/analytics.md). 없으면 통계 스크립트를 넣지 않는다.
const CF_BEACON_TOKEN = process.env.PUBLIC_CF_BEACON_TOKEN;
```

`site: 'https://japan-settle-guide.lib-library.workers.dev',` → `site: SITE,`

`head: [` 배열 끝(Noto Sans JP 링크 다음)에:

```js
				{ tag: 'meta', attrs: { property: 'og:image', content: `${SITE}/og.png` } },
				...(CF_BEACON_TOKEN
					? [
							{
								tag: 'script',
								attrs: {
									defer: true,
									src: 'https://static.cloudflareinsights.com/beacon.min.js',
									'data-cf-beacon': JSON.stringify({ token: CF_BEACON_TOKEN }),
								},
							},
						]
					: []),
```

Run: `npm run build` 후 (Bash) `grep -o 'twitter:card[^>]*' dist/index.html`
- 결과가 없으면 head에 `{ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },`도 추가한다. 이미 있으면 추가하지 않는다.

Run (Bash): `grep -c 'og:image' dist/tasks/tennyu-todoke/index.html` → `1`
Run (Bash): `grep -c cloudflareinsights dist/index.html` → `0` (토큰 없음)
Run (PowerShell): `$env:PUBLIC_CF_BEACON_TOKEN='test'; npm run build; Select-String -Path dist/index.html -Pattern cloudflareinsights -Quiet` → `True`, 끝나면 `Remove-Item Env:PUBLIC_CF_BEACON_TOKEN` 후 다시 `npm run build`

- [ ] **Step 4: 측정 안내 문서** — `docs/analytics.md`

```markdown
# 방문 통계와 링크 규칙

## Cloudflare Web Analytics 켜기

1. Cloudflare 대시보드 → Analytics & Logs → Web Analytics → Add a site
2. 호스트 이름에 `japan-settle-guide.lib-library.workers.dev` 입력, 수동 설치(JS snippet) 선택
3. 스니펫의 `token` 값을 복사
4. 사이트를 빌드하는 곳(Cloudflare Workers 빌드 설정)의 환경 변수에 `PUBLIC_CF_BEACON_TOKEN=<복사한 값>` 추가 후 다시 배포

쿠키를 쓰지 않고, 입국일·체크 내용은 보내지 않는다 (페이지 주소와 유입 경로만).

## 보는 숫자

- 방문자 수 (주 지표): 첫 달 수치를 기준선으로 삼는다.
- 입국일 입력 (실사용 지표): 통계 도구가 입력 자체를 세지 못하므로 `/my/` 방문 수로 대신 본다.

## 인스타 카드뉴스 링크 규칙

링크 끝에 다음을 붙인다. 주제는 영어 소문자·하이픈.

`?utm_source=instagram&utm_medium=social&utm_campaign=<주제>`

예: `https://japan-settle-guide.lib-library.workers.dev/tasks/nenmatsu-chosei/?utm_source=instagram&utm_medium=social&utm_campaign=nenmatsu-2026`
```

- [ ] **Step 5: about 페이지** — `src/content/docs/about.md` 24번째 줄(체크 표시 저장 안내) 바로 다음 줄에 추가하고 `lastVerified`를 `2026-11-08`로 바꾼다.

```markdown
입국일도 같은 방식으로 이 브라우저에만 저장됩니다. 사이트 개선을 위해 쿠키를 쓰지 않는 방문 통계(Cloudflare Web Analytics)로 어떤 페이지를 몇 번 봤는지만 집계하며, 입국일이나 체크 내용은 보내지 않습니다.
```

- [ ] **Step 6: CLAUDE.md 구조 설명** — `## 구조` 목록에 추가

```markdown
- `src/pages/tasks/[id].astro` — 할 일 개별 페이지 (URL = tasks 파일명). `src/content/docs/my.mdx` — 내 일정
- `src/lib/due.ts`·`src/lib/ics.ts` — 입국일 마감일 계산·캘린더 파일 (검사: `scripts/check-due.mjs`). tasks의 `due` 필드는 `deadline` 문장의 숫자만 쓴다
- `src/scripts/arrival.ts` — 입국일을 localStorage(`jsg:arrival:v1`)에 저장
- 방문 통계·카드뉴스 링크 규칙: `docs/analytics.md` (토큰은 환경 변수 `PUBLIC_CF_BEACON_TOKEN`)
```

`## 알려진 주의점`에 추가:

```markdown
- 공유 이미지 `public/og.png`는 `node scripts/make-og.mjs`로 다시 만든다.
```

- [ ] **Step 7: 체크포인트**

Run: `npm run build` → `Complete!`
Run: `npm run check` → 통과

---

### Task 8: 전체 검증

- [ ] **Step 1:** `npm run build`, `npm run check` 모두 통과 (출력 마지막 줄 확인)
- [ ] **Step 2:** 이전에 쓰던 체크 상태 보존 — dev 서버에서 콘솔 `localStorage.setItem('jsg:progress:v1', JSON.stringify({ 'tennyu-todoke': true }))` 후 새로고침 → 시기 페이지·할 일 페이지·내 일정 모두 체크됨
- [ ] **Step 3:** 375px에서 홈 → 입국일 입력 → 내 일정 → 항목 → 할 일 페이지 → 이전/다음까지 가로 스크롤 없이 이동
- [ ] **Step 4:** 키보드만으로 입국일 입력·제출·바꾸기·체크·캘린더 버튼까지 조작 가능, 포커스 표시 보임
- [ ] **Step 5:** 변경 파일에서 `TODO`, `TBD`, `console.log`(검사 스크립트 제외) 검색 → 없음
