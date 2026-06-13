# 동점(같은 라운드) 정렬 검증 + claim 다건 rewards 반환 검증
import hashlib
import json
import urllib.request

import os
BASE = "https://flagup-api.jameslee0206.workers.dev"
SECRET = os.environ["FLAGUP_APP_SECRET"]  # 환경변수로 주입 (소스에 하드코딩 금지)
UA = "flagup-e2e-test/1.0"


def post(path, body):
    req = urllib.request.Request(
        BASE + path, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "User-Agent": UA}, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"_status": e.code, **json.loads(e.read())}


def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def submit(uuid, nick, rounds, reactions):
    sig = hashlib.sha256(f"{SECRET}|{uuid}|{rounds}|{','.join(map(str,reactions))}".encode()).hexdigest()
    return post("/v1/score", {"uuid": uuid, "nickname": nick, "rounds": rounds, "reactions": reactions, "sig": sig})


# 같은 25라운드, 평균 반응속도 다르게 → 빠른 쪽(slow_avg 작은)이 상위여야
fast = [200 + (i % 5) * 20 for i in range(25)]   # 평균 ~240ms
slow = [400 + (i % 5) * 20 for i in range(25)]   # 평균 ~440ms

u_slow = "test-tie-slow-4000-8000-000000000001"
u_fast = "test-tie-fast-4000-8000-000000000002"

# 느린 사람이 '먼저' 제출 (도달시각은 느린 쪽이 빠름 → updated_at 기준이면 느린쪽이 위)
print("느린유저 제출:", submit(u_slow, "느림이", 25, slow))
import time; time.sleep(0.2)
print("빠른유저 제출:", submit(u_fast, "빠름이", 25, fast))

lb = get(f"/v1/leaderboard?uuid={u_fast}")
top2 = [(e["rank"], e["nickname"], e["best"]) for e in lb["entries"] if e["nickname"] in ("느림이", "빠름이")]
print("리더보드 동점 2인:", top2)
print("→ 빠름이가 느림이보다 상위인가:",
      next(r for r, n, _ in top2 if n == "빠름이") < next(r for r, n, _ in top2 if n == "느림이"))
