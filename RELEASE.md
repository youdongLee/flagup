# flagup 출시 가이드 (v1.0.7 기준)

콘솔에 입력할 내용과 남은 작업을 한 곳에 정리. 코드 쪽 준비는 모두 끝났고, 아래 콘솔 작업 후 값만 교체하면 제출 가능.

---

## 1. 앱 정보 등록 (콘솔 입력값)

| 항목 | 값 |
|---|---|
| 앱 이름 (국문) | 청기백기 순발력 랭킹전 ← granite.config.ts와 정확히 일치해야 함 |
| 앱 이름 (영문) | Flag Up Reflex Ranking |
| appName / 스킴 | flagup / `intoss://flagup` |
| 카테고리 | 비게임 (순발력 테스트 / 두뇌 트레이닝 포지셔닝) |
| 아이콘 | ChatGPT 제작본 1024px 업로드 → 발급 URL을 granite.config.ts `brand.icon`에 입력 |
| 썸네일/스크린샷 | `assets/promo/` — thumbnail_1932x828.png + screenshot 1~3 (636x1048) |

**서비스 설명 (예시)**
> "청기 올려! 백기 내리지 마!" 명령에 맞게 깃발을 조작하는 순발력 테스트예요.
> 라운드가 올라갈수록 빨라지는 명령을 버티며 나의 반응속도를 측정하고,
> 매주 초기화되는 주간 랭킹에서 전국 유저들과 순발력을 겨뤄보세요.

**출시 노트 (예시)**
> 청기백기 게임으로 순발력을 테스트하고 주간 랭킹에 도전하는 미니앱입니다.
> 게임 보상으로 코인을 모아 토스포인트로 교환할 수 있고, 누적 도전 챌린지와
> 매주 월요일 정산되는 랭킹 보상을 제공합니다.

**앱 내 기능 (딥링크 등록)**

| 한국어 기능 이름 | 영어 기능 이름 | 이동 URL |
|---|---|---|
| 홈 | Home | `intoss://flagup/` |
| 주간 랭킹 | Weekly Ranking | `intoss://flagup/ranking` |
| 누적 도전 챌린지 | Challenge | `intoss://flagup/challenge` |
| 코인 교환소 | Coin Exchange | `intoss://flagup/exchange` |
| 광고 프리패스 | Ad-Free Pass | `intoss://flagup/pass` |

## 2. 광고 그룹 6개 발급 → `data/ads.ts` 교체

| 상수 | 유형 | 위치 |
|---|---|---|
| BANNER_HOME | 배너 | 홈 상단 고정 |
| BANNER_SUB | 배너 | 랭킹/결과/교환/챌린지 상단 공유 |
| IMAGE_AD | 이미지 | 게임 준비 화면·홈 하단·교환소 하단 |
| AD_COIN_IDS | 보상형 | 게임 후 코인 받기 (핵심 슬롯) |
| AD_PLAY_IDS | 보상형 | 판 충전 (+1판) |
| AD_REVIVE_IDS | 보상형 | 이어하기 (5라운드 이상 탈락 시) |
| AD_ATTEND_IDS | 보상형 | 출석 도장 |
| AD_CHALLENGE_IDS | 보상형 | 챌린지 보상 |

## 3. 프로모션 2개 등록 → `data/ads.ts` 교체

비즈월렛 충전 후 콘솔에 **2개** 등록(검토 2~3일). 각각 `TEST_{코드}`로 샌드박스 검증 후 라이브 코드 교체 → 재빌드.

콘솔에 **프로모션 3개** 등록(전부 토스포인트 직접 지급).

**3-1. 코인 교환용 → PROMO_EXCHANGE** (지급 100원)

**3-1b. 출석용 → PROMO_ATTENDANCE** (가변: 1원 / 연속보너스 5원, 1회 최대 ≥5원 설정)

**3-1c. 챌린지용 → PROMO_CHALLENGE** (가변: 1~100원 랜덤, 1회 최대 ≥100원 설정)

**3-2. 주간 랭킹 보상 → 인앱 코인 (프로모션 아님)**

- 정책상 프로모션으로 랭킹 보상 적용 불가 → **인앱 코인으로 지급**(별도 프로모션 코드 불필요).
- 1위 300코인 / 2~3위 200코인 / 4~10위 100코인. 서버 정산 후 랭킹 화면 "받기"로 수령 → addCoins.
- 즉 랭킹 보상에는 콘솔 작업이 없음.

> 서버 정산 보상표(server/src/index.js `rewardForRank`)와 앱 표시(data/commands.ts `RANK_REWARDS`)는 항상 동일하게 유지: 1위 1000 / 2~3위 500 / 4~5위 300 / 6~10위 100원.

## 4. 인앱결제 (등록 완료)

- SKU: `ait.0000041597.eeee3c79.5167cf86f1.1248460477` (코드 반영 완료, PASS_ENABLED=true)
- 상품: 광고 프리패스 30일 / 소모품 / 공급가 900원(판매가 990원) / 이미지 `assets/promo/iap_pass30_1024.png`
- **샌드박스 필수 테스트 3종** (콘솔에서 상품 노출 ON 필요):
  1. 결제 성공 → 패스 활성 + 결과화면 "+1코인 바로 받기 ⚡" 확인
  2. 결제 후 지급 실패 → 재진입 → /pass "구매 복원" 동작
  3. 결제 취소/네트워크 오류 → 에러 처리 확인

## 5. 출시 직전 코드 체크리스트

- [x] granite.config.ts `brand.icon` URL 입력 완료 (static.toss.im/.../2eb0e5f5...png)
- [x] data/ads.ts 광고 ID 적용 완료 (배너 fb1d821a / 이미지 299b4337 / 리워드 4fc4c32a, 유형별 공유)
- [ ] data/ads.ts PROMO_EXCHANGE/ATTENDANCE/CHALLENGE (3개) 라이브 코드 교체 — 랭킹은 코인 지급이라 프로모션 불필요
- [ ] **pages/dev.tsx "패스 토글" 버튼 제거** (현재 보류 중 — 무료 패스 우회 경로)
- [ ] **src/secret.ts 존재 확인** (git 미커밋. 없으면 빌드 실패 — src/secret.example.ts 복사 후 값 입력, 서버 wrangler secret APP_SECRET과 동일)
- [ ] package.json 버전 범프 후 `npx ait build` (npm run build 금지 — exit 48 환경 이슈)
- [ ] npm install 재실행했다면 Windows 패치 2종 재적용 (plugin-micro-frontend / plugin-compat)

## 5-1. 토스 로그인 (방식 B 진행 중)

- 동의문 2종은 Worker가 호스팅 (콘솔 토스 로그인 > 약관 등록 URL에 입력):
  - 서비스 이용약관: `https://flagup-api.jameslee0206.workers.dev/terms`
  - 개인정보 수집·이용 동의: `https://flagup-api.jameslee0206.workers.dev/privacy`
  - ⚠️ server/src/legal.js 의 운영자명([운영자명])을 실제 사업자명으로 교체 + 출시 전 법률 검토 권장
- 토스 필수 약관(서비스 약관/개인정보 제3자 제공)은 콘솔에서 자동 포함
- 동의 항목은 최소(userKey만)로 — userKey는 비암호화 반환이라 복호화 키/PII 불필요
- **구현 완료(코드), 활성화 대기**: 클라이언트 appLogin→Worker(/v1/login: 토큰교환→userKey→기기데이터 이관→지갑 복원), 코인 서버 동기화(/v1/wallet/sync), 랭킹 식별자 userKey 전환. 교환 화면에 로그인 게이트.
- **활성화 방법**: ① 콘솔 토스 로그인 설정(약관 동의·위 약관 URL 등록·동의항목·연결끊기 콜백) ② `src/login.ts`의 `LOGIN_ENABLED = true` ③ 재빌드 ④ 토스앱(QR)으로 실제 로그인 테스트
- CF Worker→토스 파트너 API 도달성·**mTLS 핸드셰이크 확인됨**(bogus 코드 502 응답). 실제 인가코드 검증만 콘솔 토스로그인 설정 + LOGIN_ENABLED=true 후 토스앱 QR로 가능
- **mTLS 적용 완료**: 콘솔 발급 인증서를 Cloudflare에 업로드(`wrangler mtls-certificate`, ID 4ee7ad82…) → wrangler.toml `[[mtls_certificates]]` 바인딩(TOSS_CERT) → Worker가 `env.TOSS_CERT.fetch`로 토스 호출. 인증서 만료 2027-07-10(전 재발급·재업로드 필요)
- ⚠️ 다기기 코인: 로그인 시 max(서버,로컬) 복원 / 이후 last-write-wins 동기화. 동시 멀티기기 플레이 시 일부 손실 가능(단일 사용자 가정, 교환 한도로 영향 제한)

## 6. 서버 (배포 완료 — 추가 작업 없음)

- API: `https://flagup-api.jameslee0206.workers.dev` (src/server.ts 반영됨)
- 정산 크론: 매주 월요일 00:00 KST 자동
- 상태 점검: `python -X utf8 server/test_e2e.py` (실행 후 D1에서 test-e2e-% 행 삭제)
- 대시보드: dash.cloudflare.com → Workers & Pages → flagup-api
