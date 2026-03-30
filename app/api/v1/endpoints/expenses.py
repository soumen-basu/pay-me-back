import uuid
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, col

from app.api import deps
from app.models.user import User
from app.models.expense import Expense, ExpenseCreate, ExpenseRead, ExpenseUpdate
from app.models.claim import Claim
from app.crud import crud_notification
from app.schemas.notification import NotificationCreate

router = APIRouter()

@router.get("/", response_model=List[ExpenseRead])
def read_expenses(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    role: str = "submitter" # "submitter", "approver", "viewer", "all"
) -> Any:
    """
    Retrieve expenses. Restricts view to owned expenses or those shared via claims.
    """
    expenses_owned = []
    if role in ["submitter", "all"]:
        expenses_owned = db.exec(
            select(Expense).where(Expense.owner_id == current_user.id)
        ).all()
    
    expenses_shared = []
    if role in ["approver", "viewer", "all"]:
        # Query all claims to check if current user is an approver/viewer
        claims_shared = db.exec(select(Claim)).all()
        
        shared_claim_ids = []
        for c in claims_shared:
            is_approver = c.approver_emails and current_user.email in c.approver_emails
            is_viewer = c.viewer_emails and current_user.email in c.viewer_emails
            
            if role == "all" and (is_approver or is_viewer):
                shared_claim_ids.append(c.id)
            elif role == "approver" and is_approver:
                shared_claim_ids.append(c.id)
            elif role == "viewer" and is_viewer:
                shared_claim_ids.append(c.id)
                
        if shared_claim_ids:
            expenses_shared = db.exec(
                select(Expense).where(Expense.claim_id.in_(shared_claim_ids))
            ).all()
        
    all_expenses = {e.id: e for e in expenses_owned + expenses_shared}
    return list(all_expenses.values())

@router.post("/", response_model=ExpenseRead)
def create_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_in: ExpenseCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new expense.
    """
    expense = Expense(
        **expense_in.model_dump(),
        owner_id=current_user.id,
        status="OPEN"
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

@router.patch("/{id}", response_model=ExpenseRead)
def update_expense(
    id: uuid.UUID,
    expense_in: ExpenseUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update an expense.
    """
    expense = db.get(Expense, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if expense.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Disallow currency change if expense is attached to a claim
    update_data = expense_in.model_dump(exclude_unset=True)
    if "currency_code" in update_data and expense.claim_id is not None:
        raise HTTPException(
            status_code=400,
            detail="Cannot change currency on an expense attached to a claim. Detach it first."
        )

    for field, value in update_data.items():
        setattr(expense, field, value)
        
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

@router.delete("/{id}")
def delete_expense(
    id: uuid.UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete an expense.
    """
    expense = db.get(Expense, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if expense.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db.delete(expense)
    db.commit()
    return {"msg": "Expense deleted"}

from app.models.comment import Comment, CommentCreate, CommentRead


@router.get("/descriptions", response_model=List[str])
def get_expense_descriptions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Return distinct expense descriptions for the current user.
    Used for autocomplete in the frontend.
    """
    results = db.exec(
        select(col(Expense.description))
        .where(Expense.owner_id == current_user.id)
        .distinct()
        .order_by(col(Expense.description))
    ).all()
    return list(results)

@router.post("/{id}/comments", response_model=CommentRead)
def add_expense_comment(
    id: uuid.UUID,
    comment_in: CommentCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    expense = db.get(Expense, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    has_permission = False
    if expense.owner_id == current_user.id:
        has_permission = True
    elif expense.claim_id:
        claim = db.get(Claim, expense.claim_id)
        if claim:
            if claim.approver_emails and current_user.email in claim.approver_emails:
                has_permission = True
            elif claim.viewer_emails and current_user.email in claim.viewer_emails:
                has_permission = True
                
    if not has_permission:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    comment = Comment(
        text=comment_in.text,
        user_id=current_user.id,
        expense_id=id
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    # Notify the owner if the commenter is NOT the owner
    if current_user.id != expense.owner_id:
        crud_notification.create_notification(
            db,
            obj_in=NotificationCreate(
                user_id=expense.owner_id,
                title=f"New Comment on Item: {expense.description}",
                content=f"{current_user.email} commented on an item in your claim."
            )
        )
        
    return comment

@router.get("/{id}/comments", response_model=List[CommentRead])
def get_expense_comments(
    id: uuid.UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    expense = db.get(Expense, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    has_permission = False
    if expense.owner_id == current_user.id:
        has_permission = True
    elif expense.claim_id:
        claim = db.get(Claim, expense.claim_id)
        if claim:
            if claim.approver_emails and current_user.email in claim.approver_emails:
                has_permission = True
            elif claim.viewer_emails and current_user.email in claim.viewer_emails:
                has_permission = True
                
    if not has_permission:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    comments = db.exec(
        select(Comment)
        .where(Comment.expense_id == id)
        .order_by(Comment.created_at.asc())
    ).all()
    
    return comments
