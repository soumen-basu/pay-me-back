---
trigger: model_decision
description: when working on login related functionality
---

* Initial startup.  At initial startup, ensure that there are two users created, admin@smplfd.in and admin, but should have their password set as 'spinner'.
* When visiting any page, use an access method from an existing session, if available.
* If the user is unauthorized and directed to a page that requires them to be authorized, then after authorization, return them to the original page that they requested.
* If the user's email is available from the session, pre-populate that, but provide an option for them to choose an alternate email.
* Allow the user to either send a magic link by email  (will contain a link that expires in 15 minutes), or to enter their password to validate.  
* Once the user clicks on the validation link recieved by email, they will be taken to the page that they were originally trying to access. 
* Provide an option for the user to logout of the system.
* Ensure that user is activitiy is correctly tracked for the documented system metrics.