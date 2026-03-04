import boto3
from sqlmodel import Session, select
from sqlalchemy.dialects.postgresql import insert
from datetime import datetime
from fastapi import HTTPException, status
from botocore.exceptions import ClientError

from app.core.config import settings
from app.models.email import EmailDailyLog

def get_ses_client():
    if not settings.ENABLE_EMAILS:
        return None
    
    return boto3.client(
        'ses',
        region_name=settings.AWS_SES_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
    )

def send_email(db: Session, to_address: str, subject: str, body_text: str, body_html: str = None):
    # Check Global Limit
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_emails_today = db.exec(
        select(EmailDailyLog.sent_count).where(EmailDailyLog.date == today)
    ).all()
    
    global_count = sum(total_emails_today) if total_emails_today else 0
    if global_count >= settings.MAX_GLOBAL_EMAILS_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Global daily email limit reached."
        )

    # Check User Limit
    user_log = db.exec(
        select(EmailDailyLog).where(
            EmailDailyLog.email == to_address,
            EmailDailyLog.date == today
        )
    ).first()
    
    if user_log and user_log.sent_count >= settings.MAX_EMAILS_PER_USER_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="User daily email limit reached."
        )

    # Dispatch via SES or Mock
    print(f"[EMAIL] Request received. Dispatching email to {to_address}...")
    if not settings.ENABLE_EMAILS:
        print(f"[EMAIL MOCK] ENABLE_EMAILS is False. Mock email accepted. To: {to_address} | Subject: {subject}")
    else:
        ses_client = get_ses_client()
        try:
            message = {
                'Subject': {'Data': subject},
                'Body': {'Text': {'Data': body_text}}
            }
            if body_html:
                message['Body']['Html'] = {'Data': body_html}

            response = ses_client.send_email(
                Source=settings.AWS_SES_SENDER_EMAIL or "noreply@example.com",
                Destination={'ToAddresses': [to_address]},
                Message=message
            )
            print(f"[EMAIL SES] Accepted and sent successfully to {to_address}. MessageId: {response.get('MessageId')}")
        except ClientError as e:
            print(f"[EMAIL SES ERROR] Failed to send email via SES: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email."
            )

    # Update Database Ledgers
    stmt = insert(EmailDailyLog).values(
        email=to_address,
        date=today,
        sent_count=1
    )
    
    # ON CONFLICT DO UPDATE
    stmt = stmt.on_conflict_do_update(
        index_elements=['email', 'date'],
        set_={'sent_count': EmailDailyLog.sent_count + 1}
    )
    
    db.exec(stmt)
    db.commit()

    return True
