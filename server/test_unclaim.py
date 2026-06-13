# claim → unclaim 롤백 흐름 검증 (지급 실패 시 재수령 가능 확인)
import hashlib
import json
import urllib.request

import os
BASE = "https://flagup-api.jameslee0206.workers.dev"
SECRET = os.environ["FLAGUP_APP_SECRET"]  # 환경변수로 주입 (소스에 하드코딩 금지)
UA = "flagup-e2e-test/1.0"
uuid = "test-unclaim-0000-4000-8000-rollback001"


def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def post(path, body):
    req = urllib.request.Request(
        BASE + path, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "User-Agent": UA}, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"_status": e.code, **json.loads(e.read())}


def sig(tag):
    return hashlib.sha256(f"{SECRET}|{uuid}|{tag}".encode()).hexdigest()


print("1) 보상 조회:", json.dumps(get(f"/v1/reward?uuid={uuid}"), ensure_ascii=False))
claim = post("/v1/claim", {"uuid": uuid, "sig": sig("claim")})
print("2) claim:", json.dumps(claim, ensure_ascii=False))
print("3) claim 직후 조회(0 기대):", json.dumps(get(f"/v1/reward?uuid={uuid}"), ensure_ascii=False))
unclaim = post("/v1/unclaim", {"uuid": uuid, "weeks": claim.get("weeks", []), "sig": sig("unclaim")})
print("4) unclaim:", json.dumps(unclaim, ensure_ascii=False))
print("5) unclaim 후 조회(보상 복구 기대):", json.dumps(get(f"/v1/reward?uuid={uuid}"), ensure_ascii=False))
print("6) 잘못된 서명 unclaim(403 기대):", json.dumps(
    post("/v1/unclaim", {"uuid": uuid, "weeks": claim.get("weeks", []), "sig": "0" * 64}), ensure_ascii=False))
