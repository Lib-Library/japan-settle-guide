# 방문 통계와 링크 규칙

## Cloudflare Web Analytics 켜기

1. Cloudflare 대시보드 → Analytics & Logs → Web Analytics → Add a site
2. 호스트 이름에 `japan-settle-guide.lib-library.workers.dev` 입력, 수동 설치(JS snippet) 선택
3. 스니펫의 `token` 값을 복사
4. 사이트를 빌드하는 곳(Cloudflare Workers 빌드 설정)의 환경 변수에 `PUBLIC_CF_BEACON_TOKEN=<복사한 값>` 추가 후 다시 배포

`astro.config.mjs`는 `process.env`를 읽으므로 로컬 `.env` 파일은 적용되지 않는다. 로컬에서 확인하려면 명령 앞에 붙인다: `PUBLIC_CF_BEACON_TOKEN=<값> npm run build`

쿠키를 쓰지 않고, 입국일·체크 내용은 보내지 않는다 (페이지 주소와 유입 경로만).

## 보는 숫자

- 방문자 수 (주 지표): 첫 달 수치를 기준선으로 삼는다.
- 입국일 입력 (실사용 지표): 통계 도구가 입력 자체를 세지 못하므로 `/my/` 방문 수로 대신 본다.

## 인스타 카드뉴스 링크 규칙

링크 끝에 다음을 붙인다. 주제는 영어 소문자·하이픈.

`?utm_source=instagram&utm_medium=social&utm_campaign=<주제>`

예: `https://japan-settle-guide.lib-library.workers.dev/tasks/nenmatsu-chosei/?utm_source=instagram&utm_medium=social&utm_campaign=nenmatsu-2026`
