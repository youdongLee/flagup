# 배포된 flagup-api E2E 테스트 (점수 제출 → 순위 → 검증 거부 확인)
import hashlib
import json
import urllib.request

import os
BASE = "https://flagup-api.jameslee0206.workers.dev"
SECRET = os.environ["FLAGUP_APP_SECRET"]  # 환경변수로 주입 (소스에 하드코딩 금지)
UA = "flagup-e2e-test/1.0"


def post(path, body):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "User-Agent": UA},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw[:300]


def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def sig(parts):
    return hashlib.sha256(("|".join(str(p) for p in parts)).encode()).hexdigest()


uuid = "test-e2e-0000-4000-8000-checkcheck01"

# 1. 정상 제출
re_ok = [420, 355, 510, 388, 460, 392, 615, 433, 377, 540, 486, 401]
body = {
    "uuid": uuid, "nickname": "테스트봇", "rounds": 12, "reactions": re_ok,
    "sig": sig([SECRET, uuid, 12, ",".join(map(str, re_ok))]),
}
print("정상 제출:", post("/v1/score", body))

# 2. 리더보드에 떴는지
lb = get(f"/v1/leaderboard?uuid={uuid}")
print("리더보드:", json.dumps(lb, ensure_ascii=False))

# 3. 봇 제출 (반응시간 전부 동일) → 422 거부 기대
re_bot = [200] * 15
body_bot = {
    "uuid": uuid + "x", "nickname": "봇", "rounds": 15, "reactions": re_bot,
    "sig": sig([SECRET, uuid + "x", 15, ",".join(map(str, re_bot))]),
}
print("봇 제출(거부 기대):", post("/v1/score", body_bot))

# 4. 서명 위조 → 403 기대
body_forged = dict(body, sig="0" * 64)
print("위조 서명(거부 기대):", post("/v1/score", body_forged))

# 5. 초인적 반응속도 → 422 기대
re_fast = [100, 95, 110, 90, 105, 98, 102, 99, 108, 96, 101, 97]
body_fast = {
    "uuid": uuid + "y", "nickname": "치터", "rounds": 12, "reactions": re_fast,
    "sig": sig([SECRET, uuid + "y", 12, ",".join(map(str, re_fast))]),
}
print("초고속 제출(거부 기대):", post("/v1/score", body_fast))
