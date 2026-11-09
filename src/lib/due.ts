// 입국일 기준 마감일 계산. 브라우저 밖에서도 돌도록 DOM을 쓰지 않는다 (검사: scripts/check-due.mjs).
// 날짜는 모두 'YYYY-MM-DD' 문자열로 다루고, 계산은 UTC 자정 기준으로 해 시간대·서머타임 영향을 없앤다.

export type Due =
	| { kind: 'arrival' | 'estimate'; days?: number; months?: number }
	| { kind: 'yearly'; yearOffset: number; month: number; day: number }
	/** 시기별 권장 날짜를 붙이면 오해를 부르는 항목 (연말정산처럼 회사가 정하는 기한, 바뀔 때마다 하는 일) */
	| { kind: 'none' };

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

/** 손으로 친 날짜를 읽는다: '2026.11.2', '2026-11-02', '20261102', '2026/11/2' → '2026-11-02'. 없는 날짜면 null */
export function parseLooseYmd(value: string): string | null {
	const m = /^\s*(\d{4})(?:[.\-/\s]+(\d{1,2})[.\-/\s]+(\d{1,2})|(\d{2})(\d{2}))\.?\s*$/.exec(value);
	if (!m) return null;
	const p = (n: string) => n.padStart(2, '0');
	return parseYmd(`${m[1]}-${p(m[2] ?? m[4])}-${p(m[3] ?? m[5])}`);
}

/** 입력칸에 보여 줄 형식 '2026.11.02' */
export const toDots = (ymd: string) => ymd.replaceAll('-', '.');

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

export function dueDate(due: Exclude<Due, { kind: 'none' }>, arrival: string): string {
	if (due.kind === 'yearly') {
		return fromUtc(Date.UTC(+arrival.slice(0, 4) + due.yearOffset, due.month - 1, due.day));
	}
	return addDays(addMonths(arrival, due.months ?? 0), due.days ?? 0);
}

export function planItem(task: PlanTask, arrival: string): PlanItem {
	if (task.due?.kind === 'none') return { id: task.id, date: null, kind: 'none' };
	if (task.due) {
		return { id: task.id, date: dueDate(task.due, arrival), kind: task.due.kind === 'estimate' ? 'estimate' : 'exact' };
	}
	const days = PHASE_WINDOW_DAYS[task.phase];
	if (days == null) return { id: task.id, date: null, kind: 'none' };
	return { id: task.id, date: addDays(arrival, days), kind: 'window' };
}

/** 이번 주 = 오늘 포함 7일 (오늘 ~ 6일 뒤). 각 묶음은 날짜순. */
export function groupSchedule(items: PlanItem[], today: string, done: ReadonlySet<string>): Schedule {
	const s: Schedule = { overdue: [], thisWeek: [], upcoming: [], undated: [], done: [] };
	const sorted = [...items].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
	for (const it of sorted) {
		if (done.has(it.id)) s.done.push(it);
		else if (!it.date) s.undated.push(it);
		else {
			const left = daysBetween(today, it.date);
			if (left < 0) s.overdue.push(it);
			else if (left < 7) s.thisWeek.push(it);
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

/** 'D-7' / 'D-day' / '3일 지남' */
export const dLabel = (left: number) => (left > 0 ? `D-${left}` : left === 0 ? 'D-day' : `${-left}일 지남`);

/** '입국까지 23일' / '오늘 입국' / '입국 후 9일째' (입국일이 1일째) */
export function arrivalSummary(arrival: string, today: string): string {
	const d = daysBetween(arrival, today);
	if (d < 0) return `입국까지 ${-d}일`;
	if (d === 0) return '오늘 입국';
	return `입국 후 ${d + 1}일째`;
}

/** 입국일 기준 지금 시기: 권장 시기(PHASE_WINDOW_DAYS)를 아직 안 넘긴 첫 시기. 1년이 지나도 '첫 1년'에 둔다. */
export function currentPhase(arrival: string, today: string): string {
	const d = daysBetween(arrival, today);
	for (const [phase, days] of Object.entries(PHASE_WINDOW_DAYS)) {
		if (days != null && d < days) return phase;
	}
	return 'first-1y';
}
