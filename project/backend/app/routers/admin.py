from fastapi import APIRouter, HTTPException, Depends
from ..db import db
from ..auth import get_current_user
from ..models import ProblemCreate
from typing import Optional
import uuid

router = APIRouter(prefix="/api")

@router.get("/admin/participants")
async def admin_participants(admin = Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)
    if not db:
        return []
    try:
        return await db.participants.find({}).to_list(1000)
    except Exception:
        return []

@router.get("/admin/participant/{participant_id}")
async def admin_participant(participant_id: str, admin = Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)
    p = await db.participants.find_one({"id": participant_id})
    if not p:
        raise HTTPException(404)
    return p

@router.patch("/admin/participant/{participant_id}/eligibility")
async def admin_toggle_eligibility(participant_id: str, admin = Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)
    p = await db.participants.find_one({"id": participant_id})
    if not p:
        raise HTTPException(404)
    new_val = not p.get("round2Eligible", False)
    await db.participants.update_one({"id": participant_id}, {"$set": {"round2Eligible": new_val}})
    return {"id": participant_id, "round2Eligible": new_val}

@router.patch("/admin/participant/{participant_id}/password")
async def admin_set_password(participant_id: str, password: Optional[str] = None, admin = Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)
    if not password:
        raise HTTPException(400, "Password required")
    p = await db.participants.find_one({"id": participant_id})
    if not p:
        raise HTTPException(404)
    await db.participants.update_one({"id": participant_id}, {"$set": {"password": password}})
    return {"id": participant_id, "password": "set"}

@router.patch("/admin/round/{round_id}/status")
async def admin_round_status(round_id: str, body: dict, admin = Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)
    r = await db.rounds.find_one({"id": round_id})
    if not r:
        raise HTTPException(404)
    await db.rounds.update_one({"id": round_id}, {"$set": {"status": body.get("status")}})
    r["status"] = body.get("status")
    return r

@router.patch("/admin/round/{round_id}/lock")
async def admin_round_lock(round_id: str, admin = Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)
    r = await db.rounds.find_one({"id": round_id})
    if not r:
        raise HTTPException(404)
    await db.rounds.update_one({"id": round_id}, {"$set": {"isLocked": True}})
    r["isLocked"] = True
    return r

@router.patch("/admin/round/{round_id}/unlock")
async def admin_round_unlock(round_id: str, admin = Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)
    r = await db.rounds.find_one({"id": round_id})
    if not r:
        raise HTTPException(404)
    await db.rounds.update_one({"id": round_id}, {"$set": {"isLocked": False}})
    r["isLocked"] = False
    return r

@router.post("/admin/problem")
async def add_problem(body: ProblemCreate, admin = Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)
    import uuid
    pid = str(uuid.uuid4())
    doc = body.model_dump()
    doc["id"] = pid
    await db.problems.insert_one(doc)
    return doc

@router.delete("/admin/problem/{pid}")
async def delete_problem(pid: str, admin = Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)
    await db.problems.delete_one({"id": pid})
    return {"status": "deleted", "id": pid}
@router.post("/admin/participant")
async def admin_add_participant(name: str, email: str, password: Optional[str] = None, admin = Depends(get_current_user)):
    if admin.role != "admin":
        raise HTTPException(403)
    if not db:
        raise HTTPException(500, "DB not available")
    e = email.lower()
    existing = await db.participants.find_one({"email": e})
    if existing:
        # update name/password if provided
        update = {"name": name}
        if password:
            update["password"] = password
        await db.participants.update_one({"email": e}, {"$set": update})
        p = await db.participants.find_one({"email": e})
        return p
    pid = str(uuid.uuid4())
    doc = {
        "id": pid,
        "name": name,
        "email": e,
        "password": password,
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
    return doc
