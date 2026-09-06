from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
)
from backend.app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_or_create_demo_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(request: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    clean_email = request.email.lower().strip()
    existing_email = db.query(User).filter(User.email == clean_email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    
    username = request.username.strip() if request.username else clean_email.split("@")[0]
    # Ensure unique username
    base_username = username
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}_{counter}"
        counter += 1
    
    user = User(
        email=clean_email,
        username=username,
        full_name=request.full_name.strip() if request.full_name else None,
        hashed_password=hash_password(request.password),
        organization_name=request.organization_name.strip() if request.organization_name else None,
        role="USER",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token(user)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login_user(request: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with username/email and password."""
    raw_identifier = request.username_or_email or request.email or ""
    identifier = raw_identifier.strip().lower()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required."
        )

    user = db.query(User).filter(
        (User.email == identifier) | (User.username == raw_identifier.strip())
    ).first()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been disabled."
        )
    
    token = create_access_token(user)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve profile for the authenticated current user."""
    return UserResponse.model_validate(current_user)

@router.post("/demo-token", response_model=TokenResponse)
def get_demo_token(db: Session = Depends(get_db)):
    """Generate authenticated session token for the demo user."""
    demo_user = get_or_create_demo_user(db)
    token = create_access_token(demo_user)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(demo_user)
    )
