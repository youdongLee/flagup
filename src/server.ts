// 랭킹 서버(Cloudflare Worker) API 클라이언트
// 서버 배포 전에는 SERVER_URL을 빈 문자열로 두면 모든 호출이 조용히 비활성화된다.
import { Storage } from '@apps-in-toss/framework';
import { sha256Hex } from './hash';
import { APP_SECRET } from './secret';

export const SERVER_URL = 'https://flagup-api.jameslee0206.workers.dev';

const UUID_KEY = '@flagup/uuid_v1';

export const serverEnabled = () => SERVER_URL.length > 0;

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedUuid: string | null = null;

export async function getUuid(): Promise<string> {
  if (cachedUuid) return cachedUuid;
  const saved = await Storage.getItem(UUID_KEY).catch(() => null);
  if (saved) {
    cachedUuid = saved;
    return saved;
  }
  const fresh = uuidv4();
  cachedUuid = fresh;
  await Storage.setItem(UUID_KEY, fresh).catch(() => {});
  return fresh;
}

// 토스 로그인 시 userKey, 아니면 기기 UUID를 서버 식별자로 사용
const USERKEY_KEY = '@flagup/userkey_v1';

export async function getStoredUserKey(): Promise<string | null> {
  const v = await Storage.getItem(USERKEY_KEY).catch(() => null);
  return v ? v : null;
}

export async function setStoredUserKey(userKey: string): Promise<void> {
  await Storage.setItem(USERKEY_KEY, userKey).catch(() => {});
}

export async function clearStoredUserKey(): Promise<void> {
  await Storage.setItem(USERKEY_KEY, '').catch(() => {});
}

// 서버 요청에 쓰는 활성 식별자: 로그인 시 'u:<userKey>', 아니면 기기 UUID
export async function getActiveId(): Promise<string> {
  const uk = await getStoredUserKey();
  return uk ? `u:${uk}` : getUuid();
}

// 외부 API fetch 표준: AbortController 타임아웃 + 1회 재시도
async function request<T>(path: string, init?: RequestInit, retry = 1): Promise<T | null> {
  if (!serverEnabled()) return null;
  for (let attempt = 0; attempt <= retry; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      // RN 타입 정의와 lib.dom AbortSignal이 충돌하므로 캐스팅
      const res = await fetch(`${SERVER_URL}${path}`, { ...init, signal: ctrl.signal as never });
      clearTimeout(timer);
      if (!res.ok) {
        if (attempt < retry) continue;
        return null;
      }
      return (await res.json()) as T;
    } catch {
      clearTimeout(timer);
      if (attempt < retry) continue;
      return null;
    }
  }
  return null;
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  best: number;
  me?: boolean;
}

export interface LeaderboardResponse {
  week: string;
  entries: LeaderboardEntry[];
  myRank: number | null;
  myBest: number | null;
  totalPlayers: number;
}

export interface SubmitResponse {
  ok: boolean;
  best: number;
  rank: number | null;
  totalPlayers: number;
}

export interface RewardResponse {
  week: string | null;
  rank: number | null;
  amount: number; // 토스포인트 지급액(원)
  claimed: boolean;
}

export function sign(parts: (string | number)[]): string {
  return sha256Hex(`${APP_SECRET}|${parts.join('|')}`);
}

export async function submitScore(
  nickname: string,
  rounds: number,
  reactions: number[],
): Promise<SubmitResponse | null> {
  const uuid = await getActiveId();
  const sig = sign([uuid, rounds, reactions.join(',')]);
  return request<SubmitResponse>('/v1/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, nickname, rounds, reactions, sig }),
  });
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse | null> {
  const uuid = await getActiveId();
  return request<LeaderboardResponse>(`/v1/leaderboard?uuid=${encodeURIComponent(uuid)}`);
}

export async function fetchReward(): Promise<RewardResponse | null> {
  const uuid = await getActiveId();
  return request<RewardResponse>(`/v1/reward?uuid=${encodeURIComponent(uuid)}`);
}

export interface ClaimedReward {
  week: string;
  rank: number;
  amount: number;
}

export async function claimReward(): Promise<{ ok: boolean; total: number; rewards: ClaimedReward[] } | null> {
  const uuid = await getActiveId();
  const sig = sign([uuid, 'claim']);
  return request<{ ok: boolean; total: number; rewards: ClaimedReward[] }>('/v1/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, sig }),
  });
}

// 토스포인트 지급 실패 시 방금 claim한 주를 미수령으로 되돌린다 (재수령 가능)
export async function unclaimReward(weeks: string[]): Promise<void> {
  const uuid = await getActiveId();
  const sig = sign([uuid, 'unclaim']);
  await request('/v1/unclaim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, weeks, sig }),
  });
}

// 이용자 하트비트 — 핑 후 오늘 플레이한 유니크 이용자 수 반환
export async function pingPresence(): Promise<number | null> {
  const uuid = await getActiveId();
  const res = await request<{ ok: boolean; today: number }>('/v1/ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid }),
  });
  return res && res.ok ? res.today : null;
}

// grantPromotionReward는 실패해도 throw하지 않고 결과 객체를 반환한다.
// 성공은 { key } 형태, 실패는 { errorCode, message } / 'ERROR' / undefined.
export function isGrantSuccess(result: unknown): boolean {
  return !!result && typeof result === 'object' && 'key' in (result as object);
}

// ── 토스 로그인(방식 B) ──────────────────────────────────────────
// 인가코드를 서버로 보내 userKey 획득 + 기기 데이터 이관 + 지갑 복원
export async function loginExchange(
  authorizationCode: string,
  referrer: string,
  localCoins: number,
  localExchanged: number,
): Promise<{ userKey: string; coins: number; totalExchanged: number } | null> {
  const deviceId = await getUuid();
  const res = await request<{ ok: boolean; userKey: number; coins: number; totalExchanged: number }>(
    '/v1/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode, referrer, deviceId, localCoins, localExchanged }),
    },
  );
  if (!res || !res.ok) return null;
  await setStoredUserKey(String(res.userKey));
  return { userKey: String(res.userKey), coins: res.coins, totalExchanged: res.totalExchanged };
}

// 코인 잔액을 서버 지갑에 동기화 (로그인 상태에서만 동작, 실패해도 무시)
export async function syncWallet(coins: number, totalExchanged: number): Promise<void> {
  const uk = await getStoredUserKey();
  if (!uk) return;
  const sig = sign([`u:${uk}`, 'wallet', coins]);
  await request('/v1/wallet/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userKey: uk, coins, totalExchanged, sig }),
  });
}
