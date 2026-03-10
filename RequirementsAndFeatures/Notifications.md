# Notifications

The app may send notifications to users in the following ways:
- Email (Deferred)
- SMS (Deferred)
- Push Notification


## Use Cases

### System Notifications
As a result of a system event, the app may send notifications to users.  There should be an api to add a notification to the queue, and a cron job to send the notifications.

### Fetch User Notifications
The user should be able to fetch their notifications from the database.  

### Mark Notification as Read
The user should be able to mark a notification as read.  

### Delete Notification
The user should be able to delete a notification.    

### Notification Limits For Auto-Deletion
There should be two  configurable limits, an auto deletion threshold, and a auto deletion amount.  When the number of notifications exceeds the auto deletion threshold, the last *auto deletion amount* notifications are deleted.  This is to prevent the database from getting too large.

