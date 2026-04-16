# PayMeBack: Pre-Prod Deployment & Troubleshooting Guide

This guide summarizes the exact steps and configurations required to successfully deploy the PayMeBack application to a Pre-Production environment (LightSail/Docker stack).

---

## 1. Project Directory Structure
To ensure that Docker Compose and the Python backend can locate configuration files correctly, maintain the following layout on the server:

```text
~/Workspace/PayMeBack/          <-- THE ROOT (Run all commands from here)
├── app/                        <-- Backend source code
├── env/                        <-- Configuration directory
│   ├── preprod.env             <-- Application settings
│   └── credentials.env         <-- SECRET credentials (git-ignored)
├── frontend/                   <-- Frontend source & static assets
├── docker-compose.preprod.yml  <-- Deployment orchestration
└── alembic/                    <-- Migrations
```

---

## 2. Environment Configuration

### `env/preprod.env`
This file contains non-sensitive settings. **Crucially**, it must include `BACKEND_CORS_ORIGINS` to allow the browser to process API requests.

```env
PROJECT_NAME="PayMeBack Pre-Prod"
FRONTEND_BASE_URL="https://paymeback.ignore.smplfd.in"
API_PORT=8088

# CORS (Required for Browser Security)
# Format: JSON array of strings
BACKEND_CORS_ORIGINS=["https://paymeback.ignore.smplfd.in"]

# DB host must match the container name on the shared network
DB_HOST="postgres-master"
DB_PORT="5432"
DB_NAME="paymeback_staging_db"
DB_USER="paymeback_staging_user"

ENV_FILE=env/preprod.env
VITE_API_BASE_URL=https://apipmb.ignore.smplfd.in
```

### `env/credentials.env`
Keep secrets here. **Do not** put these variables in `preprod.env`.

```env
DB_PASSWORD='your_secure_password'
SECRET_KEY='your_random_secret_string'
FIRST_SUPERUSER='admin@yourdomain.com'
FIRST_SUPERUSER_PASSWORD='secure_admin_password'
```

---

## 3. Database & Network Setup

### Shared Network
Ensure the API container joins the existing network used by your database (e.g., `app-network`).
```bash
docker network inspect app-network
```

### PostgreSQL 15+ Permissions
Standard connectivity is not enough. You must grant the application user rights to the `public` schema.

1.  **Connect to DB Host**: `docker exec -it postgres-master psql -U postgres -d paymeback_staging_db`
2.  **Grant Permissions**:
    ```sql
    GRANT ALL ON SCHEMA public TO paymeback_staging_user;
    ALTER SCHEMA public OWNER TO paymeback_staging_user;
    ```

---

## 4. Deployment Execution

Use the specific Pre-Prod compose file from the project root:
```bash
docker compose -f docker-compose.preprod.yml up -d --build
```

---

## 5. Troubleshooting Playbook

### Error: `FATAL: password authentication failed`
- **Cause**: The `DB_PASSWORD` in `credentials.env` does not match the user in Postgres.
- **Fix**: Verify `credentials.env` naming and restart with `--force-recreate`.

### Error: `permission denied for schema public`
- **Cause**: PostgreSQL 15+ security defaults.
- **Fix**: Run the `GRANT ALL ON SCHEMA public` command described in Section 3.

### Container Crash-Loop (API is always restarting)
- **Cause**: Startup command (`alembic upgrade head`) is failing.
- **Diagnostic Mode**:
  1. Change `command` in `docker-compose.preprod.yml` to: `tail -f /dev/null`.
  2. Start container: `docker compose -f docker-compose.preprod.yml up -d`.
  3. Enter container: `docker exec -it paymeback-api-1 bash`.
  4. Run manually: `alembic upgrade head`.
  5. Check environment: `env | grep DB_`.

### Frontend "Connection Refused" or Forever Loading
- **Cause**: Missing `BACKEND_CORS_ORIGINS` or incorrect `VITE_API_BASE_URL` in the frontend build.
- **Fix**: Check browser console (F12) for "CORS Policy" errors. Re-build frontend with correct environment variables.

### Frontend 404 Error on Direct Links (e.g. `/verify`)
- **Cause**: The frontend is a Single Page Application (SPA) using React Router. Nginx doesn't know how to handle direct visits to deep links because actual files don't exist for them on the server.
- **Fix**: Update the Nginx site configuration on your LightSail instance to route all unmatched frontend requests to `index.html`. 
  
  Locate your Nginx configuration block handling the frontend (usually in `/etc/nginx/sites-available/` or similar) and modify the `location /` block to include `try_files`:

  ```nginx
  server {
      server_name paymeback.ignore.smplfd.in;
      root /path/to/your/frontend/dist; # Replace with your actual path
      index index.html;

      location / {
          # This is the critical line for SPAs
          try_files $uri $uri/ /index.html;
      }
      
      # ... other config (SSL, etc) ...
  }
  ```
  After making the change, reload Nginx with: `sudo systemctl reload nginx`.

---

> [!IMPORTANT]
> Always run `docker compose` from the **root** of the repository so that volume mounts (`.:/app`) and relative paths in `.env` files resolve correctly.
