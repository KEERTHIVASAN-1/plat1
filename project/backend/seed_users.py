import os
from database import client
from utils import hash_password

def seed():
    db = client[os.getenv("DB_NAME", "contestdb")]
    try:
        if not db.users.find_one({"email": "admin@test.com"}):
            db.users.insert_one({
                "id": "admin",
                "name": "Admin User",
                "email": "admin@test.com",
                "password": hash_password("admin123"),
                "role": "admin",
                "round1Score": 0,
                "round2Score": 0,
            })
            print(">>> Seeded admin@test.com")
        if not db.users.find_one({"email": "student@test.com"}):
            db.users.insert_one({
                "id": "student",
                "name": "Student User",
                "email": "student@test.com",
                "password": hash_password("password123"),
                "role": "contestant",
                "round1Score": 0,
                "round2Score": 0,
            })
            print(">>> Seeded student@test.com")
    except Exception as e:
        print(">>> Seed users failed:", e)
