# Expenses and Categories

Any authenticated user can create, modify or delete expenses.  Expenses must be tagged with categories. (Use a 'Default' category, if none is provided).  Categories are also user specific, and can be created, modified or deleted by the user.    

## Categories
(Hint: Categories are most importantly a string, like 'Stationery', 'Food', 'Travel', etc.  Consider using a model with a string as the primary key.)  

Users can create, list, or delete categories.  Categories are user specific.   User can view all the categories they have created, and can also delete them. Deleting a category only removes the option of that category for the user in the future. Any existing expenses tagged with that category will be unchanged.  (Hint: Maintain an active/inactive flag for a category.  The user can only select from active categories.  'Deleting' a category marks it inactive.  If the user adds a 'new' category (same name as an inactive category), it should be marked as active.  This allows the user to reuse categories, while maintaining a consistent history. ) We disallow editing categories if there any expenses are tagged with that category, with a warning to the user, and suggest they create a new category instead.  

## Expenses

The user can create, modify or delete expenses.  Expenses must be tagged with categories. (Use a 'Default' category, if none is provided).  Expenses have a state, they start in an open state (identified by '?'), closed ('✓') or rejected ('✗').  Multiple comments can be added to an expense. 

## Report

The user can create a report, with a title, automatic creation date and description, to which they can add expenses.  Reports can be open, approved or rejected.  Once Approved or Rejected, they are archived  ond only the Approver can change the state of the report.  They can add approver and viewers to the report by providing their email id, or fetching recently used email IDs.  Once an approver or commenter is added to a report, they can comment on the expenses.  Approvers can also change the state of the expense to (?/✓/✗).  Once all expenses in a report are either approved or rejected, the report is closed, and the parent can finally **Pay The Student Back**.  Rejected expenses are returned to the pool of open expenses, approved expenses are removed and the bag/report is archived.  Comments can also be added to a report by the user, approvers or commenter.
