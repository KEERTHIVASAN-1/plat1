import os
from rq import Worker, Queue, Connection
import redis
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
conn = redis.from_url(redis_url)

listen = ['submissions']

if __name__ == "__main__":
    with Connection(conn):
        worker = Worker(listen)
        worker.work()

