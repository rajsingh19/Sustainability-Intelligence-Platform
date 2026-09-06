import os
import hmac
import hashlib
import base64
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.user import User

# Configuration
AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "sensible-jwt-secret-key-msme-decarb-2026-auth-prod")
TOKEN_EXPIRY_MINUTES = int(os.getenv("AUTH_TOKEN_EXPIRY_MINUTES", "1440"))  # 24 hours
ALGORITHM = "HS256"

def is_auth_dev_mode() -> bool:
    """Return True if dev/test fallback authentication mode is enabled."""
    return os.getenv("AUTH_DEV_MODE", "false").lower() in ("true", "1", "yes")

# Password Hashing Utilities (PBKDF2-HMAC-SHA256)
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"pbkdf2_sha256$100000${salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith("pbkdf2_sha256$"):
            _, iterations_str, salt, key_hex = hashed_password.split("$", 3)
            iterations = int(iterations_str)
        else:
            salt, key_hex = hashed_password.split("$", 1)
            iterations = 100000
        expected_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), iterations)
        return hmac.compare_digest(expected_key.hex(), key_hex)
    except Exception:
        return False

# Base64 URL Safe Encoding / Decoding for JWT Tokens
def _b64_url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64_url_decode(data: str) -> bytes:
    padding = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_access_token(
    user_or_id: Any,
    email: Optional[str] = None,
    username: Optional[str] = None,
    role: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
    expires_in_seconds: Optional[int] = None
) -> str:
    """Generate cryptographically signed HS256 JWT access token."""
    if isinstance(user_or_id, User):
        user_id = str(user_or_id.id)
        user_email = user_or_id.email
        user_username = user_or_id.username
        user_role = user_or_id.role
    else:
        user_id = str(user_or_id)
        user_email = email or ""
        user_username = username or ""
        user_role = role or "USER"

    now = datetime.now(timezone.utc)
    if expires_in_seconds is not None:
        expire = now + timedelta(seconds=expires_in_seconds)
    elif expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=TOKEN_EXPIRY_MINUTES)
    
    header = {"alg": ALGORITHM, "typ": "JWT"}
    payload = {
        "sub": user_id,
        "email": user_email,
        "username": user_username,
        "role": user_role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    
    header_b64 = _b64_url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64_url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(AUTH_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_b64 = _b64_url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_token(token: str) -> Dict[str, Any]:
    """Verify JWT signature, algorithm, format, and expiration."""
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token format")
        
        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        
        expected_sig = hmac.new(AUTH_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        provided_sig = _b64_url_decode(signature_b64)
        
        if not hmac.compare_digest(expected_sig, provided_sig):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")
        
        payload = json.loads(_b64_url_decode(payload_b64).decode("utf-8"))
        
        # Check token expiration
        exp = payload.get("exp")
        if exp is None or int(exp) < int(datetime.now(timezone.utc).timestamp()):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
        
        # Check token type
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        
        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token credentials")

def decode_access_token(token: str) -> Optional[int]:
    """Decode token and return user_id (or None if invalid/expired)."""
    try:
        payload = verify_token(token)
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except Exception:
        return None

def get_or_create_demo_user(db: Session) -> User:
    """Find or seed the canonical demo user."""
    demo_user = db.query(User).filter(User.email == "demo@sensible.local").first()
    if not demo_user:
        demo_user = db.query(User).filter(User.username == "demo_user").first()
    if not demo_user:
        demo_user = User(
            email="demo@sensible.local",
            username="demo_user",
            hashed_password=hash_password("SensibleDemo2026!"),
            organization_name="Tara Engineering Works",
            role="DEMO",
            is_active=True
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
    return demo_user

def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency for authenticating the current user.
    Enforces signed Bearer token authentication in production.
    Gated fallback for automated test suite when AUTH_DEV_MODE=true.

    SECURITY INVARIANT:
    If an Authorization header is present (in ANY form), we MUST validate it
    as a Bearer token. We NEVER fall back to X-User-Id, X-User-Email, or demo
    user when an Authorization header was provided. This closes the bypass where
    a non-Bearer or invalid-format Authorization header could silently fall through
    to DEV mode identity resolution.

    DEV/TEST fallbacks are ONLY triggered when Authorization header is
    completely absent AND AUTH_DEV_MODE=true.
    """
    # ── Path 1: Authorization header is PRESENT ──────────────────────────────
    # Whether Bearer, Basic, or anything else — we must validate it or reject.
    # NEVER fall to DEV fallbacks when this header exists.
    if authorization is not None:
        auth_stripped = authorization.strip()

        # Require "Bearer <token>" format exactly
        if not auth_stripped.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization format. Use: Authorization: Bearer <token>",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = auth_stripped[len("Bearer "):].strip()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Bearer token is empty.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # verify_token raises HTTP 401 on any failure (invalid sig, expired, wrong type)
        payload = verify_token(token)

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user identifier in token")

        try:
            user_id = int(user_id_str)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed user identifier in token")

        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found or deactivated")

        return user

    # ── Path 2: Authorization header is COMPLETELY ABSENT ────────────────────
    # DEV/TEST fallbacks are allowed only here and only when AUTH_DEV_MODE=true.
    if is_auth_dev_mode():
        # Dev / Test fallback: X-User-Id header
        x_user_id = request.headers.get("X-User-Id")
        if x_user_id:
            try:
                user = db.query(User).filter(User.id == int(x_user_id), User.is_active == True).first()
                if user:
                    return user
            except (ValueError, TypeError):
                pass
        
        # Dev / Test fallback: X-User-Email header
        x_user_email = request.headers.get("X-User-Email")
        if x_user_email:
            user = db.query(User).filter(User.email == x_user_email.strip(), User.is_active == True).first()
            if user:
                return user
        
        # Dev / Test fallback: Seeded demo user
        return get_or_create_demo_user(db)

    # 3. Production mode: Missing or invalid authentication token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials required. Please provide a valid Bearer token in the Authorization header.",
        headers={"WWW-Authenticate": "Bearer"}
    )
