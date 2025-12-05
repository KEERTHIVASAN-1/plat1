# routers/contest.py
from fastapi import APIRouter, Depends, HTTPException
from ..models import RunRequest, SubmitRequest, SubmissionOut, ProblemOut, RunRequest
from ..db import db
from ..config import PISTON_URL, PISTON_TIMEOUT_MS
from ..routers.auth import create_token  # not used here; just for replication safety
from ..models import UserOut
from fastapi import Header
from typing import Optional, Dict, Any
import httpx
import asyncio
import uuid
from datetime import datetime, timezone
import jwt
import os

router = APIRouter(prefix="/api/contest", tags=["contest"])

# helper to decode token and get user (simple self-contained dependency)
SECRET = os.getenv("SECRET_KEY", "dev-secret")
async def get_current_user(authorization: Optional[str] = Header(None)) -> UserOut:
    if not authorization:
        raise HTTPException(401, "Authorization header missing")
    token = authorization.replace("Bearer ", "")
    try:
        data = jwt.decode(token, SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(401, "Invalid token")
    uid = data.get("id")
    udoc = await db.users.find_one({"id": uid})
    if not udoc:
        raise HTTPException(401, "User not found")
    return UserOut(
        id=udoc["id"], name=udoc.get("name"), email=udoc.get("email"),
        role=udoc.get("role", "contestant"), round1Completed=udoc.get("round1Completed", False),
        round2Eligible=udoc.get("round2Eligible", False), round1Score=udoc.get("round1Score", 0),
        round2Score=udoc.get("round2Score", 0)
    )

# map client languages to piston language identifiers (expand as needed)
LANG_MAP = {
    "python": "python3",
    "python3": "python3",
    "py": "python3",
    "js": "javascript",
    "javascript": "javascript",
    "node": "javascript",
    "cpp": "cpp",
    "c++": "cpp",
    "c": "c",
    "java": "java",
}

async def call_piston(code: str, language: str, stdin: str = "") -> Dict[str, Any]:
    payload = {
        "language": language,
        "version": "*",
        "files": [{"content": code}],
        "stdin": stdin or ""
    }
    timeout = (PISTON_TIMEOUT_MS or 20000) / 1000.0
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(PISTON_URL, json=payload)
        if resp.status_code != 200:
            raise HTTPException(500, f"Piston error: {resp.status_code}")
        return resp.json()

@router.post("/run")
async def run_code(req: RunRequest, current_user: UserOut = Depends(get_current_user)):
    if not req.code:
        raise HTTPException(400, "Code is required")
    language = LANG_MAP.get(req.language.lower(), req.language.lower())
    data = await call_piston(req.code, language, req.customInput or "")
    run = data.get("run", {})
    output = run.get("output", "") or run.get("stdout", "")
    return {"success": True, "output": output, "stderr": run.get("stderr", ""), "time": run.get("time")}

@router.post("/submit", response_model=SubmissionOut)
async def submit(req: SubmitRequest, current_user: UserOut = Depends(get_current_user)):
    # auth: user can submit for self or admin
    if current_user.role != "admin" and current_user.id != req.userId:
        raise HTTPException(403, "Cannot submit for other user")

    if not db:
        raise HTTPException(500, "DB not available")

    # ensure round exists and active & not locked & timer check
    r = await db.rounds.find_one({"id": req.round})
    if not r:
        raise HTTPException(404, "Round not found")
    if r.get("status") != "active":
        raise HTTPException(403, "Round not active")
    if r.get("isLocked", False):
        raise HTTPException(403, "Round locked")

    # timer enforcement based on admin-defined endTime only
    now = datetime.now(timezone.utc)
    end = r.get("endTime")
    if end:
        try:
            end_dt = datetime.fromisoformat(end)
            if now > end_dt:
                await db.rounds.update_one({"id": req.round}, {"$set": {"isLocked": True, "status": "completed"}})
                raise HTTPException(403, "Round time is over")
        except Exception:
            pass

    prob = await db.problems.find_one({"id": req.problemId})
    if not prob:
        raise HTTPException(404, "Problem not found")

    testcases = prob.get("testcases", [])
    total = len(testcases)
    passed = 0
    results = []

    language = LANG_MAP.get(req.language.lower(), req.language.lower())

    # Run testcases serially (for dev). For scale move to worker queue.
    for tc in testcases:
        stdin = tc.get("input", "")
        expected = (tc.get("output", "") or "").replace("\r", "").strip()
        try:
            data = await call_piston(req.code, language, stdin)
        except HTTPException:
            results.append({"input": stdin, "expectedOutput": expected, "actualOutput": "", "passed": False, "stderr": "execution error"})
            continue
        run = data.get("run", {})
        stdout = (run.get("output", "") or run.get("stdout", "") or "").replace("\r", "").strip()
        ok = (stdout == expected and run.get("code", 0) == 0)
        if ok:
            passed += 1
        results.append({
            "input": stdin,
            "expectedOutput": expected,
            "actualOutput": stdout,
            "passed": ok,
            "stderr": run.get("stderr", "")
        })
        await asyncio.sleep(0.01)

    fully_passed = (passed == total)
    stored_code = req.code if (req.round != "round1" or fully_passed) else ""

    sid = "s" + str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    submission_doc = {
        "id": sid,
        "userId": req.userId,
        "problemId": req.problemId,
        "round": req.round,
        "code": stored_code,
        "language": req.language,
        "timestamp": timestamp,
        "testcasesPassed": passed,
        "totalTestcases": total,
        "results": results
    }
    await db.submissions.insert_one(submission_doc)

    # update participant and user stats
    if req.round == "round1":
        await db.participants.update_one({"id": req.userId}, {"$set": {
            "round1Attendance": True,
            "round1TestcasesPassed": passed,
            "round1TotalTestcases": total,
            "round1Timestamp": timestamp,
            "round2Eligible": fully_passed
        }})
        await db.users.update_one({"id": req.userId}, {"$set": {"round1Score": passed}})
    else:
        await db.participants.update_one({"id": req.userId}, {"$set": {
            "round2Attendance": True,
            "round2TestcasesPassed": passed,
            "round2TotalTestcases": total,
            "round2Timestamp": timestamp
        }})
        await db.users.update_one({"id": req.userId}, {"$set": {"round2Score": passed}})

    # return response
    from ..models import SubmissionOut as SO
    return SO(
        id=sid,
        userId=req.userId,
        problemId=req.problemId,
        round=req.round,
        code=stored_code,
        language=req.language,
        timestamp=datetime.fromisoformat(timestamp),
        testcasesPassed=passed,
        totalTestcases=total,
        results=results
    )


# Test code against problem testcases without storing submission
@router.post("/test")
async def test_code(req: SubmitRequest, current_user: UserOut = Depends(get_current_user)):
    if not db:
        raise HTTPException(500, "DB not available")
    r = await db.rounds.find_one({"id": req.round})
    if not r:
        raise HTTPException(404, "Round not found")
    if r.get("status") != "active":
        raise HTTPException(403, "Round not active")
    if r.get("isLocked", False):
        raise HTTPException(403, "Round locked")

    now = datetime.now(timezone.utc)
    end = r.get("endTime")
    if end:
        try:
            end_dt = datetime.fromisoformat(end)
            if now > end_dt:
                await db.rounds.update_one({"id": req.round}, {"$set": {"isLocked": True, "status": "completed"}})
                raise HTTPException(403, "Round time is over")
        except Exception:
            pass

    prob = await db.problems.find_one({"id": req.problemId})
    if not prob:
        raise HTTPException(404, "Problem not found")

    open_cases = prob.get("openTestcases") or prob.get("testcases") or []
    hidden_cases = prob.get("hiddenTestcases") or []
    open_cases = open_cases[:2]
    hidden_cases = hidden_cases[:4]

    language = LANG_MAP.get(req.language.lower(), req.language.lower())
    results = []
    passed = 0

    idx = 1
    for tc in open_cases:
        stdin = tc.get("input", "")
        expected = (tc.get("output", "") or "").replace("\r", "").strip()
        try:
            data = await call_piston(req.code, language, stdin)
        except HTTPException:
            results.append({"testcase": f"Open {idx}", "hidden": False, "input": stdin, "expectedOutput": expected, "actualOutput": "", "passed": False, "stderr": "execution error"})
            idx += 1
            continue
        run = data.get("run", {})
        stdout = (run.get("output", "") or run.get("stdout", "") or "").replace("\r", "").strip()
        ok = (stdout == expected and run.get("code", 0) == 0)
        if ok:
            passed += 1
        results.append({"testcase": f"Open {idx}", "hidden": False, "input": stdin, "expectedOutput": expected, "actualOutput": stdout, "passed": ok, "stderr": run.get("stderr", "")})
        idx += 1

    hidx = 1
    for tc in hidden_cases:
        stdin = tc.get("input", "")
        expected = (tc.get("output", "") or "").replace("\r", "").strip()
        try:
            data = await call_piston(req.code, language, stdin)
        except HTTPException:
            results.append({"testcase": f"Hidden {hidx}", "hidden": True, "passed": False, "stderr": "execution error"})
            hidx += 1
            continue
        run = data.get("run", {})
        stdout = (run.get("output", "") or run.get("stdout", "") or "").replace("\r", "").strip()
        ok = (stdout == expected and run.get("code", 0) == 0)
        if ok:
            passed += 1
        results.append({"testcase": f"Hidden {hidx}", "hidden": True, "passed": ok})
        hidx += 1

    total = len(open_cases) + len(hidden_cases)
    return {"success": True, "results": results, "passed": passed, "total": total}
