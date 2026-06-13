// 청기백기 게임 규칙/명령 생성기

export type FlagAction = 'blue-up' | 'blue-down' | 'white-up' | 'white-down' | 'hold';

export interface FlagState {
  blue: boolean; // true = 올라감
  white: boolean;
}

export interface Command {
  text: string;
  seq: FlagAction[]; // 순서대로 모두 입력해야 성공 (1개 = 단일, 2개 = 2동작 명령)
}

export const INITIAL_FLAGS: FlagState = { blue: false, white: false };

const FLAG_LABEL = { blue: '청기', white: '백기' } as const;

function moveAction(flag: 'blue' | 'white', up: boolean): FlagAction {
  return `${flag}-${up ? 'up' : 'down'}` as FlagAction;
}

// 현재 상태에서 "상태가 바뀌는" 유효한 이동만 후보로 사용
function validMoves(state: FlagState): { flag: 'blue' | 'white'; up: boolean }[] {
  const moves: { flag: 'blue' | 'white'; up: boolean }[] = [];
  (['blue', 'white'] as const).forEach((flag) => {
    moves.push({ flag, up: !state[flag] });
  });
  return moves;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 난이도 변인 1 — 속도: 2200ms에서 라운드당 45ms 감소, 바닥 900ms
export function roundWindowMs(round: number): number {
  return Math.max(900, 2200 - round * 45);
}

// 2동작 명령은 입력이 2회 필요하므로 제한시간 1.7배
export const DUAL_WINDOW_MULT = 1.7;

export function commandWindowMs(round: number, cmd: Command): number {
  return Math.round(roundWindowMs(round) * (cmd.seq.length >= 2 ? DUAL_WINDOW_MULT : 1));
}

export function applyAction(state: FlagState, action: FlagAction): FlagState {
  switch (action) {
    case 'blue-up': return { ...state, blue: true };
    case 'blue-down': return { ...state, blue: false };
    case 'white-up': return { ...state, white: true };
    case 'white-down': return { ...state, white: false };
    default: return state;
  }
}

// 명령 유형 4종
function singleCommand(moves: ReturnType<typeof validMoves>): Command {
  const m = pick(moves);
  return {
    text: `${FLAG_LABEL[m.flag]} ${m.up ? '올려' : '내려'}`,
    seq: [moveAction(m.flag, m.up)],
  };
}

function negationCommand(moves: ReturnType<typeof validMoves>): Command {
  // "청기 올리지 마" → 가만히
  const m = pick(moves);
  return {
    text: `${FLAG_LABEL[m.flag]} ${m.up ? '올리지 마' : '내리지 마'}`,
    seq: ['hold'],
  };
}

function decoyCommand(moves: ReturnType<typeof validMoves>): Command {
  // "청기 올리지 말고 백기 내려" → 뒷절만 정답
  const decoy = pick(moves);
  const real = pick(moves.filter((m) => m.flag !== decoy.flag));
  return {
    text: `${FLAG_LABEL[decoy.flag]} ${decoy.up ? '올리지' : '내리지'} 말고 ${FLAG_LABEL[real.flag]} ${real.up ? '올려' : '내려'}`,
    seq: [moveAction(real.flag, real.up)],
  };
}

function dualCommand(moves: ReturnType<typeof validMoves>): Command {
  // 난이도 변인 2 — 2동작: "청기 올리고 백기 내려" → 순서대로 둘 다 입력
  const [a, b] = Math.random() < 0.5 ? [moves[0], moves[1]] : [moves[1], moves[0]];
  return {
    text: `${FLAG_LABEL[a.flag]} ${a.up ? '올리고' : '내리고'} ${FLAG_LABEL[b.flag]} ${b.up ? '올려' : '내려'}`,
    seq: [moveAction(a.flag, a.up), moveAction(b.flag, b.up)],
  };
}

// 난이도 티어: R1~5 단순 / R6~12 +부정 / R13~19 +낚시 / R20+ +2동작
export function generateCommand(state: FlagState, round: number): Command {
  const moves = validMoves(state);
  const r = Math.random();

  if (round >= 20) {
    if (r < 0.3) return dualCommand(moves);
    if (r < 0.5) return decoyCommand(moves);
    if (r < 0.7) return negationCommand(moves);
    return singleCommand(moves);
  }
  if (round >= 13) {
    if (r < 0.25) return decoyCommand(moves);
    if (r < 0.5) return negationCommand(moves);
    return singleCommand(moves);
  }
  if (round >= 6) {
    if (r < 0.35) return negationCommand(moves);
    return singleCommand(moves);
  }
  return singleCommand(moves);
}

// ----- 보상 설계 -----

// 일일 최고점수 1회 보너스: 도달한 최고 구간 기준 (하루 동안 증분 수령)
export function scoreBonusFor(best: number): number {
  if (best >= 40) return 5;
  if (best >= 30) return 3;
  if (best >= 20) return 2;
  return 0;
}

export const SCORE_BONUS_TIERS = [
  { rounds: 20, coins: 2 },
  { rounds: 30, coins: 3 },
  { rounds: 40, coins: 5 },
];

// 누적 판수 챌린지 (1회성)
export const CHALLENGES: { plays: number; coins: number }[] = [
  { plays: 10, coins: 5 },
  { plays: 50, coins: 10 },
  { plays: 100, coins: 15 },
  { plays: 300, coins: 30 },
  { plays: 500, coins: 50 },
  { plays: 1000, coins: 100 },
  { plays: 2000, coins: 100 },
  { plays: 3000, coins: 100 },
  { plays: 5000, coins: 100 },
];

// 일일 판수 설계
export const FREE_PLAYS_PER_DAY = 5;
export const AD_PLAYS_PER_DAY = 10;
export const COIN_PLAYS_PER_DAY = 10;
export const COIN_PLAY_COST = 3;

// 주간 랭킹 보상 — 토스포인트(원) 직접 지급. 서버 rewardForRank와 동일 값 유지 (표시용)
export const RANK_REWARDS = [
  { from: 1, to: 1, won: 1000 },
  { from: 2, to: 3, won: 500 },
  { from: 4, to: 5, won: 300 },
  { from: 6, to: 10, won: 100 },
];
