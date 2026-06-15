// 광고 ID / 프로모션 코드 모음
// 광고는 콘솔 발급 ID 3종(배너/이미지/리워드)을 유형별 슬롯에 공유 사용
const BANNER_AD = 'ait.v2.live.fb1d821a86fa4fd4';
const IMAGE_AD_ID = 'ait.v2.live.299b43376efc4243';
const REWARD_AD = 'ait.v2.live.4fc4c32acf7641af';

// 배너 (InlineAd)
export const BANNER_HOME = BANNER_AD;
export const BANNER_SUB = BANNER_AD; // 랭킹/결과/교환/챌린지 공유

// 이미지 광고 (InlineAd) — 게임 준비 화면/홈/교환소/출석 하단
export const IMAGE_AD = IMAGE_AD_ID;

// 보상형 광고 풀 (슬롯별 폴백 체인) — 단일 리워드 ID 공유
export const AD_COIN_IDS = [REWARD_AD]; // 게임 후 코인 받기
export const AD_PLAY_IDS = [REWARD_AD]; // 판 충전
export const AD_REVIVE_IDS = [REWARD_AD]; // 이어하기
export const AD_ATTEND_IDS = [REWARD_AD]; // 출석 도장
export const AD_CHALLENGE_IDS = [REWARD_AD]; // 챌린지 보상

// 토스포인트 지급 프로모션 코드 (콘솔 발급 후 교체, TEST_ prefix로 테스트)
// ※ 랭킹 보상은 프로모션이 아니라 인앱 코인으로 지급하므로 별도 코드 없음
export const PROMO_EXCHANGE = 'TEST_PLACEHOLDER_PROMO_EXCHANGE'; // 코인 교환 (100원)
export const PROMO_ATTENDANCE = 'TEST_PLACEHOLDER_PROMO_ATTENDANCE'; // 출석 (1원, 연속보너스 5원) — 가변 amount
export const PROMO_CHALLENGE = 'TEST_PLACEHOLDER_PROMO_CHALLENGE'; // 누적 챌린지 (최대 100원) — 가변 amount
