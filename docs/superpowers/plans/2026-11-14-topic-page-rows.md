# 주제 페이지 묶음 행·단계·콜아웃 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주제 페이지의 목록 위주 글을 묶음 행(`Rows`/`Row`/`Stat`)·단계(`<Steps>`)·콜아웃(`:::tip`/`:::caution`)·할 일 요약(`TopicTasks`)으로 다시 구성해 훑어 읽기 쉽게 만든다.

**Architecture:** 새 Astro 컴포넌트 4개는 원고에서 자식 컴포넌트 방식으로 쓴다. 단계·콜아웃은 Starlight 기본 기능을 CSS로 KRDS 색에 맞춘다. 할 일 요약은 기존 `checklist.ts`의 `data-progress` 규약을 재사용하고 `TaskList`에 `id="checklist"`만 단다.

**Tech Stack:** Astro 7 + Starlight 0.42 (MDX, `@astrojs/starlight/components`의 `Steps`), `src/styles/custom.css`, 검증은 build + check + 빌드 HTML 지표 + Playwright 375px

**Spec:** `docs/superpowers/specs/2026-11-14-topic-page-rows-design.md`

## Global Constraints

- 사실·숫자·출처·`[확인 필요]`·`<Ja>` 표기를 바꾸지 않는다. `lastVerified`는 그대로 둔다.
- 3열 이상 표 금지. 375px에서 가로 스크롤 없음.
- 색은 다크 모드 값이 있는 토큰만 쓴다(`--c-ok-*`, `--c-danger-*`, `--sl-color-accent-low`, `--sl-color-text-accent`, `--sl-color-gray-*`, `--sl-color-hairline`).
- 계산기 페이지(`initial-cost-calculator.mdx`)는 손대지 않는다.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. **정보 누락** — 목록을 행으로 요약하면서 문장·링크·원어가 빠질 수 있다. 빌드 HTML 지표(`sh .superpowers/topic-rows/metrics.sh`)가 `before.txt`보다 줄면 안 된다. 각 Task의 검증 단계.
2. **Row 설명 안의 마크다운** — `**굵게**`·링크·`<Ja>`가 행 안에서 렌더돼야 하고 `<p>`로 감싸져 여백이 생기면 안 된다. Task 1 Step 5에서 HTML 확인.
3. **긴 값·긴 이름 (375px)** — `value`가 길면(예: "0.35~0.5개월분") 이름 칸이 너무 좁아질 수 있다. 값은 짧게 쓰고, 화면에서 확인. Task 1 Step 6.
4. **다크 모드 대비** — 묶음 머리 색·콜아웃 배경이 다크에서 글자와 구분돼야 한다. Task 1 Step 6 다크 스크린숏.
5. **할 일 요약의 완료 수** — `TopicTasks`가 TaskList와 같은 필터를 써야 숫자가 맞는다(pre-arrival은 `phase`). Task 1 Step 6, Task 2 Step 3.

---

### Task 1: 컴포넌트·스타일 + housing 전환

**Files:**
- Create: `src/components/Rows.astro`, `src/components/Row.astro`, `src/components/Stat.astro`, `src/components/TopicTasks.astro`
- Modify: `src/components/TaskList.astro` (최상위 div 2곳에 `id="checklist"`)
- Modify: `src/styles/custom.css` (끝에 블록 추가)
- Modify: `src/content/docs/topics/housing.mdx`
- Modify: `CONTRIBUTING.md` (새 문법 안내)

**Interfaces:**
- Produces: `<Rows title? tone?>`, `<Row t ja? r? value? tag?>`, `<Stat value>`, `<TopicTasks topic? phase?>` — Task 2가 그대로 쓴다.

- [ ] **Step 1: 기준 확인 (실패 확인)**

Run: `grep -c "class=\"rows" dist/topics/housing/index.html; grep -c 'id="checklist"' dist/topics/housing/index.html`
Expected: `0`, `0`

- [ ] **Step 2: 컴포넌트 작성**

`src/components/Rows.astro`
```astro
---
// 묶음 행 상자. 사용법: <Rows title="돌려받지 못하는 돈" tone="lost"><Row .../></Rows>
// tone: back(초록) / lost(빨강) / info(파랑) / 없음(회색)
interface Props {
	title?: string;
	tone?: 'back' | 'lost' | 'info';
}
const { title, tone } = Astro.props;
---

<section class="rows not-content" data-tone={tone}>
	{title && <p class="rows-title">{title}</p>}
	<ul class="rows-list"><slot /></ul>
</section>
```

`src/components/Row.astro`
```astro
---
// 묶음 행 한 줄: 이름(+원어) / 한 줄 설명(자식) / 오른쪽 값 또는 태그
// 사용법: <Row t="레이킨" ja="礼金" r="레이킨" value="1~2개월">집주인에게 주는 사례금</Row>
import Ja from './Ja.astro';

interface Props {
	t: string;
	ja?: string;
	r?: string;
	value?: string;
	tag?: string;
}
const { t, ja, r, value, tag } = Astro.props;
---

<li class="row">
	<div class="row-main">
		<span class="row-t">{t}{ja && r && <> <Ja t={ja} r={r} /></>}</span>
		{Astro.slots.has('default') && <div class="row-d"><slot /></div>}
	</div>
	{value && <span class="row-v">{value}</span>}
	{!value && tag && <span class="row-tag">{tag}</span>}
</li>
```

`src/components/Stat.astro`
```astro
---
// 요약 숫자 상자. 사용법: <Stat value="4~7개월분">집세 기준</Stat>
interface Props {
	value: string;
}
const { value } = Astro.props;
---

<p class="stat not-content"><strong class="stat-v">{value}</strong> <span class="stat-d"><slot /></span></p>
```

`src/components/TopicTasks.astro`
```astro
---
// 주제 페이지 맨 위의 할 일 요약 한 줄. 페이지 끝 TaskList(#checklist)로 이동한다.
// 사용법: <TopicTasks topic="housing" />  (TaskList와 같은 props, 같은 필터)
// 완료 수는 같은 페이지의 TaskList가 부르는 checklist.ts가 [data-progress]로 채운다.
import { getCollection } from 'astro:content';
import type { PhaseId, TopicId } from '../lib/taxonomy';

interface Props {
	phase?: PhaseId;
	topic?: TopicId;
}
const { phase, topic } = Astro.props;
const ids = (
	await getCollection('tasks', ({ data }) => (!phase || data.phase === phase) && (!topic || data.topic === topic))
).map((t) => t.id);
---

{
	ids.length > 0 && (
		<a class="topic-tasks not-content" href="#checklist" data-progress={ids.join(',')}>
			<span>이 주제의 할 일 {ids.length}개</span>
			<span class="topic-tasks-done">
				<span data-progress-done>0</span> 완료 →
			</span>
		</a>
	)
}
```

`src/components/TaskList.astro`: 최상위 `<div class="task-list not-content">` 두 곳을 `<div class="task-list not-content" id="checklist">`로 바꾼다.

- [ ] **Step 3: CSS 추가 (`src/styles/custom.css` 끝)**

```css
/* 주제 페이지: 할 일 요약 · 요약 숫자 · 묶음 행 · 콜아웃 · 단계 */
.topic-tasks {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 0.75rem;
	min-height: 3rem;
	margin-block: 1rem;
	padding: 0.75rem 1rem;
	border: 2px solid var(--sl-color-accent);
	border-radius: var(--radius-xl);
	font-weight: 700;
	color: var(--sl-color-white);
	text-decoration: none;
}
.topic-tasks-done {
	flex-shrink: 0;
	color: var(--sl-color-text-accent);
}
.topic-tasks:hover {
	background: var(--sl-color-accent-low);
}

.stat {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 0.25rem 0.5rem;
	margin-block: 1rem 0.75rem;
	padding: 0.75rem 1rem;
	border-radius: var(--radius-xl);
	background: var(--sl-color-accent-low);
}
.stat-v {
	font-size: var(--sl-text-2xl);
	font-weight: 800;
	color: var(--sl-color-text-accent);
}
.stat-d {
	font-size: var(--sl-text-sm);
	color: var(--sl-color-gray-2);
}

.rows {
	margin-block: 0.75rem;
	border: 1px solid var(--sl-color-gray-5);
	border-radius: var(--radius-lg);
	overflow: hidden;
}
.rows-title {
	margin: 0;
	padding: 0.5rem 0.75rem;
	background: var(--sl-color-gray-6);
	font-size: var(--sl-text-sm);
	font-weight: 700;
	color: var(--sl-color-white);
}
.rows[data-tone='back'] .rows-title {
	background: var(--c-ok-bg);
	color: var(--c-ok-fg);
}
.rows[data-tone='lost'] .rows-title {
	background: var(--c-danger-bg);
	color: var(--c-danger-fg);
}
.rows[data-tone='info'] .rows-title {
	background: var(--sl-color-accent-low);
	color: var(--sl-color-text-accent);
}
.rows-list {
	list-style: none;
	margin: 0;
	padding: 0;
}
.row {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 0.75rem;
	margin: 0;
	padding: 0.625rem 0.75rem;
	border-top: 1px solid var(--sl-color-hairline);
}
.row:first-child {
	border-top: 0;
}
.row-main {
	min-width: 0;
}
.row-t {
	font-weight: 700;
	color: var(--sl-color-white);
}
.row-d {
	margin-top: 0.125rem;
	font-size: var(--sl-text-sm);
	color: var(--sl-color-gray-2);
}
.row-d > :is(p, ul) {
	margin: 0;
}
.row-v {
	flex-shrink: 0;
	max-width: 40%;
	font-weight: 800;
	color: var(--sl-color-text-accent);
	text-align: end;
}
.row-tag {
	flex-shrink: 0;
	padding: 0 0.5rem;
	border-radius: 999px;
	background: var(--sl-color-gray-6);
	font-size: var(--sl-text-xs);
	font-weight: 700;
	color: var(--sl-color-gray-2);
}

/* 콜아웃: 왼쪽 굵은 선 + 옅은 배경 */
.sl-markdown-content .starlight-aside {
	border: 0;
	border-inline-start: 4px solid var(--sl-color-asides-border);
	border-radius: 0 var(--radius-xl) var(--radius-xl) 0;
}

/* 단계: 포인트 색 번호 원 + 가는 연결선 */
.sl-steps > li::before {
	background: var(--sl-color-accent);
	color: var(--c-on-accent);
	box-shadow: none;
}
.sl-steps > li::after {
	background: var(--sl-color-hairline);
}
.sl-steps > li > :first-child {
	font-weight: 700;
}
```

`--sl-color-asides-border`는 Starlight가 aside 종류마다 정하는 변수다(tip=포인트, caution=경고). 빌드 후 실제 이름이 다르면 개발자 도구로 `.starlight-aside`의 계산된 `border-color` 변수를 확인해 맞추고 ledger에 Ruling을 남긴다.

- [ ] **Step 4: housing.mdx 전환**

스펙의 "콘텐츠 전환 규칙"을 따른다. import 추가:
```mdx
import { Steps } from '@astrojs/starlight/components';
import Rows from '../../../components/Rows.astro';
import Row from '../../../components/Row.astro';
import Stat from '../../../components/Stat.astro';
import TopicTasks from '../../../components/TopicTasks.astro';
```
- 첫 문단 다음: `<TopicTasks topic="housing" />`
- "먼저 회사에 물어보기" 섹션 → `:::tip[먼저 회사에 물어보기]` (제목 h2는 콜아웃 제목으로 대체)
- "집 구하는 흐름" 번호 목록 → `<Steps>` (각 단계 `**제목**` + 줄바꿈 + 보조 설명, `<Ja>` 유지)
- "초기 비용" → `<Stat value="4~7개월분">…</Stat>` + `Rows`(back: 시키킨 / lost: 레이킨·중개수수료·보증료 / 회색 "매달·그 밖": 선불 집세·관리비·화재보험). 각 행 설명은 원문 문장 그대로 또는 원문 앞부분, 중개수수료 상한 계산처럼 긴 문장은 행 아래 본문 문단으로.
- "보증회사는 보험이 아닙니다" → `:::caution[보증회사는 보험이 아닙니다]`
- "계약서에서 꼭 확인할 것" → 머리 없는 `Rows` 하나(원상회복·해약 예고 포함)
- "살면서 지킬 규칙" → 머리 없는 `Rows` 하나
- "퇴거" 번호 목록 → `<Steps>`
- "원상회복" → `Rows tone="info" title="집주인 부담"` + `Rows tone="lost" title="세입자 부담"` + 특약 문장은 `:::caution[계약서 특약이 우선]`
- "이 주제의 체크리스트" h2와 TaskList는 그대로

- [ ] **Step 5: 빌드·지표 확인**

Run:
```bash
npm run build && npm run check && sh .superpowers/topic-rows/metrics.sh | grep housing && grep -c 'class="row"' dist/topics/housing/index.html && grep -o '<div class="row-d"><p>' dist/topics/housing/index.html | wc -l
```
Expected: build·check 성공, housing 지표가 before.txt(`verify=0 ext=7 ja=17`) 이상, row 1개 이상, `row-d` 안 `<p>`는 0(있으면 CSS `.row-d > p { margin: 0 }`가 처리하는지 화면 확인).

- [ ] **Step 6: 브라우저 확인 (375px, 라이트·다크)**

`npx astro dev --background` 후 `/topics/housing/`:
1. 할 일 요약 링크 → `#checklist`로 이동. 체크리스트에서 하나 체크 → 위로 돌아가면 요약의 완료 수 1.
2. 행 값이 오른쪽에 붙고 `scrollWidth <= 375`.
3. 라이트·다크(`document.documentElement.dataset.theme='dark'`) 전체 스크린숏을 읽어 묶음 머리·콜아웃·단계 대비 확인.
`npx astro dev stop`.

- [ ] **Step 7: CONTRIBUTING.md 안내 추가 + Commit**

CONTRIBUTING.md의 MDX 컴포넌트 설명 근처에 짧은 절을 추가:
```md
### 주제 페이지 구성 요소

- **용어 + 설명 목록** → `<Rows title="묶음 이름" tone="back|lost|info">` 안에 `<Row ja="原語" r="독음" t="뜻" value="값">한 줄 설명</Row>`. 긴 설명은 `</Rows>` 아래 문단으로.
- **요약 숫자** → `<Stat value="4~7개월분">보조 설명</Stat>`
- **번호 절차** → `import { Steps } from '@astrojs/starlight/components'` 후 번호 목록을 `<Steps>`로 감싼다.
- **강조·경고** → `:::tip[제목]` / `:::caution[제목]` (한 섹션에 하나 이하)
- **할 일 요약** → 첫 문단 다음 `<TopicTasks topic="…" />` (TaskList와 같은 props)
```
```bash
git add src/components/Rows.astro src/components/Row.astro src/components/Stat.astro src/components/TopicTasks.astro src/components/TaskList.astro src/styles/custom.css src/content/docs/topics/housing.mdx CONTRIBUTING.md
git commit -m "주제 페이지 묶음 행·단계·콜아웃 컴포넌트 추가, 주거 페이지 전환

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 나머지 8개 주제 페이지 전환

**Files:**
- Modify: `src/content/docs/topics/{finance,health-safety,insurance-tax,korea,living,pre-arrival,registration,transport}.mdx`

**Interfaces:**
- Consumes: Task 1의 `Rows`/`Row`/`Stat`/`TopicTasks`, `Steps`, `:::tip`/`:::caution`

- [ ] **Step 1: 페이지마다 전환** — Task 1 Step 4와 같은 규칙. import는 쓰는 컴포넌트만. pre-arrival은 `<TopicTasks phase="pre-arrival" />`. insurance-tax의 기존 2열 표는 둔다. 의미로 나눌 기준이 없는 목록은 머리 없는 `Rows` 하나. 콜아웃은 섹션당 하나 이하.

- [ ] **Step 2: 빌드·지표 비교**

Run: `npm run build && npm run check && sh .superpowers/topic-rows/metrics.sh > .superpowers/topic-rows/after.txt && diff .superpowers/topic-rows/before.txt .superpowers/topic-rows/after.txt`
Expected: build·check 성공. diff가 있으면 모든 숫자가 before 이상이어야 한다(줄어든 페이지는 원문과 대조해 복구).

- [ ] **Step 3: 브라우저 확인** — 375px에서 8개 페이지 `scrollWidth <= 375`, pre-arrival·registration 라이트·다크 스크린숏 확인, 각 페이지 할 일 요약의 총 개수가 페이지 끝 체크리스트 개수와 같다.

- [ ] **Step 4: Commit**

```bash
git add src/content/docs/topics/
git commit -m "나머지 주제 페이지를 묶음 행·단계·콜아웃으로 전환

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
