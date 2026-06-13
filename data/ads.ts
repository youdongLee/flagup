// 광고 ID / 프로모션 코드 모음
// TODO: 콘솔 등록 후 전부 실제 값으로 교체할 것 (플레이스홀더 상태로 제출 금지)

// 배너 (InlineAd)
export const BANNER_HOME = 'ait.v2.live.PLACEHOLDER_BANNER_HOME';
export const BANNER_SUB = 'ait.v2.live.PLACEHOLDER_BANNER_SUB'; // 랭킹/결과/교환 공유

// 이미지 광고 (InlineAd) — 게임 준비 화면/교환소 하단
export const IMAGE_AD = 'ait.v2.live.PLACEHOLDER_IMAGE';

// 보상형 광고 풀 (슬롯별 폴백 체인)
export const AD_COIN_IDS = ['ait.v2.live.PLACEHOLDER_REWARD_COIN']; // 게임 후 코인 받기
export const AD_PLAY_IDS = ['ait.v2.live.PLACEHOLDER_REWARD_PLAY']; // 판 충전
export const AD_REVIVE_IDS = ['ait.v2.live.PLACEHOLDER_REWARD_REVIVE']; // 이어하기

// 코인 → 토스포인트 교환 프로모션 코드 (콘솔 발급 후 교체, TEST_ prefix로 테스트)
export const PROMO_EXCHANGE = 'TEST_PLACEHOLDER_PROMO_EXCHANGE';

// 주간 랭킹 보상 토스포인트 직접 지급 프로모션 코드 (순위 구간별 4개, 교환과 별개로 콘솔 등록)
export const PROMO_RANK_1 = 'TEST_PLACEHOLDER_PROMO_RANK_1'; // 1위 1,000원
export const PROMO_RANK_2_3 = 'TEST_PLACEHOLDER_PROMO_RANK_2_3'; // 2~3위 500원
export const PROMO_RANK_4_5 = 'TEST_PLACEHOLDER_PROMO_RANK_4_5'; // 4~5위 300원
export const PROMO_RANK_6_10 = 'TEST_PLACEHOLDER_PROMO_RANK_6_10'; // 6~10위 100원

// 순위 → 해당 구간 프로모션 코드 (server rewardForRank 티어와 동일하게 유지)
export function rankPromoCode(rank: number): string {
  if (rank === 1) return PROMO_RANK_1;
  if (rank <= 3) return PROMO_RANK_2_3;
  if (rank <= 5) return PROMO_RANK_4_5;
  return PROMO_RANK_6_10; // 6~10위
}
