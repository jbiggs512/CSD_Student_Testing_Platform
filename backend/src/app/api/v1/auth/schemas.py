# Pydantic request/response models for auth.

from pydantic import BaseModel, EmailStr, Field

from app.api.v1.user.schemas import UserResponse


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, description="Unique account username")
    password: str = Field(..., min_length=1, description="Account password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    message: str
