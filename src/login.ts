import { appLogin } from '@apps-in-toss/framework';
import { loginExchange } from './server';

// 토스 로그인(방식 B) 활성화 플래그.
// 콘솔 토스 로그인 설정(약관 동의·약관 URL 등록·동의 항목·연결끊기 콜백)을
// 완료하고, Cloudflare Worker에서 파트너 API 호출이 정상 동작함을 확인한 뒤 true로 전환.
export const LOGIN_ENABLED = true;

// appLogin으로 인가코드를 받고 서버에서 userKey 교환 + 지갑 복원까지 수행.
// 성공 시 { userKey, coins, totalExchanged } 반환, 실패/취소 시 null.
export async function tossLogin(
  localCoins: number,
  localExchanged: number,
): Promise<{ userKey: string; coins: number; totalExchanged: number } | null> {
  try {
    const { authorizationCode, referrer } = await appLogin();
    return await loginExchange(authorizationCode, referrer, localCoins, localExchanged);
  } catch {
    // 사용자가 로그인 취소
    return null;
  }
}
