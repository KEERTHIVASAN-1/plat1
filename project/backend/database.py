import os
from dotenv import load_dotenv
import certifi
from pymongo import MongoClient

# Load env when used outside server startup
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "contestdb")

client = MongoClient(
    MONGO_URL,
    tls=True,
    tlsCAFile=certifi.where(),
    tlsAllowInvalidCertificates=False,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
)

try:
    client.admin.command("ping")
    print(">>> MongoDB Connected Successfully")
except Exception as e:
    print(">>> MongoDB Connection FAILED:", e)

db = client[DB_NAME]
