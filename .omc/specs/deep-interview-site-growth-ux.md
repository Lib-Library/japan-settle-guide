# Deep Interview Spec: 기존 콘텐츠 활용형 유입·실사용 전략

## Metadata
- Interview ID: di-2026-11-08-jsg-growth
- Rounds: 4 (+ Round 0)
- Final Ambiguity Score: 19.75%
- Type: brownfield
- Generated: 2026-11-08
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: yes (이전 분석 ①②③)
- Status: PASSED — pending approval

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 0.35 | 0.315 |
| Constraint Clarity | 0.80 | 0.25 | 0.200 |
| Success Criteria | 0.70 | 0.25 | 0.175 |
| Context Clarity | 0.75 | 0.15 | 0.1125 |
| **Total Clarity** | | | **0.8025** |
| **Ambiguity** | | | **0.1975** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| 측정 | active | 방문자 수·유입 경로·입국일 입력 비율 측정 | AC 1–3 |
| 검색 유입 | active | 할 일별 개별 페이지, robots.txt, 검색엔진 등록 | AC 4–7 |
| 다시 쓰게 만드는 도구 | active | 입국일 기반 일정표, 할 일 페이지 내 입력칸, 캘린더 추가 | AC 8–13 |
| 새 콘텐츠 | deferred | 서류 읽는 법, 회사 생활·가족 동반, 월별 할 일, 2~3년 차 등 | 2026-11-08 사용자 결정: "새 콘텐츠는 홀드, 기존 콘텐츠를 UX/UI로 잘 보여주고 실제 사용을 유도하는 것이 주요 전략" |

## Goal
새 콘텐츠를 만들지 않고, 이미 있는 할 일 37개·초기비용 계산기·용어집을 **검색으로 찾을 수 있게 하고 (방문자 수)**, 들어온 사람이 **입국일을 입력해 자기 일정표로 쓰게 만든다 (실사용)**.

## Constraints
- 정적 사이트 유지. 서버·계정·이메일 없음. 개인 데이터는 브라우저(localStorage)에만 저장.
- 정보는 공식 출처만. 새 글 작성은 이번 범위 밖.
- 모바일 우선. 3열 이상 표 금지, 절차는 번호 목록 (CLAUDE.md 규칙 5).
- tasks 파일명 변경 금지 (진행 상황 저장 키). 기존 `jsg:progress:v1` 데이터는 유지.
- 시즌 콘텐츠는 인스타 카드뉴스로 사이트 밖에서 운영. 사이트는 카드뉴스 링크가 도착할 페이지만 책임진다.

## Non-Goals
- 새 콘텐츠 작성 (서류 시리즈, work/family 주제 채우기, 월별 할 일, 2~3년 차)
- 게시판·후기·질문 코너
- 회원가입, 앱 푸시 알림, 기기 간 동기화 서버
- 이메일 구독

## Success Metrics
1. **방문자 수 (주 지표):** 측정 시작 후 첫 달 수치를 기준선으로 삼고 월별 증가 추세를 본다. 목표치는 기준선 확보 후 정한다.
2. **입국일 입력 비율 (실사용 지표):** 방문자 중 입국일을 입력한 비율.

## Acceptance Criteria
측정
- [ ] 1. 쿠키 없는 방문 통계(예: Cloudflare Web Analytics)가 전 페이지에 적용되어 방문자 수와 유입 경로를 볼 수 있다.
- [ ] 2. 입국일 입력 횟수를 개인 식별 없이 셀 수 있다 (통계 도구의 이벤트/페이지뷰 등 정적 사이트에서 가능한 방식).
- [ ] 3. 인스타 카드뉴스 링크에 붙일 유입 표시 규칙(UTM 등)이 문서화되어 있다.

검색 유입
- [ ] 4. 할 일 37개가 각각 고유 URL을 가진 개별 페이지로 생성된다 (기존 tasks 컬렉션에서 생성, 파일명 = slug).
- [ ] 5. 각 페이지에 검색어에 맞는 title·description이 있고, 시기·주제 페이지와 서로 링크된다.
- [ ] 6. `robots.txt`가 사이트맵 위치를 알린다. 개별 페이지가 사이트맵에 포함된다.
- [ ] 7. 링크 공유 시 미리보기(제목·설명·이미지)가 표시된다.

다시 쓰게 만드는 도구
- [ ] 8. 입국일을 입력하면 기한이 있는 할 일마다 실제 날짜와 남은 일수가 표시된다.
- [ ] 9. 입국일 입력칸이 홈과 **각 할 일 페이지**에 있고, 어디서 입력해도 같은 값이 저장된다.
- [ ] 10. 입국일을 넣으면 "이번 주 할 일 / 지난 기한" 중심의 내 일정 화면을 볼 수 있다.
- [ ] 11. 마감일을 휴대폰 캘린더에 추가할 수 있다 (.ics 파일 생성, 서버 없이).
- [ ] 12. 기존 체크 진행 상황(`jsg:progress:v1`)이 그대로 유지된다.
- [ ] 13. 기한을 날짜로 계산할 수 없는 할 일("회사 안내에 따름" 등)은 날짜를 지어내지 않고 원래 문구를 보여 준다.
- [ ] 14. `npm run build`, `npm run check` 통과.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 재방문이 핵심 지표다 | 3개월 뒤 볼 숫자 하나는? | 방문자 수가 주 지표. 재방문 도구는 실사용 지표로 보조 |
| 새 콘텐츠(서류 시리즈)가 최우선이다 | 누가 얼마나 쓸 수 있나? | 새 콘텐츠 보류. 기존 콘텐츠 UX와 사용 유도에 집중 |
| "실제 사용"의 의미 | 하나만 하고 나간다면? | 입국일 입력 |
| 입국일 입력은 홈에서 한다 | 검색 유입자는 홈을 안 본다면? | 할 일 페이지에도 입력칸 |
| 검색엔진 설정이 전부 빠져 있다 | 코드 확인 | 사이트맵은 이미 생성됨. robots.txt와 검색엔진 등록만 없음 |

## Technical Context
- `src/content/tasks/*.md` 37개. 스키마 `src/content.config.ts`: `deadline`은 자유 문자열(`z.string()`) → 날짜 계산을 하려면 **구조화된 기한 필드**(예: 기준 이벤트 + 일수)를 추가해야 함. 기존 문자열은 표시용으로 유지.
- 개별 task 라우트 없음 (`src/pages/` 없음). Starlight 위에 Astro 동적 라우트로 생성 필요.
- Starlight가 `site` 설정으로 sitemap 생성 중. `public/`에는 `favicon.svg`만 있음 (robots.txt 없음).
- 진행 상황: `src/scripts/checklist.ts`, localStorage `jsg:progress:v1`. 입국일도 같은 방식으로 저장 가능.
- 공유 이미지 생성 선례: `src/scripts/cost-share-image.ts` (초기비용 계산기).
- 배포: Cloudflare Workers (`japan-settle-guide.lib-library.workers.dev`).

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| 할 일(Task) | core domain | title, phase, topic, deadline(문구), 기한 규칙(신규), sources | 시기·주제에 속함, 개별 페이지를 가짐 |
| 입국일(ArrivalDate) | core domain | date (localStorage) | 할 일 기한을 실제 날짜로 바꿈 |
| 내 일정(Schedule) | supporting | 이번 주·지난 기한·남은 일수 | 입국일 + 할 일에서 계산 |
| 할 일 페이지(TaskPage) | supporting | URL, 메타, 입력칸 | 검색 유입의 도착지 |
| 캘린더 파일(ICS) | supporting | 마감일 이벤트 | 내 일정에서 생성 |
| 방문 통계(Analytics) | external system | 방문자 수, 유입 경로, 입국일 입력 수 | 성공 지표 측정 |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 4 | 4 | - | - | - |
| 2 | 4 | 0 | 0 | 4 | 100% |
| 3 | 5 | 1 (입국일) | 0 | 4 | 80% |
| 4 | 6 | 1 (할 일 페이지) | 0 | 5 | 83% |

## Interview Transcript
<details>
<summary>Q&A (Round 0–4)</summary>

- **R0** 4개 묶음(측정/검색 유입/도구/새 콘텐츠)? → 맞아요
- **R1** 3개월 뒤 볼 숫자 하나? → 방문자 수 (모호도 37.5%)
- **R2** 새 글 제작 여력? → 새 콘텐츠 홀드, 기존 콘텐츠를 UX/UI로 잘 보여주고 실제 사용 유도가 주요 전략 (33%)
- **R3** "실제로 썼다"의 행동? → 입국일 입력 (23%)
- **R4** (반대로 생각하기) 검색으로 할 일 페이지에 바로 온 사람은? → 할 일 페이지에도 입력칸 (19.75%)
</details>
