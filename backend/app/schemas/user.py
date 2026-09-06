from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    username: Optional[str] = None
    organization_name: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: Optional[str] = None
    username_or_email: Optional[str] = None
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    organization_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
