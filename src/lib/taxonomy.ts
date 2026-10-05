// 시기(phase)와 주제(topic)의 목록. 새 주제를 추가하려면 여기에 한 줄 추가한다.

export const PHASES = [
	{ id: 'pre-arrival', num: '①', label: '입국 전', href: '/timeline/pre-arrival/' },
	{ id: 'arrival-2w', num: '②', label: '입국 후 2주 이내', href: '/timeline/arrival-2w/' },
	{ id: 'first-3m', num: '③', label: '첫 3개월', href: '/timeline/first-3m/' },
	{ id: 'first-1y', num: '④', label: '첫 1년', href: '/timeline/first-1y/' },
	{ id: 'leaving', num: '⑤', label: '귀국할 때', href: '/timeline/leaving/' },
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

export type PhaseId = (typeof PHASES)[number]['id'];
export type TopicId = (typeof TOPICS)[number]['id'];

export const PHASE_IDS = PHASES.map((p) => p.id) as [PhaseId, ...PhaseId[]];
export const TOPIC_IDS = TOPICS.map((t) => t.id) as [TopicId, ...TopicId[]];

export const phaseOf = (id: string) => PHASES.find((p) => p.id === id);

/** 이 기간(일)보다 오래 확인하지 않은 페이지에는 경고를 표시한다. */
export const STALE_AFTER_DAYS = 183;

export const formatDate = (d: Date) =>
	`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

export const isStale = (d: Date, now = new Date()) =>
	now.getTime() - d.getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
