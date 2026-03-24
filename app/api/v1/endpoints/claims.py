import uuid
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlalchemy import or_

from app.api import deps
from app.models.user import User
from app.models.claim import Claim, ClaimCreate, ClaimRead, ClaimUpdate, ClaimExpensesUpdate, ClaimReviewSubmit
from app.models.expense import Expense
from app.models.comment import Comment, CommentCreate, CommentRead

router = APIRouter()

@router.get("/", response_model=List[ClaimRead])
def read_claims(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    role: str = "all" # "submitter", "approver", "viewer", "all"
) -> Any:
    """
    Retrieve claims relevant to the current user.
    """
    claims = []
    if role in ["all", "submitter"]:
        sub_claims = db.exec(
            select(Claim).where(Claim.submitter_id == current_user.id)
        ).all()
        claims.extend(sub_claims)
        
    if role in ["all", "approver", "viewer"]:
        all_other_claims = db.exec(
            select(Claim).where(Claim.submitter_id != current_user.id)
        ).all()
        for c in all_other_claims:
            is_approver = c.approver_emails and current_user.email in c.approver_emails
            is_viewer = c.viewer_emails and current_user.email in c.viewer_emails
            
            if role == "all" and (is_approver or is_viewer):
                claims.append(c)
            elif role == "approver" and is_approver:
                claims.append(c)
            elif role == "viewer" and is_viewer:
                claims.append(c)
                
    # Deduplicate
    unique_claims = {c.id: c for c in claims}
    return list(unique_claims.values())

@router.post("/", response_model=ClaimRead)
def create_claim(
    *,
    db: Session = Depends(deps.get_db),
    claim_in: ClaimCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Create new claim."""
    claim = Claim(
        **claim_in.model_dump(),
        submitter_id=current_user.id,
        status="OPEN"
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim

@router.patch("/{id}", response_model=ClaimRead)
def update_claim(
    id: uuid.UUID,
    claim_in: ClaimUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Update a claim title/description/status."""
    claim = db.get(Claim, id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.submitter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    update_data = claim_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(claim, field, value)
        
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim

@router.patch("/{id}/expenses/{expense_id}/status")
def update_claim_expense_status(
    id: uuid.UUID,
    expense_id: uuid.UUID,
    status: str, # "OPEN", "APPROVED", "REJECTED"
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Approvers can update the status of individual expenses within a claim."""
    claim = db.get(Claim, id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    if not claim.approver_emails or current_user.email not in claim.approver_emails:
        raise HTTPException(status_code=403, detail="Only assigned approvers can change expense status")
        
    expense = db.get(Expense, expense_id)
    if not expense or expense.claim_id != id:
        raise HTTPException(status_code=404, detail="Expense not found in this claim")
        
    if status not in ["OPEN", "APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    expense.status = status
    db.add(expense)
    db.commit()
    return {"msg": f"Expense status updated to {status}"}

@router.post("/{id}/close")
def close_claim(
    id: uuid.UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Finalize a claim. Rejected expenses are returned to the open pool."""
    claim = db.get(Claim, id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    is_approver = claim.approver_emails and current_user.email in claim.approver_emails
    if claim.submitter_id != current_user.id and not is_approver:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    expenses = db.exec(select(Expense).where(Expense.claim_id == id)).all()
    
    if any(e.status == "OPEN" for e in expenses):
        raise HTTPException(status_code=400, detail="Cannot close claim: some expenses are still OPEN")
        
    for exp in expenses:
        if exp.status == "REJECTED":
            exp.claim_id = None
            exp.status = "OPEN"
            db.add(exp)
            
    claim.status = "CLOSED"
    db.add(claim)
    db.commit()
    return {"msg": "Claim closed successfully"}

@router.post("/{id}/comments", response_model=CommentRead)
def add_claim_comment(
    id: uuid.UUID,
    comment_in: CommentCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Add a comment to a claim."""
    claim = db.get(Claim, id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    is_approver = claim.approver_emails and current_user.email in claim.approver_emails
    is_viewer = claim.viewer_emails and current_user.email in claim.viewer_emails
    if claim.submitter_id != current_user.id and not (is_approver or is_viewer):
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    comment = Comment(
        text=comment_in.text,
        user_id=current_user.id,
        claim_id=id
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

@router.post("/{id}/expenses")
def add_expenses_to_claim(
    id: uuid.UUID,
    claim_expenses: ClaimExpensesUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Attach multiple open expenses directly to an open claim."""
    claim = db.get(Claim, id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    if claim.submitter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if claim.status != "OPEN":
        raise HTTPException(status_code=400, detail="Cannot assign expenses to a closed or approved claim")
    
    assigned_count = 0
    for exp_id in claim_expenses.expense_ids:
        expense = db.get(Expense, exp_id)
        # Ensure the user owns this expense, and it isn't currently attached to another claim (unless it is)
        if expense and expense.owner_id == current_user.id and expense.status == "OPEN":
            if expense.claim_id is None:
                expense.claim_id = id
                db.add(expense)
                assigned_count += 1
                
    db.commit()
    return {"msg": f"Successfully attached {assigned_count} expenses"}

@router.post("/{id}/review")
def review_claim(
    id: uuid.UUID,
    review_data: ClaimReviewSubmit,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Atomic partial/full claim approval and expense status update."""
    claim = db.get(Claim, id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    if not claim.approver_emails or current_user.email not in claim.approver_emails:
        raise HTTPException(status_code=403, detail="Only assigned approvers can review a claim")

    if claim.status != "OPEN":
        raise HTTPException(status_code=400, detail="Claim is no longer OPEN for review")

    # Update individual expense statuses
    for exp_id, status in review_data.expense_statuses.items():
        if status in ["APPROVED", "REJECTED"]:
            expense = db.get(Expense, exp_id)
            if expense and expense.claim_id == id:
                expense.status = status
                # If rejected, untether from claim for user re-submission? Wait, if we keep them on claim, it's a historical record.
                # However, the user flow says rejected expenses are returned to open pool or just marked as rejected. We'll mark as rejected.
                db.add(expense)

    # Add comment if provided 
    if review_data.comment:
        comment = Comment(
            text=review_data.comment,
            user_id=current_user.id,
            claim_id=id
        )
        db.add(comment)

    # Finally set the overall claim status 
    if review_data.claim_status in ["APPROVED", "PARTIALLY_APPROVED", "REJECTED"]:
        claim.status = review_data.claim_status
        db.add(claim)

    db.commit()
    return {"msg": f"Claim reviewed and set to {review_data.claim_status}"}
