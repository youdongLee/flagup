# 랭킹 보상 조회/수령 흐름 검증 (토스포인트 amount 필드)
import hashlib
import json
import urllib.request

import os
BASE = "https://flagup-api.jameslee0206.workers.dev"
SECRET = os.environ["FLAGUP_APP_SECRET"]  # 환경변수로 주입 (소스에 하드코딩 금지)
UA = "flagup-e2e-test/1.0"
uuid = "test-reward-0000-4000-8000-rewardcheck1"


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
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


sig = hashlib.sha256(f"{SECRET}|{uuid}|claim".encode()).hexdigest()

print("보상 조회(지급 전):", json.dumps(get(f"/v1/reward?uuid={uuid}"), ensure_ascii=False))
# (사전에 wrangler로 rewards 행 1개 삽입: week 2025-01-01, rank 1, amount 1000)
print("보상 조회(지급 후):", json.dumps(get(f"/v1/reward?uuid={uuid}"), ensure_ascii=False))
print("수령:", post("/v1/claim", {"uuid": uuid, "sig": sig}))
print("재수령(0 기대):", post("/v1/claim", {"uuid": uuid, "sig": sig}))
