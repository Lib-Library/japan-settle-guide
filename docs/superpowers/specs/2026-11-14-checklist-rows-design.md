# 체크리스트 표시 통일: 아코디언 → 줄 목록

## 배경

같은 할 일이 화면마다 다르게 보인다.

- 내 일정(`MySchedule` + `src/scripts/schedule.ts`): 한 줄(체크·아이콘·제목·기한·칩), 제목을 누르면 `/tasks/[id]/`로 이동
- 시간순·주제별(`TaskList` → `TaskCard`): `<details>` 아코디언 안에 어디서·준비물·본문·출처 전체

아코디언의 문제:

1. 하나만 열어도 목록 흐름(단계·진행 원형)이 화면 밖으로 밀려난다.
2. 펼친 내용이 할 일 개별 페이지의 사본이다. 내 마감일·준비물 체크는 개별 페이지에만 있다.
3. 같은 항목을 눌렀을 때 화면마다 동작(펼침/이동)이 다르다.
4. `#task-id`로 들어와도 펼쳐지지 않는다.

## 결정

시간순·주제별 목록도 내 일정처럼 **줄을 누르면 할 일 개별 페이지로 이동**한다. 아코디언은 없앤다.

## 설계

### 컴포넌트

- `src/components/TaskCard.astro` 삭제, `src/components/TaskRow.astro` 추가. TaskCard 사용처는 `TaskList.astro` 하나다.
- TaskRow는 내 일정의 `.schedule-item` 마크업·CSS 클래스를 재사용한다. 새 CSS는 둘째 줄의 '어디서'와 줄 전체 클릭 영역 정도만 추가한다.
- 줄 구성:
  1. 체크박스: `id="task-{id}"`, `data-task-id={id}`, `aria-label="{제목} 완료 표시"`. 기존과 같아서 `checklist.ts`·저장 키(`jsg:progress:v1`)는 바뀌지 않는다.
  2. `TopicIcon` (size="sm")
  3. 제목 링크 `/tasks/{id}/`, `optional`이면 `선택` 태그
  4. 둘째 줄: `<VerifyText text={deadline} /> · <VerifyText text={where} />`. `showPhase`이면 앞에 시기 이름
  5. 마감일 칩 `data-due-chip` (기존 속성 그대로, `due-chips.ts`가 채운다)와 `→`
- 줄 전체가 링크 영역이다. 제목 링크의 `::after`를 줄 전체로 늘리고, 체크박스는 `position: relative; z-index`로 그 위에 둔다. 터치 영역은 최소 44px.

### 바뀌는 것

- `TaskList.astro`: `TaskCard` → `TaskRow`, 줄을 `<ul class="schedule-list">`로 감싼다(단계 묶음·진행 원형·ProgressBar는 그대로).
- 안내 문구: "항목을 누르면 자세한 내용이 열립니다." → "항목을 누르면 할 일 페이지로 이동합니다."
- 주제 페이지도 같은 TaskList를 쓰므로 함께 줄 목록이 된다.

### 바뀌지 않는 것

- 할 일 개별 페이지(`src/pages/tasks/[id].astro`): 이미 시기·이전/다음 링크가 있다.
- tasks 파일명·스키마·저장 키.
- `schedule.ts`: 내 일정 줄은 그대로 브라우저에서 그린다(마크업 구조만 TaskRow와 맞춘다).

### 하지 않는 것

- 준비물 개수 표시, 미리보기 시트, 예전 `#task-` 앵커 리다이렉트, `#task-id` 자동 펼침.

## 검증

1. `npm run build`, `npm run check` 통과
2. `astro dev --background` 후 375px 폭에서 시기 페이지(`/timeline/arrival-2w/`)와 주제 페이지(`/topics/housing/`) 확인:
   - 체크하면 저장되고 진행 원형·단계 "완료"가 갱신된다
   - 새로고침 후 체크 상태가 남아 있다
   - 줄(체크박스 밖)을 누르면 `/tasks/{id}/`로 이동하고, 체크박스를 누르면 이동하지 않는다
   - 입국일을 넣은 상태에서 마감일 칩이 보인다
   - `[확인 필요]` 배지가 둘째 줄에 보인다
3. 내 일정 화면 모양이 바뀌지 않았다
