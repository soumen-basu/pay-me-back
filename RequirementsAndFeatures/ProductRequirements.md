---
trigger: always_on
---

# Stenella

This is meant to be a base webapp foundation on which applications can be built. 

## Objectives
1. Provide a basic webapp that has an integrated database, has a public landing page, a login page where users can login, and a profile page that allows the user to view/edit their display name and password. 
2. Create an API for the backend user creation.


## Requirements
### Integrated DB
1. There must be an integrated DB for the persistent logic that will be built.  There must be a user table, which tracks a user's email, display name (optional) and password (optional), and the time at which their authentication will expire.
2. User session information can also be stored in the DB.  
3. User authentication should be valid only for 5 minutes, session data should be expired after 1 week since the last login.


### Docker Setup
1. Project should be setup in docker so that code written in the main python webapp is hot reloaded, and the associated DB is bought up together with the application.  Focus on working in `development` mode for now.

### Startup
1. By default, create a default admin ('admin'/'spinner') if there are no users in the table.
1. User have a defined role, either 'Admin' or 'User' (default).

## Pages

## Authentication
When a user succesfully logs in, create a JWT, and use that for authentication.  On each request, redirect the user to re-authenticate if the JWT is not valid.

### Home page on the webapp ('/')
A simple dummy page showing a picture of a spinner dolphin, and showing basic stats from the database (uptime, current time, some validation). If the user is logged in, welcome the user, using their display name if available, else email.  If not logged in, provide buttons for the user to log in using email, with either a password, or a magic link. 

#### API: Request Magic Link
The backend exposes `POST /api/v1/auth/magic-link`. Upsert the users email in the user table, and create a magic token that is stored against their record. Construct the magic link to be sent to the user and send the mail (in development, this will log to console).

### Web: Magic link validation page ('/verify?email=...&token=...')
The user receives an email which asks them to click on the included link to login. The web app serves a route like `/verify` that extracts the email and token, and calls the backend API `GET /api/v1/auth/verify`.
If the API returns failure, report the error and keep them on the login page. On success, use the returned JWT for authentication and redirect the user to their profile at `/me`.

#### API: Verify Magic Link
The backend `GET /api/v1/auth/verify` endpoint validates the email and token. It reports failure using standard API error codes if invalid or expired. On success, it creates a session for the user (if DB sessions are enabled in config) and returns the JWT as a JSON response.

### Profile ('/me')
Display the user's profile page.  Display their email ID.  Show the display name if set, or allow the user to set their display name.  Show a checked box if their password is set.  Provide a mechanism to update their password if they wish.  Use standard password checking constraints (8-32 chars, lower and upper alpha, numeric, special character required.).

### API 
Create an API for the backend. A user can login with their username (email) and password.  If a user has the admin role, they can manage users.  (CRUD on all users).  A regular user with the 'User' role can only view their own profile, and can update their password and display name.