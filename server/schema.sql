-- flagup 주간 랭킹 스키마
CREATE TABLE IF NOT EXISTS scores (
  week TEXT NOT NULL,           -- 주 시작(월요일, KST) 날짜 'YYYY-MM-DD'
  uuid TEXT NOT NULL,
  nickname TEXT NOT NULL,
  best INTEGER NOT NULL,        -- 주간 최고 라운드
  avg_react INTEGER NOT NULL DEFAULT 0, -- 최고 기록 당시 평균 반응(ms)
  updated_at INTEGER NOT NULL,  -- epoch ms (동점 시 먼저 달성한 쪽이 상위)
  PRIMARY KEY (week, uuid)
);
CREATE INDEX IF NOT EXISTS idx_scores_week_best ON scores (week, best DESC, updated_at ASC);

CREATE TABLE IF NOT EXISTS rewards (
  week TEXT NOT NULL,
  uuid TEXT NOT NULL,
  rank INTEGER NOT NULL,
  amount INTEGER NOT NULL, -- 토스포인트 지급액(원)
  claimed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (week, uuid)
);

-- 토스 로그인(방식 B) 지갑: 코인 잔액을 userKey 기준으로 보관해 기기 변경 시 복원
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,             -- 'u:' + userKey
  coins INTEGER NOT NULL DEFAULT 0,
  total_exchanged INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

-- 오늘 플레이한 유니크 이용자 수 집계 (하트비트). day(KST) 기준 distinct id
CREATE TABLE IF NOT EXISTS daily_players (
  day TEXT NOT NULL,
  id TEXT NOT NULL,
  PRIMARY KEY (day, id)
);

CREATE TABLE IF NOT EXISTS rl (
  uuid TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_ts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uuid, day)
);
