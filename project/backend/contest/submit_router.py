from fastapi import APIRouter, Depends, HTTPException
from models import SubmitRequest, UserOut
from auth import get_current_user
from database import db
from jobs import process_submission

router = APIRouter()


@router.post("/submit")
def submit_code(req: SubmitRequest, current_user: UserOut = Depends(get_current_user)):
    if current_user.role != "admin" and current_user.id != req.userId:
        raise HTTPException(status_code=403, detail="Cannot submit for another user")

    payload = {
        "userId": req.userId,
        "problemId": req.problemId,
        "code": req.code,
        "language": req.language,
        "round": req.round,
    }

    try:
        result = process_submission(payload)
        return {"success": True, "result": result}
    except Exception as exc:
        return {"success": False, "message": str(exc)}


@router.get("/submissions/{user_id}")
def get_user_submissions(user_id: str):
    items = list(
        db.submissions.find({"userId": user_id}, {"_id": 0}).sort("timestamp", -1)
    )
    return items