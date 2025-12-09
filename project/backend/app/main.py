# main.py
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging
from datetime import datetime, timezone
from .db import client
from .routers import status, auth, contest, admin, timer
from .config import CORS_ORIGINS

app = FastAPI(title="Coding Contest Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)

@app.on_event("shutdown")
async def shutdown():
    if client:
        client.close()

app.include_router(status.router)
app.include_router(auth.router)
app.include_router(contest.router)
app.include_router(admin.router)
app.include_router(timer.router)

@app.get("/")
async def root():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}
