## User Management

# Existing functionality under /auth
We already have the functionality for a new or existing user to request a magic link to login. There is an API endpoint for verification of the magic link.  We also support login with username and password.  

# New functionality
Summary of new functionality is below:

## Create a User
Create a user (admin only) with display name (optional, default to email), password, email, and role (default to "user").  Restrict this to admin only.

## Update a User
Modify the update user call.  For admin, require the ID of the user being updated, and update only if there is at least one other field to update. For updating self (admin or user), require the ID of the user being updated to match the authenticated user ID, and update if there is at least one other field to update. 

### Admin undelete a User
Modify the undelete user call.  For admin, require the ID of the user being undeleted.  THis can be part of the admin update a user call.

### User Cannot change active state
Active users cannot change their active state.  IF required, they can delete their own account. (Marked as inactive).


## Delete a User
Modify the delete user call.  For admin, require the ID of the user being deleted. For deleting self (admin or user), require the ID of the user being deleted to match the authenticated user ID. 
Deleting a user results in a user being marked as inactive.  

## User Invalidate Sessions.
Authenticated users can invalidate their own sessions.  This results in a logout of the user.

## Admin Invalidate Sessions.
Admin users can invalidate any user's sessions.  This results in a logout of the user.

## Admin View Active Users.
Admin users can view all active users.  This returns a list of users with their ID, email, display name, role, and active state.  Also include the number of sessions for each user, and the last active time.

## User Preferences

### Preferred Currency
Each user has a **preferred currency** field (string).  The default value is `₹` (Indian Rupee symbol).
The preferred currency is returned as part of the user profile (`/me`), and can be updated
via the existing `PATCH /users/me` endpoint (and admin `PATCH /admin/users/{id}`).

### Frequently Used Contacts
A user can maintain a list of **frequently used contacts** (email addresses).
These contacts are people the user commonly interacts with (e.g. approvers for expense claims).

- Contacts are managed under `GET/POST/DELETE /users/me/contacts`.
- Each contact entry stores an email address and an optional label/alias.
- A user cannot add the same email twice (uniqueness enforced).
- Contacts are private to the user — only the owner can view/manage them.
- Admins can view a user's contacts via `GET /admin/users/{id}/contacts`.
