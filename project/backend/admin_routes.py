from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import get_current_user
from models import UserOut

router = APIRouter(prefix="/admin")

@router.get("/users")
def users(current_user: UserOut = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403)
    return list(db.users.find({}, {"_id": 0, "password": 0}))

@router.post("/user/{uid}/role")
def set_role(uid: str, role: str, current_user: UserOut = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403)
    if role not in ("admin", "contestant"):
        raise HTTPException(status_code=400)
    res = db.users.update_one({"id": uid}, {"$set": {"role": role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404)
    return {"id": uid, "role": role}

@router.post("/reset-scores")
def reset_scores(current_user: UserOut = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403)
    db.users.update_many({}, {"$set": {"round1Score": 0, "round2Score": 0}})
    db.participants.update_many({}, {"$set": {
        "round1Attendance": False,
        "round1TestcasesPassed": 0,
        "round1TotalTestcases": 0,
        "round1Timestamp": None,
        "round2Attendance": False,
        "round2TestcasesPassed": 0,
        "round2TotalTestcases": 0,
        "round2Timestamp": None,
    }})
    return {"reset": True}
