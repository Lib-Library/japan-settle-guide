// 시기(phase)와 주제(topic)의 목록. 새 주제를 추가하려면 여기에 한 줄 추가한다.

export const PHASES = [
	{ id: 'pre-arrival', label: '입국 전', href: '/timeline/pre-arrival/' },
	{ id: 'arrival-2w', label: '입국 후 2주 이내', href: '/timeline/arrival-2w/' },
	{ id: 'first-3m', label: '첫 3개월', href: '/timeline/first-3m/' },
	{ id: 'first-1y', label: '첫 1년', href: '/timeline/first-1y/' },
	{ id: 'leaving', label: '귀국할 때', href: '/timeline/leaving/' },
] as const;

export const TOPICS = [
	{ id: 'pre-arrival', label: '입국 전 준비' },
	{ id: 'registration', label: '주민등록·마이넘버·재류카드' },
	{ id: 'housing', label: '주거' },
	{ id: 'finance', label: '금융' },
	{ id: 'living', label: '통신·생활 인프라' },
	{ id: 'insurance-tax', label: '사회보험·세금' },
	{ id: 'work', label: '회사 생활' },
	{ id: 'health-safety', label: '의료·재난 대비' },
	{ id: 'korea', label: '한국과의 연결' },
	{ id: 'transport', label: '이동·교통' },
	{ id: 'family', label: '가족 동반' },
] as const;

/**
 * 시기 페이지의 단계 묶음. 할 일의 order가 maxOrder 이하인 첫 단계에 들어간다 (마지막 단계는 나머지 전부).
 * 각 시기 페이지에 적어 두었던 권장 순서를 옮긴 것이다. 새 할 일은 order만 맞추면 된다.
 */
export const PHASE_STEPS: Record<(typeof PHASES)[number]['id'], { label: string; maxOrder: number }[]> = {
	'pre-arrival': [
		{ label: '병역·비자', maxOrder: 10 },
		{ label: '한국 쪽 정리 (주민등록·연금·건강보험·세금)', maxOrder: 35 },
		{ label: '사택 확인·집 구하기', maxOrder: 45 },
		{ label: '이삿짐·입국', maxOrder: Infinity },
	],
	'arrival-2w': [
		{ label: '입주한 날', maxOrder: 9 },
		{ label: '전입신고', maxOrder: 10 },
		{ label: '회사 서류·사회보험', maxOrder: 35 },
		{ label: '휴대폰 → 은행 계좌', maxOrder: 40 },
		{ label: '동네 규칙·긴급 연락처', maxOrder: Infinity },
	],
	'first-3m': [
		{ label: '한국 쪽 등록', maxOrder: 6 },
		{ label: '마이넘버·인터넷·송금', maxOrder: 30 },
		{ label: '병원·재난·교통 대비', maxOrder: Infinity },
	],
	'first-1y': [
		{ label: '세금', maxOrder: 30 },
		{ label: '바뀐 정보 알리기·면허', maxOrder: Infinity },
	],
	leaving: [
		{ label: '출국 전 (일본에서)', maxOrder: 20 },
		{ label: '귀국 후 (한국에서)', maxOrder: Infinity },
	],
};

/** 할 일이 들어가는 단계 (마지막 단계의 maxOrder가 Infinity라 항상 찾는다) */
export const stepOf = (phase: (typeof PHASES)[number]['id'], order: number) =>
	PHASE_STEPS[phase].find((s) => order <= s.maxOrder)!;

export type PhaseId = (typeof PHASES)[number]['id'];
export type TopicId = (typeof TOPICS)[number]['id'];

export const PHASE_IDS = PHASES.map((p) => p.id) as [PhaseId, ...PhaseId[]];
export const TOPIC_IDS = TOPICS.map((t) => t.id) as [TopicId, ...TopicId[]];

export const phaseOf = (id: string) => PHASES.find((p) => p.id === id);
export const topicOf = (id: string) => TOPICS.find((t) => t.id === id);

/** 이 기간(일)보다 오래 확인하지 않은 페이지에는 경고를 표시한다. */
export const STALE_AFTER_DAYS = 183;

export const formatDate = (d: Date) =>
	`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

export const isStale = (d: Date, now = new Date()) =>
	now.getTime() - d.getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
