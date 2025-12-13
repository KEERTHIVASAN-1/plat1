# routers/contest.py

from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import asyncio
import uuid
import httpx
import jwt
import os

from ..models import RunRequest, SubmitRequest, SubmissionOut, UserOut
from ..db import db
from ..config import PISTON_URL, PISTON_TIMEOUT_MS

router = APIRouter(prefix="/api/contest", tags=["contest"])

# -------------------------------------------------------------------
# AUTH HELPERS
# -------------------------------------------------------------------

SECRET = os.getenv("SECRET_KEY", "dev-secret")

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> UserOut:
    if not authorization:
        raise HTTPException(401, "Authorization header missing")

    token = authorization.replace("Bearer ", "")
    try:
        data = jwt.decode(token, SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(401, "Invalid token")

    uid = data.get("id")

    if db is None:
        raise HTTPException(500, "DB not available")

    udoc = await db.users.find_one({"id": uid}, {"_id": 0})
    if udoc is None:
        raise HTTPException(401, "User not found")

    return UserOut(
        id=udoc["id"],
        name=udoc.get("name"),
        email=udoc.get("email"),
        role=udoc.get("role", "contestant"),
        round1Completed=udoc.get("round1Completed", False),
        round2Eligible=udoc.get("round2Eligible", False),
        round1Score=udoc.get("round1Score", 0),
        round2Score=udoc.get("round2Score", 0),
    )

# -------------------------------------------------------------------
# LANGUAGE MAP
# -------------------------------------------------------------------

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

# -------------------------------------------------------------------
# PISTON EXECUTION
# -------------------------------------------------------------------

async def call_piston(code: str, language: str, stdin: str = "") -> Dict[str, Any]:
    payload = {
        "language": language,
        "version": "*",
        "files": [{"content": code}],
        "stdin": stdin or "",
    }
    timeout = (PISTON_TIMEOUT_MS or 20000) / 1000.0

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(PISTON_URL, json=payload)
        if resp.status_code != 200:
            raise HTTPException(500, "Piston execution failed")
        return resp.json()

# -------------------------------------------------------------------
# RUN CODE
# -------------------------------------------------------------------

@router.post("/run")
async def run_code(
    req: RunRequest,
    current_user: UserOut = Depends(get_current_user),
):
    if not req.code:
        raise HTTPException(400, "Code is required")

    language = LANG_MAP.get(req.language.lower(), req.language.lower())
    data = await call_piston(req.code, language, req.customInput or "")

    run = data.get("run", {})
    output = run.get("output", "") or run.get("stdout", "")

    return {
        "success": True,
        "output": output,
        "stderr": run.get("stderr", ""),
        "time": run.get("time"),
    }

# -------------------------------------------------------------------
# SUBMIT CODE
# -------------------------------------------------------------------

@router.post("/submit", response_model=SubmissionOut)
async def submit(
    req: SubmitRequest,
    current_user: UserOut = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != req.userId:
        raise HTTPException(403, "Cannot submit for other user")

    if db is None:
        raise HTTPException(500, "DB not available")

    round_doc = await db.rounds.find_one({"id": req.round}, {"_id": 0})
    if round_doc is None:
        raise HTTPException(404, "Round not found")

    if round_doc.get("status") != "active":
        raise HTTPException(403, "Round not active")

    if round_doc.get("isLocked", False):
        raise HTTPException(403, "Round locked")

    start = round_doc.get("startTime")
    duration = round_doc.get("duration", 3600)

    if start:
        start_dt = datetime.fromisoformat(start)
        now = datetime.now(timezone.utc)
        if (now - start_dt).total_seconds() > duration:
            await db.rounds.update_one(
                {"id": req.round},
                {"$set": {"isLocked": True, "status": "completed"}},
            )
            raise HTTPException(403, "Round time over")

    prob = await db.problems.find_one({"id": req.problemId}, {"_id": 0})
    if prob is None:
        raise HTTPException(404, "Problem not found")

    testcases = prob.get("testcases", [])
    total = len(testcases)
    passed = 0
    results = []

    language = LANG_MAP.get(req.language.lower(), req.language.lower())

    for tc in testcases:
        stdin = tc.get("input", "")
        expected = (tc.get("output", "") or "").strip()

        try:
            data = await call_piston(req.code, language, stdin)
            run = data.get("run", {})
            stdout = (run.get("output", "") or run.get("stdout", "") or "").strip()
            ok = stdout == expected and run.get("code", 0) == 0
        except Exception:
            stdout = ""
            ok = False

        if ok:
            passed += 1

        results.append({
            "input": stdin,
            "expectedOutput": expected,
            "actualOutput": stdout,
            "passed": ok,
            "stderr": run.get("stderr", ""),
        })

        await asyncio.sleep(0.01)

    sid = "s" + str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    submission_doc = {
        "id": sid,
        "userId": req.userId,
        "problemId": req.problemId,
        "round": req.round,
        "code": req.code,
        "language": req.language,
        "timestamp": timestamp,
        "testcasesPassed": passed,
        "totalTestcases": total,
        "results": results,
    }

    await db.submissions.insert_one(submission_doc)

    return SubmissionOut(
        id=sid,
        userId=req.userId,
        problemId=req.problemId,
        round=req.round,
        code=req.code,
        language=req.language,
        timestamp=datetime.fromisoformat(timestamp),
        testcasesPassed=passed,
        totalTestcases=total,
        results=results,
    )

# -------------------------------------------------------------------
# LIST PROBLEMS
# -------------------------------------------------------------------

@router.get("/problems")
async def list_problems():
    if db is None:
        raise HTTPException(500, "DB not available")

    items = await db.problems.find({}, {"_id": 0}).to_list(1000)
    return {"problems": items}

# -------------------------------------------------------------------
# USER SUBMISSIONS
# -------------------------------------------------------------------

@router.get("/submissions/{userId}")
async def user_submissions(
    userId: str,
    current_user: UserOut = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != userId:
        raise HTTPException(403)

    if db is None:
        raise HTTPException(500, "DB not available")

    items = await db.submissions.find(
        {"userId": userId},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)

    return items
