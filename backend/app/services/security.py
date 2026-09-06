from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.document import Document
from backend.app.models.user import User
from backend.app.services.auth import is_auth_dev_mode

def get_owned_document(db: Session, document_id: int, current_user: User) -> Document:
    """
    Retrieve document if and only if it is owned by current_user.
    If the document does not exist OR belongs to another user, returns 404 Not Found.
    Never returns 403 to prevent resource enumeration (IDOR protection).
    In DEV/TEST mode (AUTH_DEV_MODE=true), legacy unowned test fixtures (user_id IS NULL)
    are accessible by the dev/test user.
    """
    # Direct ownership check
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    # In DEV/TEST mode only, allow legacy unowned documents created by in-memory test fixtures
    if not doc and is_auth_dev_mode():
        unowned_doc = db.query(Document).filter(
            Document.id == document_id,
            Document.user_id.is_(None)
        ).first()
        if unowned_doc:
            doc = unowned_doc
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )
    return doc
