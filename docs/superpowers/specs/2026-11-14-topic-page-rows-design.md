# 주제 페이지 가독성 개선: 묶음 행·단계·콜아웃

## 배경

주제 페이지 10개(`src/content/docs/topics/`)는 거의 전부 마크다운 목록이다(housing은 103줄 중 목록 41줄, 콜아웃 0개). 반복되는 패턴:

- `- **용어** — 설명` 목록: 초기 비용, 계약서 확인, 생활 규칙, 보험 종류 등. 금액·환불 여부 같은 핵심이 문장 속에 묻힌다.
- 번호 절차: 집 구하는 흐름 7단계, 퇴거 5단계 등
- 대비 구조: 집주인 부담 vs 세입자 부담 등
- 본문에 묻힌 경고: "돌려받지 못합니다", "보험이 아닙니다"
- 체크리스트가 페이지 맨 끝에만 있다

브라우저 목업 비교에서 **C안(요약 숫자 + 의미별로 묶은 2열 행)**으로 결정했다.

## 결정

컴포넌트 4개로 주제 페이지를 다시 구성한다: **할 일 요약 · 단계 · 묶음 행 · 콜아웃**. 단계와 콜아웃은 Starlight 기본(`<Steps>`, `:::tip`/`:::caution`)을 KRDS 색으로 다듬어 쓰고, 새로 만드는 것은 `Rows`·`Row`·`Stat`·`TopicTasks`다. 원고 문법은 자식 컴포넌트 방식이다.

## 컴포넌트

### `Rows` — 묶음 상자 (`src/components/Rows.astro`)

```mdx
<Rows title="돌려받지 못하는 돈" tone="lost">
  <Row ...>...</Row>
</Rows>
```

- `title?: string` — 묶음 머리. 없으면 머리 없는 테두리 상자.
- `tone?: 'back' | 'lost' | 'info'` — 머리 배경색. `back`=성공(`--c-ok-bg`/`--c-ok-fg`), `lost`=위험(`--c-danger-bg`/`--c-danger-fg`), `info`=포인트(`--sl-color-accent-low`/`--sl-color-text-accent`), 없으면 회색(`--sl-color-gray-6`/`--sl-color-white`). 모두 다크 모드 값이 있는 토큰.
- 마크업: `<section class="rows not-content" data-tone>` + 머리 `<p class="rows-title">` + `<ul class="rows-list"><slot /></ul>`. `not-content`로 Starlight 본문 목록·여백 스타일을 막는다.

### `Row` — 행 하나 (`src/components/Row.astro`)

```mdx
<Row t="레이킨" ja="礼金" r="레이킨" value="1~2개월">집주인에게 주는 사례금. **돌려받지 못합니다.**</Row>
```

- `t: string` — 항목 이름(굵게)
- `ja?: string`, `r?: string` — 둘 다 있으면 이름 뒤에 `<Ja t={ja} r={r} />`
- `value?: string` — 오른쪽 강조 값(포인트 색, 줄바꿈 없음)
- `tag?: string` — 오른쪽 작은 태그(`value`와 함께 쓰지 않는다)
- 자식(slot) — 한 줄 요약. 마크다운·링크·`<Ja>`·`[확인 필요]`(배지로 변환됨) 사용 가능.
- 마크업: `<li class="row"><div class="row-main"><span class="row-t">…</span><div class="row-d"><slot /></div></div>{value|tag}</li>`
- 375px에서 이름·설명은 줄바꿈되고 값은 오른쪽에 고정(`flex-shrink: 0`).

### `Stat` — 요약 숫자 상자 (`src/components/Stat.astro`)

```mdx
<Stat value="4~7개월분">집세 기준 · 현금이나 계좌 이체</Stat>
```

- `value: string` 큰 숫자 + 자식 보조 문구. 배경 `--sl-color-accent-low`.

### `TopicTasks` — 할 일 요약 (`src/components/TopicTasks.astro`)

```mdx
<TopicTasks topic="housing" />
```

- props는 `TaskList`와 같다: `topic?` 또는 `phase?` (pre-arrival 주제 페이지는 `phase="pre-arrival"`을 쓴다).
- 같은 필터로 할 일을 모아 "이 주제의 할 일 N개 · M 완료 →" 한 줄 링크를 그린다. `href="#checklist"`.
- 완료 수는 기존 `checklist.ts`가 `[data-progress]` 안의 `[data-progress-done]`을 채우는 방식을 그대로 쓴다(스크립트 수정 없음). 같은 페이지의 TaskList가 `initChecklist()`를 부르므로 따로 스크립트를 넣지 않는다.
- 할 일이 0개면 아무것도 그리지 않는다.
- `TaskList.astro`의 최상위 `div`(시기·주제 두 분기 모두)에 `id="checklist"`를 단다. 한 페이지에 TaskList는 하나다.

### 콜아웃·단계 스타일 (`src/styles/custom.css`)

- 콜아웃(`.starlight-aside`): 왼쪽 4px 굵은 선 + 옅은 배경 + `--radius-xl` 오른쪽 모서리. `tip`=포인트 색, `caution`=경고 색. 제목은 원고에서 `:::caution[보증회사는 보험이 아닙니다]`처럼 준다.
- 단계(`.sl-steps`): 번호 원은 포인트 색 채움 + 흰 숫자, 세로 연결선은 `--sl-color-hairline`. 각 단계는 첫 줄 굵게(원고에서 `**방 찾기**` 다음 줄바꿈 후 보조 설명).

## 콘텐츠 전환 규칙

1. `- **용어** — 설명` 목록 → `Rows`/`Row`. 행 설명은 한 줄 요약, 원래의 긴 설명은 `</Rows>` 아래 본문 문단으로 남긴다(정보를 지우지 않는다).
2. 의미로 나뉘는 목록은 여러 `Rows`로 묶는다(예: 돌려받는 돈 / 돌려받지 못하는 돈 / 매달·그 밖, 집주인 부담 / 세입자 부담). 나눌 기준이 없으면 `title` 없는 `Rows` 하나.
3. 번호 절차 → `<Steps>`로 감싼다.
4. 강조·경고 문장 → `:::tip[…]` / `:::caution[…]`. 한 섹션에 하나 이하로 아낀다.
5. 각 주제 페이지 첫 문단 다음에 `<TopicTasks …/>`.
6. **사실·숫자·출처·`[확인 필요]`·`<Ja>` 표기를 바꾸지 않는다.** 재검증이 아니므로 `lastVerified`는 그대로 둔다.
7. 3열 이상 표 금지(기존 2열 표는 둔다).
8. 계산기 페이지(`initial-cost-calculator.mdx`)는 대상에서 뺀다.

## 단계

1. 컴포넌트 4개 + CSS + `TaskList` id + `housing.mdx` 전환 + CONTRIBUTING.md에 새 문법 안내
2. 나머지 8개 주제 페이지 전환: finance, health-safety, insurance-tax, korea, living, pre-arrival, registration, transport

## 검증

1. `npm run build`, `npm run check` 통과
2. 페이지마다 전환 전후 비교(빌드 HTML 기준): `verify-badge` 개수, 외부 링크(`href="http`) 개수, `ja-term` 개수가 같거나 늘어야 한다. 줄면 정보가 빠진 것.
3. 375px에서 라이트·다크 스크린숏: 행 값이 오른쪽에 붙고 가로 스크롤 없음, 콜아웃·단계 색이 두 테마 모두에서 읽힌다.
4. `/topics/housing/`의 할 일 요약 링크를 누르면 체크리스트로 이동하고, 체크하면 요약의 완료 수가 바뀐다.
