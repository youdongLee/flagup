import { Storage } from '@apps-in-toss/framework';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getStoredUserKey, syncWallet } from '../src/server';
import { tossLogin } from '../src/login';
import {
  AD_PLAYS_PER_DAY,
  CHALLENGES,
  COIN_PLAYS_PER_DAY,
  COIN_PLAY_COST,
  FREE_PLAYS_PER_DAY,
  scoreBonusFor,
} from '../data/commands';

// 인앱 재화 "코인" (1코인 = 1원 = 1토스포인트)
// 판당 +1(광고 게이트) / 일일 최고점수 보너스 / 누적 판수 챌린지 / 주간 랭킹 보상
export const EXCHANGE_UNIT = 100; // 100코인 단위 교환
export const DAILY_EXCHANGE_LIMIT = 10; // 하루 최대 교환 횟수

// 광고 프리패스(30일) — 콘솔 등록 상품 (공급가 900원/판매가 990원, 소모품)
export const PASS_ENABLED = true;
export const PASS_SKU = 'ait.0000041597.eeee3c79.5167cf86f1.1248460477';
export const PASS_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type PlaySource = 'free' | 'ad' | 'coin';

interface CoinData {
  coins: number;
  totalExchanged: number;
  exchangeCountDate: string | null;
  exchangeCountToday: number;
}

const DEFAULT_COIN: CoinData = {
  coins: 0,
  totalExchanged: 0,
  exchangeCountDate: null,
  exchangeCountToday: 0,
};

interface DailyData {
  date: string;
  freeUsed: number;
  adUsed: number;
  coinUsed: number;
  bestScore: number;
  scoreBonusClaimed: number; // 오늘 이미 수령한 점수 보너스 코인
}

const defaultDaily = (date: string): DailyData => ({
  date,
  freeUsed: 0,
  adUsed: 0,
  coinUsed: 0,
  bestScore: 0,
  scoreBonusClaimed: 0,
});

interface MetaData {
  totalPlays: number;
  challengesClaimed: number[]; // 수령한 챌린지의 plays 값
  nickname: string;
  passUntil: number; // 0 = 패스 없음
  coinNoticeShown: boolean;
  attendDate: string | null; // 마지막 도장 찍은 날짜 키 (광고 시청 완료)
  attendStreak: number; // 현재 연속 출석 수 (1~7, 7 완료 후 다음날 1로 순환)
  attendClaimDate: string | null; // 마지막 일일 토스포인트(1원) 수령한 날짜 키
  attendBonusPending: boolean; // 7일 연속 달성 보너스(5원) 수령 대기 여부
}

const DEFAULT_META: MetaData = {
  totalPlays: 0,
  challengesClaimed: [],
  nickname: '',
  passUntil: 0,
  coinNoticeShown: false,
  attendDate: null,
  attendStreak: 0,
  attendClaimDate: null,
  attendBonusPending: false,
};

const COINS_KEY = '@flagup/coins_v1';
const DAILY_KEY = '@flagup/daily_v1';
const META_KEY = '@flagup/meta_v1';

// 컨텍스트 상태 로드 전에도 안전하게 닉네임을 읽기 위한 헬퍼 (결과 화면 자동 제출용)
export async function getStoredNickname(): Promise<string> {
  const raw = await Storage.getItem(META_KEY).catch(() => null);
  if (!raw) return '';
  try {
    return (JSON.parse(raw) as MetaData).nickname ?? '';
  } catch {
    return '';
  }
}

export function todayKey(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}

function dayKeyOffset(daysAgo: number): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000 - daysAgo * 24 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}

interface GameContextType {
  // 코인
  coins: number;
  totalExchanged: number;
  exchangeCountToday: number;
  canExchange: boolean;
  addCoins: (n: number) => Promise<void>;
  exchangeCoins: () => Promise<'ok' | 'coins' | 'limit'>;
  // 판수
  freeLeft: number;
  adLeft: number;
  coinLeft: number;
  nextSource: PlaySource | null;
  startPlay: (source: PlaySource) => Promise<boolean>;
  // 기록/보상
  todayBest: number;
  totalPlays: number;
  /** 판 종료 처리 — 최고기록 갱신 시 구간 보너스 차액을 자동 지급하고 지급액을 반환 */
  finishGame: (score: number) => Promise<number>;
  scoreBonusAvailable: number;
  challengesClaimed: number[];
  /** 챌린지 수령 표시 (보상 지급은 화면에서 프로모션으로 처리). 마킹 성공 시 true */
  markChallengeClaimed: (plays: number) => Promise<boolean>;
  // 출석 (광고로 도장 → 도장 눌러 일일 1원 수령 → 7일 연속 시 보너스 5원 별도 CTA)
  attendedToday: boolean; // 오늘 도장 찍음(광고 시청 완료)
  attendClaimedToday: boolean; // 오늘 일일 1원 수령 완료
  attendStreak: number;
  attendBonusAvailable: boolean; // 7일 연속 보너스(5원) 수령 가능
  /** 광고 시청 후 오늘 도장 찍기. 이미 찍었으면 null */
  stampAttendance: () => Promise<{ streak: number } | null>;
  /** 오늘 일일 1원 수령 표시(지급은 화면에서). 7일째면 보너스 대기 활성화. 마킹 성공 시 true */
  markAttendanceClaimed: () => Promise<boolean>;
  /** 7일 연속 보너스(5원) 수령 표시(지급은 화면에서). 마킹 성공 시 true */
  claimAttendanceBonus: () => Promise<boolean>;
  // 프로필/패스
  nickname: string;
  setNickname: (n: string) => Promise<void>;
  hasPass: boolean;
  passUntil: number;
  activatePass: (until: number) => Promise<void>;
  coinNoticeShown: boolean;
  markCoinNoticeShown: () => Promise<void>;
  // 토스 로그인 (방식 B)
  isLoggedIn: boolean;
  loginAndRestore: () => Promise<boolean>;
  // dev
  devAddCoins: (n: number) => Promise<void>;
  devResetDaily: () => Promise<void>;
  devAddTotalPlays: (n: number) => Promise<void>;
  devTogglePass: () => Promise<void>;
  devResetAll: () => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [coinData, setCoinData] = useState<CoinData>(DEFAULT_COIN);
  const [daily, setDaily] = useState<DailyData>(defaultDaily(todayKey()));
  const [meta, setMeta] = useState<MetaData>(DEFAULT_META);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const currentDateKey = useRef(todayKey());

  const loadAll = useCallback(async () => {
    const [cd, dd, md] = await Promise.all([
      Storage.getItem(COINS_KEY).catch(() => null),
      Storage.getItem(DAILY_KEY).catch(() => null),
      Storage.getItem(META_KEY).catch(() => null),
    ]);
    setCoinData(cd ? { ...DEFAULT_COIN, ...JSON.parse(cd) } : DEFAULT_COIN);
    const today = todayKey();
    const parsedDaily: DailyData = dd ? { ...defaultDaily(today), ...JSON.parse(dd) } : defaultDaily(today);
    setDaily(parsedDaily.date === today ? parsedDaily : defaultDaily(today));
    setMeta(md ? { ...DEFAULT_META, ...JSON.parse(md) } : DEFAULT_META);
  }, []);

  useEffect(() => {
    loadAll();
    getStoredUserKey().then((uk) => setIsLoggedIn(!!uk));
    // 60초마다 날짜 변경 감지 → 자정 이후 자동 리셋
    const dateTimer = setInterval(() => {
      const newKey = todayKey();
      if (newKey !== currentDateKey.current) {
        currentDateKey.current = newKey;
        loadAll();
      }
    }, 60_000);
    return () => clearInterval(dateTimer);
  }, [loadAll]);

  // ----- 저장 헬퍼 (항상 스토리지 최신값 기준으로 갱신해 레이스 방지) -----

  const saveCoins = useCallback(async (next: CoinData) => {
    setCoinData(next);
    await Storage.setItem(COINS_KEY, JSON.stringify(next)).catch(() => {});
    // 로그인 상태면 서버 지갑에 동기화 (미로그인 시 no-op, 실패 무시)
    void syncWallet(next.coins, next.totalExchanged);
  }, []);

  const readCoins = useCallback(async (): Promise<CoinData> => {
    const raw = await Storage.getItem(COINS_KEY).catch(() => null);
    return raw ? { ...DEFAULT_COIN, ...JSON.parse(raw) } : DEFAULT_COIN;
  }, []);

  const saveDaily = useCallback(async (next: DailyData) => {
    setDaily(next);
    await Storage.setItem(DAILY_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const readDaily = useCallback(async (): Promise<DailyData> => {
    const raw = await Storage.getItem(DAILY_KEY).catch(() => null);
    const today = todayKey();
    if (!raw) return defaultDaily(today);
    const parsed: DailyData = { ...defaultDaily(today), ...JSON.parse(raw) };
    return parsed.date === today ? parsed : defaultDaily(today);
  }, []);

  const saveMeta = useCallback(async (next: MetaData) => {
    setMeta(next);
    await Storage.setItem(META_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const readMeta = useCallback(async (): Promise<MetaData> => {
    const raw = await Storage.getItem(META_KEY).catch(() => null);
    return raw ? { ...DEFAULT_META, ...JSON.parse(raw) } : DEFAULT_META;
  }, []);

  // ----- 코인 -----

  const addCoins = useCallback(async (n: number) => {
    const cur = await readCoins();
    await saveCoins({ ...cur, coins: Math.max(0, cur.coins + n) });
  }, [readCoins, saveCoins]);

  const exchangeCoins = useCallback(async (): Promise<'ok' | 'coins' | 'limit'> => {
    const cur = await readCoins();
    const day = todayKey();
    const countToday = cur.exchangeCountDate === day ? cur.exchangeCountToday : 0;
    if (cur.coins < EXCHANGE_UNIT) return 'coins';
    if (countToday >= DAILY_EXCHANGE_LIMIT) return 'limit';
    await saveCoins({
      coins: cur.coins - EXCHANGE_UNIT,
      totalExchanged: cur.totalExchanged + EXCHANGE_UNIT,
      exchangeCountDate: day,
      exchangeCountToday: countToday + 1,
    });
    return 'ok';
  }, [readCoins, saveCoins]);

  // ----- 판수 -----

  const freeLeft = Math.max(0, FREE_PLAYS_PER_DAY - daily.freeUsed);
  const adLeft = Math.max(0, AD_PLAYS_PER_DAY - daily.adUsed);
  const coinLeft = Math.max(0, COIN_PLAYS_PER_DAY - daily.coinUsed);
  const nextSource: PlaySource | null = freeLeft > 0 ? 'free' : adLeft > 0 ? 'ad' : coinLeft > 0 ? 'coin' : null;

  const startPlay = useCallback(async (source: PlaySource): Promise<boolean> => {
    const cur = await readDaily();
    if (source === 'free' && cur.freeUsed >= FREE_PLAYS_PER_DAY) return false;
    if (source === 'ad' && cur.adUsed >= AD_PLAYS_PER_DAY) return false;
    if (source === 'coin') {
      if (cur.coinUsed >= COIN_PLAYS_PER_DAY) return false;
      const coins = await readCoins();
      if (coins.coins < COIN_PLAY_COST) return false;
      await saveCoins({ ...coins, coins: coins.coins - COIN_PLAY_COST });
    }
    await saveDaily({
      ...cur,
      freeUsed: cur.freeUsed + (source === 'free' ? 1 : 0),
      adUsed: cur.adUsed + (source === 'ad' ? 1 : 0),
      coinUsed: cur.coinUsed + (source === 'coin' ? 1 : 0),
    });
    const m = await readMeta();
    await saveMeta({ ...m, totalPlays: m.totalPlays + 1 });
    return true;
  }, [readDaily, readCoins, readMeta, saveDaily, saveCoins, saveMeta]);

  // ----- 기록/보상 -----

  // 판 종료 — 최고기록 갱신 + 구간 보너스 차액 자동 지급 (중복 지급은 scoreBonusClaimed 누적으로 차단)
  const finishGame = useCallback(async (score: number): Promise<number> => {
    const cur = await readDaily();
    const newBest = Math.max(cur.bestScore, score);
    const bonus = Math.max(0, scoreBonusFor(newBest) - cur.scoreBonusClaimed);
    await saveDaily({ ...cur, bestScore: newBest, scoreBonusClaimed: cur.scoreBonusClaimed + bonus });
    if (bonus > 0) await addCoins(bonus);
    return bonus;
  }, [readDaily, saveDaily, addCoins]);

  const scoreBonusAvailable = Math.max(0, scoreBonusFor(daily.bestScore) - daily.scoreBonusClaimed);

  // 챌린지 달성 표시만 (토스포인트 지급은 화면에서 프로모션으로). 마킹 성공 시 true
  const markChallengeClaimed = useCallback(async (plays: number): Promise<boolean> => {
    const m = await readMeta();
    const challenge = CHALLENGES.find((c) => c.plays === plays);
    if (!challenge) return false;
    if (m.totalPlays < plays || m.challengesClaimed.includes(plays)) return false;
    await saveMeta({ ...m, challengesClaimed: [...m.challengesClaimed, plays] });
    return true;
  }, [readMeta, saveMeta]);

  // 광고 시청 후 오늘 도장 찍기 — 연속 스트릭 계산
  const stampAttendance = useCallback(async (): Promise<{ streak: number } | null> => {
    const m = await readMeta();
    const today = todayKey();
    if (m.attendDate === today) return null; // 오늘 이미 도장 찍음
    const yesterday = dayKeyOffset(1);
    const streak = m.attendDate === yesterday ? (m.attendStreak >= 7 ? 1 : m.attendStreak + 1) : 1;
    await saveMeta({ ...m, attendDate: today, attendStreak: streak });
    return { streak };
  }, [readMeta, saveMeta]);

  // 오늘 일일 1원 수령 표시. 7일째 수령이면 연속 보너스(5원) 대기 활성화
  const markAttendanceClaimed = useCallback(async (): Promise<boolean> => {
    const m = await readMeta();
    const today = todayKey();
    if (m.attendDate !== today || m.attendClaimDate === today) return false;
    const reachedSeven = m.attendStreak === 7;
    await saveMeta({ ...m, attendClaimDate: today, attendBonusPending: m.attendBonusPending || reachedSeven });
    return true;
  }, [readMeta, saveMeta]);

  // 7일 연속 보너스(5원) 수령 표시
  const claimAttendanceBonus = useCallback(async (): Promise<boolean> => {
    const m = await readMeta();
    if (!m.attendBonusPending) return false;
    await saveMeta({ ...m, attendBonusPending: false });
    return true;
  }, [readMeta, saveMeta]);

  // ----- 프로필/패스 -----

  const setNickname = useCallback(async (n: string) => {
    const m = await readMeta();
    await saveMeta({ ...m, nickname: n.trim().slice(0, 8) });
  }, [readMeta, saveMeta]);

  const activatePass = useCallback(async (until: number) => {
    const m = await readMeta();
    await saveMeta({ ...m, passUntil: until });
  }, [readMeta, saveMeta]);

  const markCoinNoticeShown = useCallback(async () => {
    const m = await readMeta();
    await saveMeta({ ...m, coinNoticeShown: true });
  }, [readMeta, saveMeta]);

  // ----- 토스 로그인 (방식 B) -----

  // 로그인 후 서버 지갑(코인)을 복원해 로컬에 반영. 성공 시 true.
  const loginAndRestore = useCallback(async (): Promise<boolean> => {
    const cur = await readCoins();
    const res = await tossLogin(cur.coins, cur.totalExchanged);
    if (!res) return false;
    await saveCoins({ ...cur, coins: res.coins, totalExchanged: res.totalExchanged });
    setIsLoggedIn(true);
    return true;
  }, [readCoins, saveCoins]);

  // ----- dev -----

  const devAddCoins = useCallback(async (n: number) => addCoins(n), [addCoins]);

  const devResetDaily = useCallback(async () => {
    await saveDaily(defaultDaily(todayKey()));
  }, [saveDaily]);

  const devAddTotalPlays = useCallback(async (n: number) => {
    const m = await readMeta();
    await saveMeta({ ...m, totalPlays: m.totalPlays + n });
  }, [readMeta, saveMeta]);

  const devTogglePass = useCallback(async () => {
    const m = await readMeta();
    await saveMeta({ ...m, passUntil: m.passUntil > Date.now() ? 0 : Date.now() + PASS_DURATION_MS });
  }, [readMeta, saveMeta]);

  const devResetAll = useCallback(async () => {
    await Promise.all([
      Storage.setItem(COINS_KEY, JSON.stringify(DEFAULT_COIN)),
      Storage.setItem(DAILY_KEY, JSON.stringify(defaultDaily(todayKey()))),
      Storage.setItem(META_KEY, JSON.stringify(DEFAULT_META)),
    ]).catch(() => {});
    await loadAll();
  }, [loadAll]);

  const exchangeCountToday = coinData.exchangeCountDate === todayKey() ? coinData.exchangeCountToday : 0;
  const canExchange = coinData.coins >= EXCHANGE_UNIT && exchangeCountToday < DAILY_EXCHANGE_LIMIT;
  const hasPass = meta.passUntil > Date.now();

  return (
    <GameContext.Provider
      value={{
        coins: coinData.coins,
        totalExchanged: coinData.totalExchanged,
        exchangeCountToday,
        canExchange,
        addCoins,
        exchangeCoins,
        freeLeft,
        adLeft,
        coinLeft,
        nextSource,
        startPlay,
        todayBest: daily.bestScore,
        totalPlays: meta.totalPlays,
        finishGame,
        scoreBonusAvailable,
        challengesClaimed: meta.challengesClaimed,
        markChallengeClaimed,
        attendedToday: meta.attendDate === todayKey(),
        attendClaimedToday: meta.attendClaimDate === todayKey(),
        attendStreak:
          meta.attendDate === todayKey()
            ? meta.attendStreak
            : meta.attendDate === dayKeyOffset(1)
            ? (meta.attendStreak >= 7 ? 0 : meta.attendStreak)
            : 0,
        attendBonusAvailable: meta.attendBonusPending,
        stampAttendance,
        markAttendanceClaimed,
        claimAttendanceBonus,
        nickname: meta.nickname,
        setNickname,
        hasPass,
        passUntil: meta.passUntil,
        activatePass,
        coinNoticeShown: meta.coinNoticeShown,
        markCoinNoticeShown,
        isLoggedIn,
        loginAndRestore,
        devAddCoins,
        devResetDaily,
        devAddTotalPlays,
        devTogglePass,
        devResetAll,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
