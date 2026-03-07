---
trigger: model_decision
description: Apply this rule when adding or modifying API functionality
---

* Create unit tests for each API call. 
* Create tests for different flows.
    * Test Admin Login, Count Users: Login as admin/spinner (email, password).  Verify that the user is admin.  Get the current users, and save the data.
    * Test Other Admin, Verify Users: Then login as admin@example.com/spinner (email, password).  Verify that the user is admin.  Fetch the users, and confirm the users are the same as from the previous call.
    * Create 3 random IDs (<randomID>@example.com, given them display names Test1, Test2, Test3). Confirm that no existing user exists with these 3 test IDs.
    * Test Create Test1 as Admin with Password: Login as admin/spinner, and using that ID, create user Test1 (with password `A$4ptation') as an admin.  Login as Test1, verify that the user is an admin. Verify that the user count has increased by 1. Update user Test1 to change the display name to 'Test1 Verified'.
    * Test Create Test2 as User with Password:  Login as admin@example.com/spinner, and using that ID, create user Test2 (with password `A$4ptation') as a User. Login as Test2  with the password, fetch the user details (using /me), validate them.  Update user Test2 to change the display name to 'Test2 Verified'.
     * Test Create Test3 as User with no Password:  DO NOT CREATE Test3 USING AN ADMIN.  Request a magic link for user Test3, then use the verify magic link api to validate the user.  As User Test3, fetch user details (/me) and validate them.  Update the User details to update the user name to "Test 3 Validated", and set the password to 'A$4ptation'.     

