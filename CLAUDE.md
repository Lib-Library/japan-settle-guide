@AGENTS.md

# 일본 정착 기초 가이드

일본 기업에 입사해 처음 일본에 오는 한국인을 위한 시기별 정착 체크리스트. Astro 7 + Starlight 정적 사이트, 한국어 단일 로케일. 콘텐츠 작성 규칙의 원본은 `CONTRIBUTING.md`이며, 아래는 그 요약과 코드 구조다.

## 명령어 (Node >= 22)

- `npm run dev` — 미리보기 (AGENTS.md 지침대로 백그라운드: `astro dev --background`)
- `npm run build` — 정적 빌드(`dist/`). tasks 프론트매터 스키마 위반(출처 0개, 잘못된 phase/topic 등)은 여기서 실패
- `npm run check` — `scripts/check-content.mjs`: `[확인 필요]` 위치, 183일 넘은 `lastVerified`, 출처 없는 topics 페이지, 깨지는 굵게(`**「용어」**를`) 리포트
- 테스트 러너·린터 없음. 검증은 `build` + `check`.

## 구조

- `src/content/tasks/*.md` — 체크리스트 항목(37개). 스키마는 `src/content.config.ts`
- `src/content/docs/` — 홈, `timeline/`(시기 5개), `topics/`(주제 9개), `glossary.mdx`, `about.md`. 모든 페이지에 `lastVerified` 필수
- `src/lib/taxonomy.ts` — PHASES/TOPICS 단일 출처. 새 시기·주제는 여기에 추가 (`work`, `family` 주제는 정의만 있고 항목 없음)
- `src/components/` — TaskRow(체크리스트 한 줄, 내 일정과 같은 마크업. 주제 페이지는 `readonly` 링크 목록)/TaskList/Rows·Row·Stat·TopicTasks(주제 페이지 구성 요소, CONTRIBUTING.md 참고)/ProgressBar/Sources/Ja/ExpertNote/VerifyText, `overrides/`는 Starlight 컴포넌트 교체
- `src/plugins/remark-verify.mjs` — 본문 `[확인 필요]` → 노란 배지 (`astro.config.mjs`에서 unified 처리기로 등록)
- `src/scripts/checklist.ts` — 진행 상황을 localStorage(`jsg:progress:v1`)에 저장. 서버·계정 없음
- 사이드바는 `astro.config.mjs`에 수동 정의(topics만 autogenerate)
- 디자인: KRDS(`krds-uiux`) 토큰(`krds_tokens.css`)을 `customCss`로 불러오고 `src/styles/custom.css`에서 Starlight 변수에 연결. KRDS 토큰은 라이트 전용이라 다크는 같은 팔레트의 어두운 단계로 직접 지정
- `src/pages/tasks/[id].astro` — 할 일 개별 페이지 (URL = tasks 파일명). `src/content/docs/my.mdx` — 내 일정
- `src/lib/due.ts`·`src/lib/ics.ts` — 입국일 마감일 계산·캘린더 파일 (검사: `scripts/check-due.mjs`). tasks의 `due` 필드는 `deadline` 문장의 숫자만 쓴다
- `src/scripts/arrival.ts` — 입국일을 localStorage(`jsg:arrival:v1`)에 저장
- 방문 통계·카드뉴스 링크 규칙: `docs/analytics.md` (토큰은 환경 변수 `PUBLIC_CF_BEACON_TOKEN`)

## 반드시 지킬 규칙

1. **tasks 파일명은 변경 금지.** 파일명이 체크 상태 저장 키다. 영어 소문자·숫자·하이픈만.
2. **제도·금액·기한은 공식 출처(정부·지자체·대사관 등) 링크 필수**, 블로그·커뮤니티 불가. 불확실하면 `[확인 필요]`.
3. 공식 출처와 재대조하면 `lastVerified`를 갱신. 세무·연금·법률 판단이 필요하면 `needsExpert: true`.
4. 서비스·회사 추천은 `**이 사이트의 추천입니다.**`로 명시하고 등록·인가 여부를 적되, 수수료 같은 변동 수치는 쓰지 않는다.
5. 모바일 기준: 3열 이상 표 금지(2열 표·목록 사용), 절차는 번호 목록.
6. 일본어는 `原語(한글 독음)` 형식, 국립국어원 표기법(장음 생략, 어두 か·た행 예사소리, つ→쓰). MDX에서는 `<Ja t="" r="" />`. 새 용어는 `glossary.mdx`에도 추가.
7. `STALE_AFTER_DAYS`(taxonomy.ts)와 `STALE_DAYS`(check-content.mjs)는 같은 값(183)으로 유지.
8. 콘텐츠 변경 후 `npm run build`로 스키마 오류가 없는지 확인한다.

## 알려진 주의점

- 외부 CDN(Pretendard, Google Fonts)에 의존한다 (`astro.config.mjs` head).
- 공유 이미지 `public/og.png`는 `node scripts/make-og.mjs`로 다시 만든다.
