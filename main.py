import os
import time
import psycopg
from fastapi import FastAPI
from psycopg.rows import dict_row

app = FastAPI()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://spinner:longirostris@localhost:5432/stenella")

def get_db_connection():
    """Retries connection until the database is ready."""
    retries = 5
    while retries > 0:
        try:
            conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
            print("Successfully connected to the database!")
            return conn
        except psycopg.OperationalError as e:
            retries -= 1
            print(f"Database not ready... (Retries left: {retries}). Error: {e}")
            time.sleep(2)  # Wait 2 seconds before trying again
    
    raise Exception("Could not connect to the database after several attempts.")

@app.get("/")
def check_db_connection():
    try:
        # We call our retry logic here
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                result = cur.fetchone()
                
                cur.execute("SELECT 1 AS status;")
                validation = cur.fetchone()
                
                cur.execute("SELECT current_timestamp;")
                timestamp = cur.fetchone()

                cur.execute("SELECT to_char(current_timestamp - pg_postmaster_start_time(), 'DD \"days\" HH24 \"hours\" MI \"minutes\" SS \"seconds\"') AS formatted_duration;")
                uptime = cur.fetchone()

        return {
            "status": "Success",
            "message": "Connected to Postgres successfully!",
            "database_version": result["version"],
            "query_validation": validation["status"],
            "timestamp": timestamp["current_timestamp"],
            "uptime": uptime["formatted_duration"]
        }
    except Exception as e:
        return {
            "status": "Error",
            "message": str(e)
        }


