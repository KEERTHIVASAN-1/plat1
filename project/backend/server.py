import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# FastAPI app
app = FastAPI(title="Contest Backend")

# CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------
# Import Routers (AFTER app)
# --------------------------
from routes import router as core_router
from contest.submit_router import router as submit_router
from contest.problem_router import router as problem_router
from contest.run_router import router as run_router   # <-- NEW router
from timer import router as timer_router

app.include_router(core_router)
app.include_router(submit_router)
app.include_router(problem_router)
app.include_router(run_router)
app.include_router(timer_router)


# --------------------------
# Seed Users
# --------------------------
try:
    from seed_users import seed as seed_users
    seed_users()
except Exception as _e:
    print(">>> Seed users init error:", _e)

# Root
@app.get("/")
def root():
    return {"status": "ok"}
