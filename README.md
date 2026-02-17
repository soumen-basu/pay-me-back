# Setting Up A Basic WebApp: Stenella

## Using ,,`uv`,, for Project Setup

```bash
# Install uv if you haven't
curl -LsSf https://astral.sh/uv/install.sh | sh

# Initialize the project
mkdir stenella && cd stenella
uv init --python 3.12

# Add dependencies
uv add fastapi uvicorn "psycopg[binary]"
```

## Initialize Git

Git is already initialized when initializing `uv`

## Application Code

This code connects to a Postres instance and conducts a basic version check. This is `main.py`

```python
import os
import time
import psycopg
from fastapi import FastAPI
from psycopg.rows import dict_row

app = FastAPI()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://:spinner:longirostris@localhost:5432/stenella")

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

        return {
            "status": "Success",
            "message": "Connected to Postgres successfully!",
            "database_version": result["version"],
            "query_validation": validation["status"]
        }
    except Exception as e:
        return {
            "status": "Error",
            "message": str(e)
        }
```

## Dockerfile for the Python app

Create this `Dockerfile`.

```docker
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
COPY . .
RUN uv sync --frozen

# Use the virtualenv created by uv
ENV PATH="/app/.venv/bin:$PATH"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Orchestration with ,,`docker-compose.yml`

```docker
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: spinner
      POSTGRES_PASSWORD: longirostris
      POSTGRES_DB: stenella
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://spinner:longirostris@db:5432/stenella
    depends_on:
      - db
    volumes:
      - .:/app  # Hot-reloading: changes in code reflect in the container

volumes:
  postgres_data:
```

## Bringing It All Together

How to run:

1. Run `docker-compose up --build`
2. Verify by visting `[http://localhost:8000](http://localhost:8000) The json response with the Postgres version string should be seen.
3. Iterate: Since we used a volume (`.:/app`) in the `web` service, changes in `main.py` will be picked up immediately using `uvicorn`.
