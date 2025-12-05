import os, uuid, asyncio
from datetime import datetime, timezone
import httpx
from dotenv import load_dotenv
from database import db

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Prefer explicit env; fall back to localhost for dev
PISTON_URL = os.getenv("PISTON_URL", "http://localhost:2000/api/v2/execute")

async def call_piston(code, language, stdin=""):
    payload = {
        "language": language,
        "version": "*",
        "files": [{"content": code}],
        "stdin": stdin
    }
    timeout = int(os.getenv("PISTON_TIMEOUT", os.getenv("PISTON_TIMEOUT_MS", "20000"))) / 1000.0
    async with httpx.AsyncClient(timeout=timeout) as c:
        try:
            r = await c.post(PISTON_URL, json=payload)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            # Fallback for dev when 'piston' hostname is not resolvable
            try:
                fallback = "http://localhost:2000/api/v2/execute"
                r2 = await c.post(fallback, json=payload)
                r2.raise_for_status()
                return r2.json()
            except Exception:
                return {"run": {"stdout": "", "output": "", "stderr": str(e), "code": 1}}

def process_submission(job_data):
    userId = job_data["userId"]
    problemId = job_data["problemId"]
    code = job_data["code"]
    language = job_data["language"]
    rnd = job_data["round"]

    problem = db.problems.find_one({"id": problemId})
    testcases = problem.get("testcases", [])
    results = []
    passed_count = 0

    async def run_all():
        nonlocal passed_count, results
        for tc in testcases:
            stdin = tc.get("input", "")

            try:
                data = await call_piston(code, language, stdin)
            except Exception as e:
                results.append({
                    "input": stdin,
                    "passed": False,
                    "stderr": str(e),
                    "actualOutput": ""
                })
                continue

            run = data.get("run", {})
            stdout = (run.get("output","") or run.get("stdout","") or "").replace("\r","").strip()
            expected = (tc.get("output","") or "").replace("\r","").strip()
            passed = (stdout == expected and run.get("code", 0) == 0)
            if passed: passed_count += 1

            results.append({
                "input": stdin,
                "expectedOutput": expected,
                "actualOutput": stdout,
                "passed": passed,
                "stderr": run.get("stderr","")
            })
            await asyncio.sleep(0.01)

    asyncio.run(run_all())

    submission_doc = {
        "id": "s" + str(uuid.uuid4()),
        "userId": userId,
        "problemId": problemId,
        "round": rnd,
        "code": code,
        "language": language,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "testcasesPassed": passed_count,
        "totalTestcases": len(testcases),
        "results": results
    }

    store = True
    if rnd == "round1":
        store = (passed_count == len(testcases))
    if store:
        db.submissions.insert_one(submission_doc)

    update = {}
    if rnd == "round1":
        update = {
            "round1Attendance": True,
            "round1TestcasesPassed": passed_count,
            "round1TotalTestcases": len(testcases),
            "round1Timestamp": submission_doc["timestamp"]
        }
        db.users.update_one({"id": userId}, {"$set": {"round1Score": passed_count}})

    elif rnd == "round2":
        update = {
            "round2Attendance": True,
            "round2TestcasesPassed": passed_count,
            "round2TotalTestcases": len(testcases),
            "round2Timestamp": submission_doc["timestamp"]
        }
        db.users.update_one({"id": userId}, {"$set": {"round2Score": passed_count}})

    db.participants.update_one({"id": userId}, {"$set": update}, upsert=True)

    return {
        "submissionId": submission_doc["id"],
        "stored": store,
        "passed": passed_count,
        "total": len(testcases)
    }
