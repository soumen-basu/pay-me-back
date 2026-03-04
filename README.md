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

# Stenella - Foundation for a WebApp

## What is Stenella?
Stenella is a highly responsive, high-performance base web framework designed for rapid web application development. It comes properly dockerized right off the shelf, with distinct separations of concern.

In its current state, Stenella consists of:
- **FastAPI Backend (`/app`)**: Provides high-performance, asynchronous endpoints connecting securely to PostgreSQL. 
- **Vite + React Frontend (`/frontend`)**: A decoupled, modern web user interface, employing glassmorphism aesthetics.
- **PostgreSQL (`/db`)**: Containerized local database. 

## High Level Architecture
Stenella takes a clean, decoupled approach by strictly physicalizing the split between backend and frontend. 
- API service runs natively on port `8000`. 
- The React application is built through Vite and served to port `3000`.
- CORS (Cross-Origin Resource Sharing) is configured via standard `.env` configuration allowing native connectivity between the frontend interface and the API models inside the development docker environment.

## Getting Started

### Prerequisites
Stenella uses Docker-Compose for unified system orchestration. 

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

2. Start the orchestrated containers using docker compose:
   ```bash
   docker compose up -d --build
   ```

3. Open your browser:
   * View the React frontend: [http://localhost:3000](http://localhost:3000)
   * View the API docs (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)

### Shutdown
To stop all Stenella services, run:
```bash
docker compose down
```
