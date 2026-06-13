# flagup 랭킹 서버 (Cloudflare Workers + D1)

주간 랭킹 점수 제출/조회/보상 정산 API. 무료 플랜으로 운영 가능 (상업적 이용 허용, 일 10만 요청).

## 배포 절차 (최초 1회)

```bash
cd server

# 1. wrangler 설치 + 로그인 (브라우저 열림)
npm install -g wrangler
wrangler login

# 2. D1 데이터베이스 생성 → 출력된 database_id를 wrangler.toml에 붙여넣기
wrangler d1 create flagup

# 3. 스키마 적용
wrangler d1 execute flagup --remote --file=./schema.sql

# 4. 앱 서명 시크릿 등록 — 값은 앱의 src/secret.ts APP_SECRET과 정확히 일치해야 함
#    (src/secret.ts 는 git 미커밋 파일. 프롬프트에 그 값을 그대로 입력)
wrangler secret put APP_SECRET

# 5. 배포 → 출력된 URL (https://flagup-api.<계정>.workers.dev)을
#    앱의 src/server.ts SERVER_URL에 입력 후 앱 재빌드
wrangler deploy
```

## 동작 확인

```bash
curl https://flagup-api.<계정>.workers.dev/          # {"ok":true,"service":"flagup-api"}
curl "https://flagup-api.<계정>.workers.dev/v1/leaderboard?uuid=test"
```

## 정산

- 매주 월요일 00:00 KST (크론 `0 15 * * 0` UTC)에 지난주 TOP 10 보상을 rewards 테이블에 기록
- 보상: 1위 300코인 / 2~3위 200 / 4~10위 100 (앱 `data/commands.ts` RANK_REWARDS와 동일하게 유지할 것)
- 유저가 앱에서 랭킹 화면 진입 시 미수령 보상을 조회·수령 (`/v1/reward` → `/v1/claim`)
- 수동 정산이 필요하면: `wrangler d1 execute flagup --remote --command "SELECT ..."` 으로 확인 후 크론 로직 참고

## 치팅 검증 (POST /v1/score)

- 서명: `sha256(APP_SECRET|uuid|rounds|reactions.join(','))`
- 라운드별 반응시간 배열 검증: 범위 80~6000ms, 10라운드 이상일 때 평균 ≥180ms, 표준편차 ≥8ms, 150ms 미만 비율 ≤30%
- 제출 빈도: 일 40회, 최소 간격 4초
- 의심 기록 수동 삭제: `DELETE FROM scores WHERE week='...' AND uuid='...'`
