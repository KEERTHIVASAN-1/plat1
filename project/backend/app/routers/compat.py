from fastapi import APIRouter, HTTPException, Depends, Body
from backend.app.models import (
    RunRequest,
    SubmitRequest,
    SubmissionOut,
    UserOut,
    UserLogin,
    TokenResponse,
)
from backend.app.routers.auth import get_current_user
from backend.app.routers.contest import call_piston, LANG_MAP
from backend.app.routers.timer import get_window as timer_get_window
from backend.app.routers.problems import (
    list_problems as api_list_problems,
    get_problem as api_get_problem,
)
from backend.app.routers.contest import user_submissions as api_user_submissions
from backend.app.routers.admin import (
    admin_participants as api_admin_participants,
    admin_participant as api_admin_participant,
    admin_toggle_eligibility as api_admin_toggle_eligibility,
    admin_set_password as api_admin_set_password,
)
from backend.app.routers.timer import (
    start as api_timer_start,
    pause as api_timer_pause,
    restart as api_timer_restart,
    configure as api_timer_configure,
    end as api_timer_end,
)

router = APIRouter(prefix="", tags=["compat"])

# --------------------------------------------------
# RUN (legacy)
# --------------------------------------------------

@router.post("/run")
async def run_legacy(req: RunRequest):
    if not req.code:
        raise HTTPException(400, "Code is required")

    language = LANG_MAP.get(req.language.lower(), req.language.lower())
    data = await call_piston(req.code, language, req.customInput or "")
    run = data.get("run", {})

    return {
        "success": True,
        "output": run.get("output", "") or run.get("stdout", ""),
        "stderr": run.get("stderr", ""),
        "time": run.get("time"),
    }

# --------------------------------------------------
# SUBMIT (legacy)
# --------------------------------------------------

@router.post("/submit", response_model=SubmissionOut)
async def submit_legacy(
    req: SubmitRequest,
    current_user: UserOut = Depends(get_current_user),
):
    from backend.app.routers.contest import submit as contest_submit
    return await contest_submit(req, current_user)

# --------------------------------------------------
# TIMER (legacy)
# --------------------------------------------------

@router.get("/timer/window")
async def timer_window_legacy(roundId: str):
    return await timer_get_window(roundId)

@router.post("/timer/start")
async def timer_start_legacy(
    roundId: str = None,
    durationSeconds: int = None,
    body: dict = Body(None),
):
    b = body or {}
    rid = roundId or b.get("roundId")
    dur = durationSeconds if durationSeconds is not None else b.get("durationSeconds")
    if not rid:
        raise HTTPException(422, "roundId required")
    return await api_timer_start(rid, durationSeconds=dur)

@router.post("/timer/pause")
async def timer_pause_legacy(roundId: str = None, body: dict = Body(None)):
    rid = roundId or ((body or {}).get("roundId"))
    if not rid:
        raise HTTPException(422, "roundId required")
    return await api_timer_pause(rid)

@router.post("/timer/restart")
async def timer_restart_legacy(roundId: str = None, body: dict = Body(None)):
    rid = roundId or ((body or {}).get("roundId"))
    if not rid:
        raise HTTPException(422, "roundId required")
    return await api_timer_restart(rid)

@router.post("/timer/resume")
async def timer_resume_legacy(roundId: str = None, body: dict = Body(None)):
    rid = roundId or ((body or {}).get("roundId"))
    if not rid:
        raise HTTPException(422, "roundId required")
    return await api_timer_restart(rid)

@router.post("/timer/schedule")
async def timer_schedule_legacy(
    roundId: str = None,
    startAt: str = None,
    durationSeconds: int = None,
    body: dict = Body(None),
):
    b = body or {}
    rid = roundId or b.get("roundId")
    start_at = startAt or b.get("startAt")
    dur = durationSeconds if durationSeconds is not None else b.get("durationSeconds")
    duration = int(dur) if dur is not None else None

    if not rid:
        raise HTTPException(422, "roundId required")

    return await api_timer_configure(
        rid,
        duration=duration,
        scheduledStart=start_at,
    )

@router.post("/timer/end")
async def timer_end_legacy(roundId: str = None, body: dict = Body(None)):
    rid = roundId or ((body or {}).get("roundId"))
    if not rid:
        raise HTTPException(422, "roundId required")
    return await api_timer_end(rid)

 

# --------------------------------------------------
# PROBLEMS
# --------------------------------------------------

@router.get("/problems")
async def problems_legacy():
    return await api_list_problems()

@router.get("/problems/{id}")
async def problem_legacy(id: str):
    return await api_get_problem(id)

# --------------------------------------------------
# SUBMISSIONS
# --------------------------------------------------

@router.get("/submissions/{userId}")
async def submissions_legacy(
    userId: str,
    current_user: UserOut = Depends(get_current_user),
):
    return await api_user_submissions(userId, current_user)

# --------------------------------------------------
# ADMIN
# --------------------------------------------------

@router.get("/admin/participants")
async def admin_participants_legacy(
    admin: UserOut = Depends(get_current_user),
):
    return await api_admin_participants(admin)

@router.get("/admin/participant/{participant_id}")
async def admin_participant_legacy(
    participant_id: str,
    admin: UserOut = Depends(get_current_user),
):
    return await api_admin_participant(participant_id, admin)

@router.patch("/admin/participant/{participant_id}/eligibility")
async def admin_toggle_eligibility_legacy(
    participant_id: str,
    admin: UserOut = Depends(get_current_user),
):
    return await api_admin_toggle_eligibility(participant_id, admin)

@router.patch("/admin/participant/{participant_id}/password")
async def admin_set_password_legacy(
    participant_id: str,
    password: str = None,
    admin: UserOut = Depends(get_current_user),
):
    return await api_admin_set_password(participant_id, password, admin)
