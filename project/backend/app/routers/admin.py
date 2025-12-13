from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import uuid

from ..db import db
from ..auth import get_current_user
from ..models import ProblemCreate

router = APIRouter(prefix="/api")

# -------------------------------------------------------------------
# PARTICIPANTS
# -------------------------------------------------------------------

@router.get("/admin/participants")
async def admin_participants(admin=Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)

    if db is None:
        return []

    try:
        items = await db.participants.find({}, {"_id": 0}).to_list(1000)
        return items
    except Exception:
        return []


@router.get("/admin/participant/{participant_id}")
async def admin_participant(participant_id: str, admin=Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)

    if db is None:
        raise HTTPException(500, "DB not available")

    p = await db.participants.find_one({"id": participant_id}, {"_id": 0})
    if p is None:
        raise HTTPException(404)

    return p


@router.patch("/admin/participant/{participant_id}/eligibility")
async def admin_toggle_eligibility(participant_id: str, admin=Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)

    if db is None:
        raise HTTPException(500, "DB not available")

    p = await db.participants.find_one({"id": participant_id})
    if p is None:
        raise HTTPException(404)

    new_val = not p.get("round2Eligible", False)
    await db.participants.update_one(
        {"id": participant_id},
        {"$set": {"round2Eligible": new_val}},
    )

    return {"id": participant_id, "round2Eligible": new_val}


@router.patch("/admin/participant/{participant_id}/password")
async def admin_set_password(
    participant_id: str,
    password: Optional[str] = None,
    admin=Depends(get_current_user),
):
    if admin.role != "admin":
        raise HTTPException(403)

    if not password:
        raise HTTPException(400, "Password required")

    if db is None:
        raise HTTPException(500, "DB not available")

    p = await db.participants.find_one({"id": participant_id})
    if p is None:
        raise HTTPException(404)

    await db.participants.update_one(
        {"id": participant_id},
        {"$set": {"password": password}},
    )

    return {"id": participant_id, "password": "set"}

# -------------------------------------------------------------------
# ROUNDS
# -------------------------------------------------------------------

@router.patch("/admin/round/{round_id}/status")
async def admin_round_status(round_id: str, body: dict, admin=Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)

    if db is None:
        raise HTTPException(500, "DB not available")

    r = await db.rounds.find_one({"id": round_id}, {"_id": 0})
    if r is None:
        raise HTTPException(404)

    new_status = body.get("status")
    await db.rounds.update_one(
        {"id": round_id},
        {"$set": {"status": new_status}},
    )

    r["status"] = new_status
    return r


@router.patch("/admin/round/{round_id}/lock")
async def admin_round_lock(round_id: str, admin=Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)

    if db is None:
        raise HTTPException(500, "DB not available")

    r = await db.rounds.find_one({"id": round_id}, {"_id": 0})
    if r is None:
        raise HTTPException(404)

    await db.rounds.update_one(
        {"id": round_id},
        {"$set": {"isLocked": True}},
    )

    r["isLocked"] = True
    return r


@router.patch("/admin/round/{round_id}/unlock")
async def admin_round_unlock(round_id: str, admin=Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)

    if db is None:
        raise HTTPException(500, "DB not available")

    r = await db.rounds.find_one({"id": round_id}, {"_id": 0})
    if r is None:
        raise HTTPException(404)

    await db.rounds.update_one(
        {"id": round_id},
        {"$set": {"isLocked": False}},
    )

    r["isLocked"] = False
    return r

# -------------------------------------------------------------------
# PROBLEMS
# -------------------------------------------------------------------

@router.post("/admin/problem")
async def add_problem(body: ProblemCreate, admin=Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)

    if db is None:
        raise HTTPException(500, "DB not available")

    pid = str(uuid.uuid4())
    doc = body.model_dump()
    doc["id"] = pid

    await db.problems.insert_one(doc)
    return doc


@router.delete("/admin/problem/{pid}")
async def delete_problem(pid: str, admin=Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)

    if db is None:
        raise HTTPException(500, "DB not available")

    await db.problems.delete_one({"id": pid})
    return {"status": "deleted", "id": pid}

# -------------------------------------------------------------------
# -------------------------------------------------------------------
# ADD PARTICIPANT  ✅ FIXED
# -------------------------------------------------------------------

@router.post("/admin/participant")
async def admin_add_participant(
    body: dict,
    admin=Depends(get_current_user),
):
    if admin.role != "admin":
        raise HTTPException(403)

    if db is None:
        raise HTTPException(500, "DB not available")

    name = body.get("name", "").strip()
    email = body.get("email", "").lower().strip()
    password = body.get("password")

    if not name or not email:
        raise HTTPException(400, "Name and email required")

    existing = await db.participants.find_one({"email": email})
    if existing:
        await db.participants.update_one(
            {"email": email},
            {"$set": {"name": name}},
        )
        return await db.participants.find_one({"email": email}, {"_id": 0})

    pid = str(uuid.uuid4())
    doc = {
        "id": pid,
        "name": name,
        "email": email,
        "password": password,  # optional
        "round1Attendance": False,
        "round2Attendance": False,
        "round1TestcasesPassed": 0,
        "round1TotalTestcases": 0,
        "round2TestcasesPassed": 0,
        "round2TotalTestcases": 0,
        "round1Timestamp": None,
        "round2Timestamp": None,
        "round2Eligible": False,
    }

    await db.participants.insert_one(doc)
    doc.pop("_id", None)   # 🔴 REQUIRED
    return doc

