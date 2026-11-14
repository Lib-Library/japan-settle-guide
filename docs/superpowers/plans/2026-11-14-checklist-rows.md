# 체크리스트 줄 목록 통일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시간순·주제별 체크리스트의 아코디언(`TaskCard`)을 내 일정과 같은 줄 목록(`TaskRow`)으로 바꾸고, 줄을 누르면 할 일 개별 페이지로 이동하게 한다.

**Architecture:** 서버에서 그리는 `TaskRow.astro`가 내 일정(`schedule.ts`)이 브라우저에서 그리는 `.schedule-item` 마크업·클래스를 그대로 쓴다. 체크박스 속성(`data-task-id`)과 줄 속성(`data-task-card`)은 기존과 같아서 `checklist.ts`·`due-chips.ts`는 수정하지 않는다. 줄 전체 클릭은 제목 링크 `::after`를 줄 전체로 늘리는 CSS로 처리한다.

**Tech Stack:** Astro 7 + Starlight 0.42, 순수 CSS (`src/styles/custom.css`), 테스트 러너 없음(검증은 `npm run build` + `npm run check` + 빌드 결과 grep + 브라우저 확인)

**Spec:** `docs/superpowers/specs/2026-11-14-checklist-rows-design.md`

## Global Constraints

- tasks 파일명·저장 키(`jsg:progress:v1`)·체크박스 `data-task-id` 값은 바꾸지 않는다.
- 터치 영역 최소 44px (`.schedule-item .task-check-wrap`은 이미 2.75rem).
- 3열 이상 표 금지, 모바일(375px) 기준으로 확인.
- 내 일정(`/my/`) 화면 모양은 바뀌지 않는다. 새 CSS는 `.task-row`로 범위를 한정한다.
- 콘텐츠·컴포넌트 변경 후 `npm run build` 통과 필수.
- Node >= 22. dev 서버는 `npx astro dev --background`로 띄우고 `npx astro dev stop`으로 끈다.

## Review Focus

1. **체크박스를 눌렀는데 페이지가 이동함** — 늘린 링크 영역(`::after`)이 체크박스를 덮으면 체크 대신 이동한다. 체크박스는 링크 위(z-index)에 있어야 한다. Task 1 Step 6에서 확인.
2. **`[확인 필요]`가 든 `where`/`deadline`** — 줄 둘째 줄에서 배지가 문장 사이에 깨지지 않고 보여야 한다. Task 1 Step 6에서 `[확인 필요]`가 있는 할 일로 확인.
3. **완료한 할 일의 마감 칩** — 예전에는 `.task-card.is-done`이 칩을 숨겼다. 선택자가 바뀌면 완료한 줄에 D-day가 계속 보인다. Task 1 Step 3 CSS, Step 6에서 확인.
4. **긴 '어디서' 문장** — 375px에서 가로 스크롤 없이 줄바꿈돼야 한다(`min-width: 0`). Task 1 Step 6에서 확인.
5. **할 일 페이지의 본문 스타일 회귀** — `.task-body` 규칙은 할 일 페이지(`.task-page-card.task-body`)도 쓴다. 죽은 CSS를 지울 때 `.task-body` 규칙은 남겨야 한다. Task 2 Step 4에서 확인.

---

### Task 1: TaskRow 추가하고 TaskList에서 사용

**Files:**
- Create: `src/components/TaskRow.astro`
- Modify: `src/components/TaskList.astro` (import, hint 문구 2곳, `<TaskCard>` 2곳)
- Modify: `src/styles/custom.css` (`.task-due-chip` 블록 근처, 약 1310–1318행)

**Interfaces:**
- Consumes: `CollectionEntry<'tasks'>`, `TopicIcon`(`topic`, `size="sm"`), `VerifyText`(`text`), `phaseOf(id)` from `src/lib/taxonomy`
- Produces: `<TaskRow task={entry} showPhase?={boolean} />` — `<li class="schedule-item task-row" data-task-card={id}>` 하나를 그린다. 부모는 `<ul class="schedule-list">`여야 한다.

- [ ] **Step 1: 현재 상태가 아코디언인지 확인 (실패 확인)**

Run:
```bash
npm run build && grep -c 'class="task-details"' dist/timeline/arrival-2w/index.html; grep -c 'task-row' dist/timeline/arrival-2w/index.html
```
Expected: 첫 숫자는 1 이상(아코디언 있음), 둘째는 `0`(줄 목록 없음).

- [ ] **Step 2: `src/components/TaskRow.astro` 작성**

```astro
---
// 체크리스트 한 줄: 체크 / 주제 아이콘 / 제목(할 일 페이지 링크) / 기한 · 어디서 / 마감 칩.
// 내 일정(src/scripts/schedule.ts)의 줄과 같은 마크업·클래스를 쓴다. 부모는 <ul class="schedule-list">.
import type { CollectionEntry } from 'astro:content';
import TopicIcon from './TopicIcon.astro';
import VerifyText from './VerifyText.astro';
import { phaseOf } from '../lib/taxonomy';

interface Props {
	task: CollectionEntry<'tasks'>;
	showPhase?: boolean;
}
const { task, showPhase = false } = Astro.props;
const { data } = task;
const phase = phaseOf(data.phase);
---

<li class="schedule-item task-row" data-task-card={task.id}>
	<label class="task-check-wrap">
		<input class="task-check" type="checkbox" data-task-id={task.id} aria-label={`${data.title} 완료 표시`} />
	</label>
	<TopicIcon topic={data.topic} size="sm" />
	<div class="schedule-item-body">
		<a class="schedule-title" href={`/tasks/${task.id}/`}>{data.title}</a>
		{data.optional && <span class="task-tag">선택</span>}
		<p class="schedule-when">
			{showPhase && phase && <span class="task-phase">{phase.label} · </span>}
			<VerifyText text={data.deadline} /> · <VerifyText text={data.where} />
		</p>
		<span
			class="home-chip task-due-chip"
			data-due-chip={task.id}
			data-phase={data.phase}
			data-due={data.due ? JSON.stringify(data.due) : undefined}
			hidden
		/>
	</div>
	<span class="task-row-arrow" aria-hidden="true">→</span>
</li>
```

`id="task-{id}"`은 넣지 않는다. 예전에는 `<label for>` 연결용이었고, 지금은 label이 input을 감싸서 필요 없다.

- [ ] **Step 3: `src/styles/custom.css`에 줄 CSS 추가, 칩 숨김 선택자 수정**

`.task-due-chip` 블록(약 1310행)을 아래로 바꾼다.

```css
/* 할 일 줄의 마감 칩 (입국일이 있을 때) */
.task-due-chip {
	display: inline-block;
	margin-top: 0.35rem;
	font-size: var(--sl-text-xs);
}
.task-due-chip[hidden],
.is-done .task-due-chip {
	display: none;
}

/* 시간순·주제별 체크리스트 줄: 줄 전체가 할 일 페이지 링크, 체크박스만 그 위에 */
.task-row {
	position: relative;
}
.task-row .schedule-title::after {
	content: '';
	position: absolute;
	inset: 0;
}
.task-row .task-check-wrap {
	position: relative;
	z-index: 1;
}
.task-row:hover .schedule-title {
	text-decoration: underline;
}
.task-row-arrow {
	flex-shrink: 0;
	padding-inline-end: 0.25rem;
	color: var(--sl-color-gray-3);
}
```

- [ ] **Step 4: `src/components/TaskList.astro`에서 TaskRow 사용**

import 교체:
```astro
import TaskRow from './TaskRow.astro';
```
(`import TaskCard from './TaskCard.astro';` 줄을 지운다.)

hint 문구 2곳을 모두 바꾼다:
```astro
<p class="task-hint">항목을 누르면 할 일 페이지로 이동합니다. 체크한 내용은 이 브라우저에만 저장됩니다.</p>
```

시기 분기(단계 안)의 카드 목록:
```astro
							<ul class="schedule-list">
								{s.tasks.map((task) => (
									<TaskRow task={task} />
								))}
							</ul>
```

주제 분기의 카드 목록:
```astro
			<ul class="schedule-list">
				{tasks.map((task) => (
					<TaskRow task={task} showPhase />
				))}
			</ul>
```

- [ ] **Step 5: 빌드·검사 통과와 마크업 확인**

Run:
```bash
npm run build && npm run check && grep -c 'class="task-details"' dist/timeline/arrival-2w/index.html; grep -c 'schedule-item task-row' dist/timeline/arrival-2w/index.html; grep -c 'schedule-item task-row' dist/topics/housing/index.html
```
Expected: build·check 성공, 첫 숫자 `0`, 둘째 숫자는 Step 1의 첫 숫자와 같음, 셋째는 1 이상.

- [ ] **Step 6: 브라우저 확인 (375px)**

```bash
npx astro dev --background
```
Playwright(또는 직접 브라우저)로 폭 375px에서 `http://localhost:4321/timeline/arrival-2w/`를 연다.

1. 첫 줄 체크박스를 누른다 → URL이 그대로이고, 체크 표시·제목 취소선·진행 원형 숫자(`1/N`)가 바뀐다.
2. 새로고침 → 체크가 남아 있다.
3. 체크한 줄의 둘째 줄 글자 영역(체크박스 밖)을 누른다 → `/tasks/<id>/`로 이동한다. 뒤로 가기 → 목록 위치로 돌아온다.
4. 내 일정(`/my/`)에서 입국일을 넣고 다시 시기 페이지로 온다 → 안 한 줄에는 마감 칩이 보이고, 체크한 줄에는 칩이 없다.
5. `[확인 필요]`가 든 줄이 있으면 둘째 줄에 노란 배지가 보인다 (찾기: `grep -l "확인 필요" src/content/tasks/*.md`에서 `where`/`deadline`에 든 항목, 그 시기 페이지).
6. 페이지에 가로 스크롤이 없다 (`document.documentElement.scrollWidth <= 375`).
7. `/topics/housing/` → 줄 둘째 줄 앞에 시기 이름이 붙어 있다.
8. `/my/` → 줄 모양이 이전과 같다.

확인 후 `npx astro dev stop`.

- [ ] **Step 7: Commit**

```bash
git add src/components/TaskRow.astro src/components/TaskList.astro src/styles/custom.css
git commit -m "시간순·주제별 체크리스트를 줄 목록으로 변경

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: TaskCard와 죽은 CSS 삭제, 문서 갱신

**Files:**
- Delete: `src/components/TaskCard.astro`
- Modify: `src/styles/custom.css` (약 220–222, 283–292, 333–378, 389–392, 396–432, 546–551행)
- Modify: `CLAUDE.md` (구조 절의 컴포넌트 목록)

**Interfaces:**
- Consumes: Task 1의 `TaskRow` (TaskList가 더 이상 TaskCard를 쓰지 않음)
- Produces: 없음

- [ ] **Step 1: TaskCard 사용처가 없는지 확인**

Run:
```bash
grep -rn "TaskCard" src
```
Expected: `src/components/TaskCard.astro` 자기 자신 외에는 없음.

- [ ] **Step 2: TaskCard 삭제**

```bash
git rm src/components/TaskCard.astro
```

- [ ] **Step 3: 죽은 CSS 삭제**

다른 곳에서 쓰지 않는지 먼저 확인:
```bash
grep -rn "task-card\|task-details\|task-facts\|task-title\|task-deadline\|task-permalink" src --include=*.astro --include=*.ts --include=*.mdx
```
Expected: 결과 없음.

`src/styles/custom.css`에서 아래 규칙 블록을 통째로 지운다.
- `.task-card .sources { margin-top: 1rem; }` (약 220행)
- `.task-card { ... }`, `.task-card:last-of-type { ... }` (약 283–292행)
- `.task-details`, `.task-details summary`, `.task-details summary::-webkit-details-marker`, `.task-details summary > *`, `.task-details summary > .topic-icon`, `.task-details summary::after`, `.task-details[open] summary::after`, `.task-details summary:hover .task-title` (약 333–372행)
- `.task-title { ... }` (약 373–378행)
- `.task-deadline { ... }` (약 389–392행)
- `.task-card.is-done .task-title { ... }` (약 396–400행)
- `.task-facts`, `.task-facts dt`, `.task-facts dd`, `.task-facts ul` (약 401–420행)
- `.task-card .sources { padding-bottom: 1.25rem; }` (약 429–431행)
- `.task-permalink { ... }` (약 546–551행)

이 선택자 목록은 지우지 말고 한 줄로 줄인다 (할 일 페이지가 `.task-body`를 쓴다):
```css
.task-body {
	margin-inline: 0 0.5rem;
}
```
(기존 `.task-body,\n.task-card .sources,\n.task-card .expert-note { margin-inline: 0 0.5rem; }` 블록을 위로 바꾼다.)

**남겨야 하는 것:** `.task-check-wrap`, `.task-check*`, `.task-tag`, `.task-phase`, `.task-body { font-size }`, `.task-body :is(h2, h3)`, `.task-list*`, `.task-step*`, `.task-hint`.

- [ ] **Step 4: 빌드·검사와 할 일 페이지 회귀 확인**

Run:
```bash
npm run build && npm run check && grep -rc "task-card\|task-details" dist/_astro/*.css
```
Expected: build·check 성공, CSS 파일마다 `0`.

`npx astro dev --background` 후 아무 할 일 페이지(`/tasks/<파일명>/`)를 375px에서 열어 본문 소제목·여백이 Task 1 커밋 시점과 같은지 본다(비교용으로 Task 1 Step 6에서 같은 페이지 스크린숏을 남겨 둔다). 파일명은 `ls src/content/tasks`에서 고른다. 확인 후 `npx astro dev stop`.

- [ ] **Step 5: `CLAUDE.md` 구조 절 갱신**

```
- `src/components/` — TaskCard/TaskList/PhasePicker/ProgressBar/Sources/Ja/ExpertNote/VerifyText, `overrides/`는 Starlight 컴포넌트 교체
```
를 아래로 바꾼다 (PhasePicker는 이미 없다):
```
- `src/components/` — TaskRow(체크리스트 한 줄, 내 일정과 같은 마크업)/TaskList/ProgressBar/Sources/Ja/ExpertNote/VerifyText, `overrides/`는 Starlight 컴포넌트 교체
```

- [ ] **Step 6: Commit**

```bash
git add -A src/components/TaskCard.astro src/styles/custom.css CLAUDE.md
git commit -m "아코디언 TaskCard와 쓰지 않는 CSS 삭제

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
