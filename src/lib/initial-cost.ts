// 일본 집 초기비용 계산. 브라우저 밖에서도 돌도록 DOM을 쓰지 않는다 (검사: scripts/check-initial-cost.mjs).

export const EXTRAS = [
	{ id: 'fire', label: '화재보험', ja: '火災保険', reading: '가사이 호켄', note: '보통 2년분', amount: 18000, on: true },
	{ id: 'key', label: '열쇠 교체', ja: '鍵交換', reading: '가기 고칸', note: '', amount: 16500, on: true },
	{ id: 'support', label: '24시간 생활 지원', ja: '24時間サポート', reading: '니주요지칸 사포토', note: '선택 사항인 경우 많음', amount: 16500, on: false },
	{ id: 'disinfect', label: '실내 소독·항균', ja: '消毒料', reading: '쇼도쿠료', note: '선택 사항인 경우 많음', amount: 16500, on: false },
	{ id: 'clean', label: '퇴거 청소비 선불', ja: 'クリーニング費', reading: '구리닌구히', note: '특약이 있을 때', amount: 33000, on: false },
] as const;

export const PRESETS = {
	std: { label: '도쿄 일반', shiki: 1, rei: 1, fee: 1.1, guar: 0.5, next: true, extras: ['fire', 'key'] },
	zero: { label: '시키레이 제로', shiki: 0, rei: 0, fee: 1.1, guar: 1, next: true, extras: ['fire', 'key'] },
	// UR 공식 안내: 입주 때 내는 돈은 시키킨(2개월분)과 일할 집세·공익비뿐
	ur: { label: 'UR 임대', shiki: 2, rei: 0, fee: 0, guar: 0, next: false, extras: [] },
} as const;

export interface CostInput {
	rent: number;
	mgmt: number;
	shiki: number;
	rei: number;
	fee: number;
	guar: number;
	/** YYYY-MM-DD, 비어 있으면 일할 계산을 하지 않는다 */
	date: string;
	next: boolean;
	extras: { label: string; note: string; amount: number; on: boolean }[];
}

export interface CostItem {
	label: string;
	note: string;
	amount: number;
	keep?: boolean;
}

// 0.55 같은 소수를 곱하면 부동소수점 오차로 1엔 모자랄 수 있어 정수 퍼센트로 계산한다.
const share = (base: number, ratio: number) => Math.floor((base * Math.round(ratio * 100)) / 100);

export function calcCost(s: CostInput) {
	const base = s.rent + s.mgmt;
	const d = s.date ? new Date(`${s.date}T00:00:00`) : null;
	const valid = d !== null && !Number.isNaN(d.getTime());

	let prorate = 0;
	let prorateLabel = '이번 달 일할 집세';
	let prorateNote = '';
	if (valid) {
		const inMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
		const days = inMonth - d.getDate() + 1;
		prorate = Math.floor((base * days) / inMonth);
		prorateLabel = `${d.getMonth() + 1}월 일할 집세`;
		prorateNote = days === inMonth ? '1일 입주, 한 달 전체' : `${days}일 / ${inMonth}일 · 관리비 포함`;
	}

	const items: CostItem[] = [
		{ label: '시키킨', note: `${s.shiki}개월분`, amount: s.rent * s.shiki, keep: true },
		{ label: '레이킨', note: `${s.rei}개월분`, amount: s.rent * s.rei },
		{ label: '중개수수료', note: s.fee ? `${s.fee}개월분 (부가세 포함)` : '없음', amount: share(s.rent, s.fee) },
		{
			label: '보증회사 보증료',
			note: s.guar ? `${Math.round(s.guar * 100)}% × (집세+관리비)` : '연대보증인 등',
			amount: share(base, s.guar),
		},
		{ label: prorateLabel, note: prorateNote, amount: prorate },
	];
	if (s.next) {
		const label = valid ? `${((d.getMonth() + 1) % 12) + 1}월 집세` : '다음 달 집세';
		items.push({ label, note: '선불 · 관리비 포함', amount: base });
	}
	for (const x of s.extras) if (x.on) items.push({ label: x.label, note: x.note, amount: x.amount });

	const total = items.reduce((sum, it) => sum + it.amount, 0);
	const keep = items.reduce((sum, it) => sum + (it.keep ? it.amount : 0), 0);
	return { items, total, keep, gone: total - keep, months: s.rent ? total / s.rent : 0 };
}

/** 기본 입주일: 다음 달 15일 */
export function defaultMoveIn(now = new Date()) {
	const next = new Date(now.getFullYear(), now.getMonth() + 1, 15);
	return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-15`;
}
