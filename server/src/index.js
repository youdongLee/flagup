// flagup 주간 랭킹 API — Cloudflare Workers + D1
// 엔드포인트:
//   POST /v1/score        점수 제출 (서명 + 타당성 검증)
//   GET  /v1/leaderboard  이번 주 TOP 50 + 내 순위
//   GET  /v1/reward       미수령 랭킹 보상 조회
//   POST /v1/claim        랭킹 보상 수령 처리 (claimed 마킹 + amount/weeks 반환)
//   POST /v1/unclaim      지급 실패 롤백 (방금 claim한 weeks만 미수령 복구)
//   GET  /terms /privacy  토스 로그인 약관 동의문 (콘솔 약관 URL로 등록)
// 크론: 매주 월요일 00:00 KST 지난주 TOP 10 정산

import { TERMS_HTML, PRIVACY_HTML } from './legal.js';

const TOP_N = 50;
const DAILY_SUBMIT_LIMIT = 40; // 일 최대 25판 + 여유

// 랭킹 정렬: 라운드 ↓ → 평균 반응속도 ↑(빠른 쪽) → 먼저 도달. 순발력 게임 동점 처리.
const RANK_ORDER = 'best DESC, avg_react ASC, updated_at ASC';
// 위 정렬과 정확히 일치하는 "나보다 앞선 사람 수" 카운트 (best, best, avg_react, best, avg_react, updated_at 순 바인딩)
const rankAheadSql =
  'SELECT COUNT(*) AS ahead FROM scores WHERE week = ? AND (' +
  'best > ? OR ' +
  '(best = ? AND avg_react < ?) OR ' +
  '(best = ? AND avg_react = ? AND updated_at < ?))';
const MIN_SUBMIT_GAP_MS = 4000;
const MAX_ROUNDS = 200;
const REACTION_MIN = 80;
const REACTION_MAX = 6000;

// 토스 로그인(방식 B) 파트너 API
const TOSS_API = 'https://apps-in-toss-api.toss.im';

// 주간 보상표 — 토스포인트(원) 직접 지급액. 앱 data/commands.ts RANK_REWARDS와 동일하게 유지
function rewardForRank(rank) {
  if (rank === 1) return 1000;
  if (rank <= 3) return 500;
  if (rank <= 5) return 300;
  if (rank <= 10) return 100;
  return 0;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function html(body) {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function sha256Hex(message) {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// KST 기준 날짜/주 키
function kstDate(now = Date.now()) {
  return new Date(now + 9 * 60 * 60 * 1000);
}

function dayKey(now = Date.now()) {
  const d = kstDate(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function weekKey(now = Date.now()) {
  const d = kstDate(now);
  const dow = (d.getUTCDay() + 6) % 7; // 월=0
  const mon = new Date(d.getTime() - dow * 86400000);
  return `${mon.getUTCFullYear()}-${String(mon.getUTCMonth() + 1).padStart(2, '0')}-${String(mon.getUTCDate()).padStart(2, '0')}`;
}

function prevWeekKey(now = Date.now()) {
  return weekKey(now - 7 * 86400000);
}

// 반응시간 타당성 검증 — 봇/위조 제출 차단
function validateReactions(rounds, reactions) {
  if (!Array.isArray(reactions) || reactions.length !== rounds) return '반응 데이터 불일치';
  for (const r of reactions) {
    if (!Number.isInteger(r) || r < REACTION_MIN || r > REACTION_MAX) return '반응시간 범위 오류';
  }
  if (rounds >= 10) {
    const avg = reactions.reduce((a, b) => a + b, 0) / rounds;
    if (avg < 180) return '평균 반응 비정상';
    const variance = reactions.reduce((a, b) => a + (b - avg) ** 2, 0) / rounds;
    if (Math.sqrt(variance) < 8) return '반응 분산 비정상';
    const tooFast = reactions.filter((r) => r < 150).length;
    if (tooFast / rounds > 0.3) return '반응 분포 비정상';
  }
  return null;
}

async function handleScore(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad json' }, 400);
  }
  const { uuid, nickname, rounds, reactions, sig } = body ?? {};
  if (typeof uuid !== 'string' || uuid.length < 16 || uuid.length > 64) return json({ ok: false }, 400);
  if (typeof nickname !== 'string' || nickname.length < 1 || nickname.length > 16) return json({ ok: false }, 400);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > MAX_ROUNDS) return json({ ok: false }, 400);

  const expected = await sha256Hex(`${env.APP_SECRET}|${uuid}|${rounds}|${(reactions ?? []).join(',')}`);
  if (sig !== expected) return json({ ok: false, error: 'bad sig' }, 403);

  const invalid = validateReactions(rounds, reactions);
  if (invalid) return json({ ok: false, error: invalid }, 422);

  const now = Date.now();
  const day = dayKey(now);

  // 제출 빈도 제한
  const rl = await env.DB.prepare('SELECT count, last_ts FROM rl WHERE uuid = ? AND day = ?')
    .bind(uuid, day)
    .first();
  if (rl) {
    if (rl.count >= DAILY_SUBMIT_LIMIT) return json({ ok: false, error: 'rate limit' }, 429);
    if (now - rl.last_ts < MIN_SUBMIT_GAP_MS) return json({ ok: false, error: 'too fast' }, 429);
    await env.DB.prepare('UPDATE rl SET count = count + 1, last_ts = ? WHERE uuid = ? AND day = ?')
      .bind(now, uuid, day)
      .run();
  } else {
    await env.DB.prepare('INSERT INTO rl (uuid, day, count, last_ts) VALUES (?, ?, 1, ?)')
      .bind(uuid, day, now)
      .run();
  }

  const week = weekKey(now);
  const avgReact = Math.round(reactions.reduce((a, b) => a + b, 0) / rounds);

  const existing = await env.DB.prepare('SELECT best FROM scores WHERE week = ? AND uuid = ?')
    .bind(week, uuid)
    .first();

  if (!existing) {
    await env.DB.prepare(
      'INSERT INTO scores (week, uuid, nickname, best, avg_react, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(week, uuid, nickname, rounds, avgReact, now)
      .run();
  } else if (rounds > existing.best) {
    await env.DB.prepare(
      'UPDATE scores SET nickname = ?, best = ?, avg_react = ?, updated_at = ? WHERE week = ? AND uuid = ?',
    )
      .bind(nickname, rounds, avgReact, now, week, uuid)
      .run();
  } else {
    // 최고 기록 미갱신이어도 닉네임은 최신으로 유지
    await env.DB.prepare('UPDATE scores SET nickname = ? WHERE week = ? AND uuid = ?')
      .bind(nickname, week, uuid)
      .run();
  }

  const me = await env.DB.prepare('SELECT best, avg_react, updated_at FROM scores WHERE week = ? AND uuid = ?')
    .bind(week, uuid)
    .first();
  const rankRow = await env.DB.prepare(rankAheadSql)
    .bind(week, me.best, me.best, me.avg_react, me.best, me.avg_react, me.updated_at)
    .first();
  const totalRow = await env.DB.prepare('SELECT COUNT(*) AS total FROM scores WHERE week = ?')
    .bind(week)
    .first();

  return json({
    ok: true,
    best: me.best,
    rank: rankRow.ahead + 1,
    totalPlayers: totalRow.total,
  });
}

async function handleLeaderboard(request, env) {
  const url = new URL(request.url);
  const uuid = url.searchParams.get('uuid') ?? '';
  const week = weekKey();

  const rows = await env.DB.prepare(
    `SELECT uuid, nickname, best FROM scores WHERE week = ? ORDER BY ${RANK_ORDER} LIMIT ?`,
  )
    .bind(week, TOP_N)
    .all();

  const entries = (rows.results ?? []).map((r, i) => ({
    rank: i + 1,
    nickname: r.nickname,
    best: r.best,
    me: r.uuid === uuid || undefined,
  }));

  let myRank = null;
  let myBest = null;
  const me = await env.DB.prepare('SELECT best, avg_react, updated_at FROM scores WHERE week = ? AND uuid = ?')
    .bind(week, uuid)
    .first();
  if (me) {
    const rankRow = await env.DB.prepare(rankAheadSql)
      .bind(week, me.best, me.best, me.avg_react, me.best, me.avg_react, me.updated_at)
      .first();
    myRank = rankRow.ahead + 1;
    myBest = me.best;
  }
  const totalRow = await env.DB.prepare('SELECT COUNT(*) AS total FROM scores WHERE week = ?')
    .bind(week)
    .first();

  return json({ week, entries, myRank, myBest, totalPlayers: totalRow.total });
}

async function handleReward(request, env) {
  const url = new URL(request.url);
  const uuid = url.searchParams.get('uuid') ?? '';
  // 미수령 보상 전체 합산 (지난주 이전 포함) — amount는 토스포인트 원 단위
  const row = await env.DB.prepare(
    'SELECT week, rank, SUM(amount) AS amount FROM rewards WHERE uuid = ? AND claimed = 0',
  )
    .bind(uuid)
    .first();
  if (!row || !row.amount) return json({ week: null, rank: null, amount: 0, claimed: false });
  return json({ week: row.week, rank: row.rank, amount: row.amount, claimed: false });
}

async function handleClaim(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const { uuid, sig } = body ?? {};
  if (typeof uuid !== 'string') return json({ ok: false }, 400);
  const expected = await sha256Hex(`${env.APP_SECRET}|${uuid}|claim`);
  if (sig !== expected) return json({ ok: false }, 403);

  // 실돈 지급이므로 먼저 claimed 처리(권위 기록)해 중복 지급을 차단한다.
  // 앱은 rewards의 각 행을 순위 구간별 프로모션 코드로 지급하고,
  // 실패한 주는 /v1/unclaim에 보내 정확히 롤백한다. (rank별 코드 분리 대응)
  const rows = await env.DB.prepare(
    'SELECT week, rank, amount FROM rewards WHERE uuid = ? AND claimed = 0',
  )
    .bind(uuid)
    .all();
  const list = rows.results ?? [];
  const total = list.reduce((s, r) => s + r.amount, 0);
  if (!total) return json({ ok: false, total: 0, rewards: [] });

  await env.DB.prepare('UPDATE rewards SET claimed = 1 WHERE uuid = ? AND claimed = 0')
    .bind(uuid)
    .run();
  return json({ ok: true, total, rewards: list });
}

// 지급 실패 롤백 — 방금 claim한 주(week)만 미수령으로 되돌린다 (과거 지급분은 보존)
async function handleUnclaim(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const { uuid, weeks, sig } = body ?? {};
  if (typeof uuid !== 'string' || !Array.isArray(weeks) || weeks.length === 0) {
    return json({ ok: false }, 400);
  }
  const expected = await sha256Hex(`${env.APP_SECRET}|${uuid}|unclaim`);
  if (sig !== expected) return json({ ok: false }, 403);

  const placeholders = weeks.map(() => '?').join(',');
  await env.DB.prepare(
    `UPDATE rewards SET claimed = 0 WHERE uuid = ? AND claimed = 1 AND week IN (${placeholders})`,
  )
    .bind(uuid, ...weeks)
    .run();
  return json({ ok: true });
}

// 지난주 TOP 10 정산 (멱등 — 이미 정산된 주는 건너뜀)
async function settleWeek(env, week) {
  const done = await env.DB.prepare('SELECT 1 AS x FROM rewards WHERE week = ? LIMIT 1').bind(week).first();
  if (done) return;
  const rows = await env.DB.prepare(
    `SELECT uuid FROM scores WHERE week = ? ORDER BY ${RANK_ORDER} LIMIT 10`,
  )
    .bind(week)
    .all();
  const list = rows.results ?? [];
  for (let i = 0; i < list.length; i++) {
    const rank = i + 1;
    const amount = rewardForRank(rank);
    if (amount <= 0) continue;
    await env.DB.prepare(
      'INSERT OR IGNORE INTO rewards (week, uuid, rank, amount, claimed) VALUES (?, ?, ?, ?, 0)',
    )
      .bind(week, list[i].uuid, rank, amount)
      .run();
  }
}

// ── 토스 로그인(방식 B) ──────────────────────────────────────────
// 인가코드 → accessToken
async function tossExchangeToken(authorizationCode, referrer) {
  const r = await fetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorizationCode, referrer }),
  });
  const j = await r.json().catch(() => null);
  return j?.resultType === 'SUCCESS' ? j.success.accessToken : null;
}

// accessToken → userKey (비암호화 반환)
async function tossUserKey(accessToken) {
  const r = await fetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/login-me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const j = await r.json().catch(() => null);
  return j?.resultType === 'SUCCESS' ? j.success.userKey : null;
}

// 로그인: 인가코드 → userKey, 기기(deviceId) 데이터를 userKey로 이관, 지갑 복원(max)
async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const { authorizationCode, referrer, deviceId, localCoins, localExchanged } = body ?? {};
  if (typeof authorizationCode !== 'string' || typeof referrer !== 'string') return json({ ok: false }, 400);

  const accessToken = await tossExchangeToken(authorizationCode, referrer);
  if (!accessToken) return json({ ok: false, error: 'token_exchange_failed' }, 502);
  const userKey = await tossUserKey(accessToken);
  if (userKey == null) return json({ ok: false, error: 'userkey_failed' }, 502);
  const id = `u:${userKey}`;

  // 기기 식별자로 쌓인 랭킹/보상을 userKey로 이관 (로그아웃 플레이분 보존)
  if (typeof deviceId === 'string' && deviceId && deviceId !== id) {
    const devScores = await env.DB.prepare(
      'SELECT week, nickname, best, avg_react, updated_at FROM scores WHERE uuid = ?',
    ).bind(deviceId).all();
    for (const row of devScores.results ?? []) {
      const ex = await env.DB.prepare('SELECT best FROM scores WHERE week = ? AND uuid = ?')
        .bind(row.week, id).first();
      if (!ex) {
        await env.DB.prepare(
          'INSERT INTO scores (week, uuid, nickname, best, avg_react, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ).bind(row.week, id, row.nickname, row.best, row.avg_react, row.updated_at).run();
      } else if (row.best > ex.best) {
        await env.DB.prepare(
          'UPDATE scores SET nickname = ?, best = ?, avg_react = ?, updated_at = ? WHERE week = ? AND uuid = ?',
        ).bind(row.nickname, row.best, row.avg_react, row.updated_at, row.week, id).run();
      }
    }
    await env.DB.prepare('DELETE FROM scores WHERE uuid = ?').bind(deviceId).run();

    const devRewards = await env.DB.prepare(
      'SELECT week, rank, amount FROM rewards WHERE uuid = ? AND claimed = 0',
    ).bind(deviceId).all();
    for (const r of devRewards.results ?? []) {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO rewards (week, uuid, rank, amount, claimed) VALUES (?, ?, ?, ?, 0)',
      ).bind(r.week, id, r.rank, r.amount).run();
    }
    await env.DB.prepare('DELETE FROM rewards WHERE uuid = ? AND claimed = 0').bind(deviceId).run();
  }

  // 지갑 복원: 로그인 시점엔 코인 손실 방지를 위해 max(서버, 로컬)
  const w = await env.DB.prepare('SELECT coins, total_exchanged FROM wallets WHERE id = ?').bind(id).first();
  const coins = Math.max(w?.coins ?? 0, Math.max(0, Number(localCoins) || 0));
  const totalExchanged = Math.max(w?.total_exchanged ?? 0, Math.max(0, Number(localExchanged) || 0));
  await env.DB.prepare(
    'INSERT INTO wallets (id, coins, total_exchanged, updated_at) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(id) DO UPDATE SET coins = excluded.coins, total_exchanged = excluded.total_exchanged, updated_at = excluded.updated_at',
  ).bind(id, coins, totalExchanged, Date.now()).run();

  return json({ ok: true, userKey, coins, totalExchanged });
}

// 지갑 동기화: 클라이언트가 권위(last-write-wins). 서명 필수.
async function handleWalletSync(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const { userKey, coins, totalExchanged, sig } = body ?? {};
  if (userKey == null || !Number.isInteger(coins) || coins < 0) return json({ ok: false }, 400);
  const id = `u:${userKey}`;
  const expected = await sha256Hex(`${env.APP_SECRET}|${id}|wallet|${coins}`);
  if (sig !== expected) return json({ ok: false }, 403);
  await env.DB.prepare(
    'INSERT INTO wallets (id, coins, total_exchanged, updated_at) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(id) DO UPDATE SET coins = excluded.coins, total_exchanged = excluded.total_exchanged, updated_at = excluded.updated_at',
  ).bind(id, coins, Math.max(0, Number(totalExchanged) || 0), Date.now()).run();
  return json({ ok: true, coins });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    try {
      if (url.pathname === '/v1/score' && request.method === 'POST') return await handleScore(request, env);
      if (url.pathname === '/v1/leaderboard' && request.method === 'GET') return await handleLeaderboard(request, env);
      if (url.pathname === '/v1/reward' && request.method === 'GET') return await handleReward(request, env);
      if (url.pathname === '/v1/claim' && request.method === 'POST') return await handleClaim(request, env);
      if (url.pathname === '/v1/unclaim' && request.method === 'POST') return await handleUnclaim(request, env);
      if (url.pathname === '/v1/login' && request.method === 'POST') return await handleLogin(request, env);
      if (url.pathname === '/v1/wallet/sync' && request.method === 'POST') return await handleWalletSync(request, env);
      if (url.pathname === '/terms' && request.method === 'GET') return html(TERMS_HTML);
      if (url.pathname === '/privacy' && request.method === 'GET') return html(PRIVACY_HTML);
      if (url.pathname === '/') return json({ ok: true, service: 'flagup-api' });
      return json({ ok: false, error: 'not found' }, 404);
    } catch (e) {
      return json({ ok: false, error: 'internal' }, 500);
    }
  },

  async scheduled(event, env) {
    // 월요일 00:00 KST 실행 시점 기준 "지난주" 정산
    await settleWeek(env, prevWeekKey());
  },
};
