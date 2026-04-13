# Pre-Prod Deployment Plan for PayMeBack

This document outlines the steps To publish the PayMeBack application to a Pre-Prod environment on a LightSail instance.

## User Review Required

> [!IMPORTANT]
> - Ensure all sensitive credentials (DB passwords, AWS keys) are stored securely and **NEVER** committed to version control.
> - The frontend build process embeds the `VITE_API_BASE_URL`. If you build the frontend on your local machine and then upload it, ensure the environment variables are correctly set during the build.
> - Verify that NPM (Nginx Proxy Manager) is correctly configured to forward traffic to the API container's port (likely 8000).

## Infrastructure Overview
- **OS**: Linux (Ubuntu-based LightSail)
- **DB**: PostgreSQL (Containerized: `postgres-master` on `app-network`)
- **Proxy**: Nginx Proxy Manager (NPM)
- **Static Hosting**: Nginx
- **Container Management**: Yacht / Docker Compose

---

## Proposed Directory Structure
To ensure Docker Compose and the Backend correctly locate configuration files, use the following layout on the server:
```text
~/Workspace/PayMeBack/          <-- Root: Run docker-compose commands here
├── app/                        <-- Python Backend code
├── env/                        <-- Environment directory
│   ├── preprod.env             <-- Configuration variables
│   └── credentials.env         <-- Secret variables
├── frontend/                   <-- Frontend source (for building)
├── docker-compose.preprod.yml  <-- Use this to launch the API
└── ...
```

---

## Proposed Steps

### 1. Database Preparation
Create a dedicated database and user for Pre-Prod.
1. Connect to your PostgreSQL instance.
2. Run the following SQL:
   ```sql
   CREATE DATABASE PayMeBack_PreProd;
   CREATE USER pmb_preprod_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE PayMeBack_PreProd TO pmb_preprod_user;
   -- If Postgres 15+, you may also need:
   -- \c PayMeBack_PreProd
   -- GRANT ALL ON SCHEMA public TO pmb_preprod_user;
   ```

### 2. Environment Configuration
Create two `.env` files on the Pre-Prod machine under `env/` (e.g., `/home/username/PayMeBack/env/`):

#### `preprod.env`
```env
# API Config
PROJECT_NAME="PayMeBack Pre-Prod"
FRONTEND_BASE_URL="https://paymeback.ignore.smplfd.in"
API_PORT=8088

# CORS (Required for Browser Security)
# Format: JSON array of strings
BACKEND_CORS_ORIGINS='["https://paymeback.ignore.smplfd.in"]'

# Database Config
DB_HOST="postgres-master"  # Use the container name if in the same Docker network
DB_PORT="5432"
DB_NAME="PayMeBack_PreProd"
DB_USER="pmb_preprod_user"

# Security
ACCESS_TOKEN_EXPIRE_MINUTES=10080
MAGIC_LINK_EXPIRE_MINUTES=15
ENV_FILE=env/preprod.env

# Frontend Build (Important for Vite)
# Note: No quotes needed for Vite env vars unless they contain spaces
VITE_API_BASE_URL=https://apipmb.ignore.smplfd.in
```

#### `credentials.env`
```env
DB_PASSWORD="your_secure_password"

# Initial Superuser (Created on first run)
FIRST_SUPERUSER="admin@smplfd.in"
FIRST_SUPERUSER_PASSWORD="your_super_password"

# If using AWS SES
AWS_ACCESS_KEY_ID="xxx"
AWS_SECRET_ACCESS_KEY="xxx"
AWS_SES_REGION="us-east-1"
AWS_SES_SENDER_EMAIL="noreply@smplfd.in"
```

### 3. API Backend Deployment
Use a slimmed-down `docker-compose.preprod.yml` to launch only the API, as the DB and Nginx are external.

#### [NEW] `docker-compose.preprod.yml`
```yaml
services:
  api:
    build: .
    image: paymeback-api:preprod
    restart: always
    env_file:
      - env/preprod.env
      - env/credentials.env
    ports:
      - "8088:8000"  # Map host port 8088 to container port 8000
    command: bash -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"
    networks:
      - backend_network  # Ensure this matches your shared DB network name

networks:
  backend_network:
    external: true
    name: yacht_default # Or the actual network name Yacht/NPM uses
```
**Steps**:
1. SSH into the Pre-Prod machine.
2. Clone the repo (or pull latest changes).
3. Run: `docker compose -f docker-compose.preprod.yml up -d --build`.

### 4. Frontend Static Publishing
The frontend needs to be built with Pre-Prod environment variables.

#### Build Process:
On the build machine (can be local or the server if it has Node.js):
1. Navigate to `frontend/`.
2. Create or set environment: `export VITE_API_BASE_URL=https://apipmb.ignore.smplfd.in`.
3. Run: `npm install && npm run build`.
4. The output will be in `frontend/dist/`.

#### Publishing:
1. Copy the contents of `frontend/dist/` to the static content directory on LightSail (e.g., `/var/www/paymeback/`).
2. Update your Nginx configuration (managed via NPM or a separate file) to serve this directory for `pmb.ignore.smplfd.in`.

### 5. Proxy Configuration (NPM)
In Nginx Proxy Manager:
- **apipmb.ignore.smplfd.in**: Point to the API container (e.g., `http://localhost:8000`). Enable WebSockets support if needed.
- **pmb.ignore.smplfd.in**: Ensure it points to the Nginx static server or use NPM to serve the static files directly if you prefer.

---

## Tools Reference & Setup

### Installing `uv` (Fast & Modern Python Manager)
`uv` is used for ultra-fast dependency management and virtual environments. It is recommended for the build process.

**Install on Ubuntu/Debian (LightSail):**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env
```

**Build Setup with `uv`:**
```bash
# Sync dependencies and create .venv
uv sync --frozen

# Run migrations manually if needed (outside docker)
uv run alembic upgrade head
```

### Build & Deploy Tools
- **Docker & Docker Compose**: Ensure `docker` and `docker-compose-v2` are installed.
- **Node.js (for Frontend)**: Version 20+ recommended for `npm run build`.

---

## Verification Plan

### Manual Verification
1. **Health Check**: Visit `https://apipmb.ignore.smplfd.in/docs` to verify the API is alive and OpenAPI docs are accessible.
2. **Frontend Load**: Visit `https://pmb.ignore.smplfd.in` and ensure the UI loads.
3. **Connectivity**: Log in using a Magic Link and verify the frontend can successfully call the backend API (check browser DevTools network tab).
4. **Database Check**: Verify that migrations ran correctly by checking the DB tables.
