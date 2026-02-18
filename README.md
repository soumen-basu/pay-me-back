# Stenella - Foundation for a WebApp

## What is Stenella?
This is a basic foundation for a webapp that has configurations for different environments (development, staging, production) and is dockerized.  It is a starting point for a webapp that can be used to build upon.

In the `dev` and `staging` modes, the changes made to the main Python code are automatically picked up.  Authentication is not done using mails, but by logging the secret url for the user in the DB.  The admin can view the list of users and their secret urls, and can also add new users directly.

In `prod` mode, authentication is done using magic urls, or by using their password, if they have set it up.  Mails will be sent using the Resend API. 

The app is dockerized and can be run using `docker-compose up --build`. 

Stopping the app can be done using `docker-compose down`.

The basic app has a `/` endpoint that checks the connection to the database and returns the version of the database. 
It has a `/me` page which is only shown to authenticated users. It returns the user's email, name (if set, else an option to set it), and an option to set/reset their password. 
The `/admin` page lists all users and their secret urls.  

## How We Got Here: Setting Up A Basic WebApp: Stenella

### Using `uv` for Project Setup

```bash
# Install uv if you haven't
curl -LsSf https://astral.sh/uv/install.sh | sh

# Initialize the project
mkdir stenella && cd stenella
uv init --python 3.12

# Add dependencies
uv add fastapi uvicorn "psycopg[binary]"
```

### Initialize Git

Git is already initialized when initializing `uv`

### Application Code

This code connects to a Postres instance and conducts a basic version check. This is `main.py`

```python
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

### Dockerfile for the Python app

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
### Orchestration with ,,`docker-compose.yml`

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
      - /app/.venv

volumes:
  postgres_data:
```

### Bringing It All Together

### Startup

To start the system with hot reloading enabled:

1.  Run the following command:
    ```bash
    docker compose up --build
    ```
    The `--build` flag ensures that the image is rebuilt if the Dockerfile has changed.

2.  Verify the application is running by visiting [http://localhost:8000](http://localhost:8000). You should see a JSON response with the Postgres version.

### Hot Reloading

Since we mounted the current directory to `/app` in the container and enabled `--reload` in the start command, any changes to `main.py` will automatically trigger a reload of the application.

**Try it out:**
1.  Open `main.py`.
2.  Change the message in the return dictionary.
3.  Save the file.
4.  Refresh [http://localhost:8000](http://localhost:8000) to see the changes immediately.

### Shutdown

To stop the services:

-   Press `Ctrl+C` in the terminal where `docker compose up` is running.
-   To remove the containers and network, run:
    ```bash
    docker compose down
    ```
