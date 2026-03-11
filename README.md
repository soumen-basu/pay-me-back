# PayMeBack - A Simple Expense Manager

## What is PayMeBack?
PayMeBack is a webapp that allows users to manage their expenses.  It has a simple admin interface that allows admins to manage users, and a simple user interface that allows users to manage their expenses.

### Tech Stack
- Backend: FastAPI
- Frontend: React
- Database: PostgreSQL
- Containerization: Docker
- Orchestration: Docker Compose

## Core Functionality

### Admin Functionality
Admins can create, modify or delete users, and can also invalidate a users sessions.  Admins have access to dashboards and reports of Daily Active Users, Monthly Active Users, Signups, and other tracking metrics.

### Login Functionality
Users can be created directly by admins, else users can sign up via magic email link.  Users can view their own profile page, where they can set an optional password, and can set their display name (default is their email ID).  

### Expense Functionality
Users can add expenses, tagged with their own categories.  They can group a set of expenses into a bag or report, and send it to someone to be paid back. This is ideal for a college student to track their expenses and ask their parents to **Pay Me Back**.  Once submitted the parent and student can add comments on the expenses for clarifications or modifications.  Once the parent is clear about any expense, they can tick it as done (or reject it for some reason).  Once all expenses in a report are either approved or rejected, the report is closed, and the parent can finally **Pay The Student Back**.  Rejected expenses are returned to the pool of open expenses, approved expenses are removed and the bag/report is archived.

## Configuration - Environments
This is a basic foundation for a webapp that has configurations for different environments (development, staging, production) and is dockerized.  It is a starting point for a webapp that can be used to build upon.

In the `dev` and `staging` modes, the changes made to the main Python code are automatically picked up.  Authentication is not done using mails, but by logging the secret url for the user in the DB.  The admin can view the list of users and their secret urls, and can also add new users directly.

In `prod` mode, authentication is done using magic urls, or by using their password, if they have set it up.  Mails will be sent using the Resend API. 

The app is dockerized and can be run using `ENV_FILE=env/local.env docker compose --env-file env/local.env up -d --build`. 
You can specify different environment files (like `env/test.env` or `env/staging.env`) by changing the `ENV_FILE` and `--env-file` arguments. 

Stopping the app can be done using `docker compose down`.

The basic app has a `/` endpoint that checks the connection to the database and returns the version of the database. 
It has a `/me` page which is only shown to authenticated users. It returns the user's email, name (if set, else an option to set it), and an option to set/reset their password. 
The `/admin` page lists all users and their secret urls.  

# PayMeBack - Technical Overview

## What is PayMeBack?
PayMeBack is a webapp that allows users to manage their expenses.  It has a simple admin interface that allows admins to manage users, and a simple user interface that allows users to manage their expenses.  It is based on the [Stenella](https://github.com/soumen-basu/stenella) web app template.  This template provides basic user authentication, and a dockerized, configuration driven environment for the app.

In its current state, PayMeBack consists of:
- **FastAPI Backend (`/app`)**: Provides high-performance, asynchronous endpoints connecting securely to PostgreSQL. 
- **Vite + React Frontend (`/frontend`)**: A decoupled, modern web user interface, employing glassmorphism aesthetics.
- **PostgreSQL (`/db`)**: Containerized local database. 

## High Level Architecture
PayMeBack takes a clean, decoupled approach by strictly physicalizing the split between backend and frontend. 
- API service runs natively on port `8000`. 
- The React application is built through Vite and served to port `3000`.
- CORS (Cross-Origin Resource Sharing) is configured via standard `.env` configuration allowing native connectivity between the frontend interface and the API models inside the development docker environment.

## Getting Started

### Prerequisites
PayMeBack uses Docker-Compose for unified system orchestration. 

### Bootstrapping your Environment

1. Setup development environment variables:
   Copy or configure a `.env` in your root tree, containing your `DATABASE_URL` and `BACKEND_CORS_ORIGINS`. And an environment variable `VITE_API_BASE_URL` in the `frontend/.env` file.
   
   **Secret Credentials:**
   If you have private credentials (like AWS SES keys), you should structure them in `env/credentials.env` which is ignored by Git by default securely.
   ```bash
   ENABLE_EMAILS=True
   AWS_ACCESS_KEY_ID=your_real_access_key
   AWS_SECRET_ACCESS_KEY=your_real_secret_key
   AWS_SES_SENDER_EMAIL=verified_sender@example.com
   ```

2. Start the orchestrated containers using docker compose for your target environment (e.g., local):
   ```bash
   ENV_FILE=env/local.env docker compose --env-file env/local.env up -d --build
   ```

3. Open your browser:
   * View the React frontend: [http://localhost:3000](http://localhost:3000)
   * View the API docs (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)

### Forking and Renaming (Template Strategy)

PayMeBack is designed to be a base template for future projects. Instead of copying the directory, use Git to retain the ability to pull future upstream fixes.

1. **Clone and Setup Remote:**
   ```bash
   git clone git@github.com:soumen-basu/PayMeBack.git my-awesome-app
   cd my-awesome-app
   
   # Rename the original reference to "upstream" so you can pull fixes later
   git remote rename origin upstream
   
   # Add your new remote
   git remote add origin git@github.com:soumen-basu/my-awesome-app.git
   ```

2. **Initialize the New Project Name:**
   Run the initialization script to rename all internal references of "PayMeBack" to your new project name:
   ```bash
   ./init_project.sh my-awesome-app
   ```
   
   Carefully review the changes using `git status` and `git diff`, test the build, then commit and push to your new origin.

3. **Pulling Upstream Fixes (Later):**
   If a bug is fixed in the core PayMeBack boilerplate, you can pull it into your new project:
   ```bash
   git fetch upstream
   git merge upstream/main
   ```

### Continuous Integration (CI)

This repository includes a default GitHub Actions workflow (`.github/workflows/test.yml`). When you push to `main` or open a Pull Request, it automatically provisions a secure runner, stands up the Docker containers, and executes the integration test suite (`run_tests.sh`). Ensure this workflow continues passing when you adapt the template.

### Viewing Logs
To view the real-time logs for the API service, ensure you specify the correct environment file:
```bash
ENV_FILE=env/local.env docker compose --env-file env/local.env logs -f api
```

### Shutdown
To stop all PayMeBack services, run:
```bash
docker compose down
```
