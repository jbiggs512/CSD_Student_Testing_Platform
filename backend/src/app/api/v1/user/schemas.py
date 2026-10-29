from abc import abstractmethod, ABC
from pydantic import BaseModel, EmailStr, Field, AliasPath
from datetime import date, datetime

from app.enums import UserRole, AccountStatus

class BaseUserCreateRequest(BaseModel, ABC):
    username: str
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    courses: list[int] | None = None  # Optional list of course IDs to associate with the user

    @property
    @abstractmethod
    def role(self) -> str:
        """Implemented by subclasses to return the role of the user being created."""
        pass

    @property
    @abstractmethod
    def account_status(self) -> str:
        """Account status is determined by the role of the user being created."""
        pass

class LecturerCreateRequest(BaseUserCreateRequest):
    @property
    def role(self) -> str:
        return UserRole.LECTURER.value
    
    @property
    def account_status(self) -> str:
        return AccountStatus.ACTIVE.value

class UserResponse(BaseModel):
    user_id: int
    username: str
    first_name: str
    last_name: str
    email: EmailStr
    role: UserRole = Field(validation_alias=AliasPath("role", "role_name"))
    account_status: AccountStatus
    registration_date: date
    last_login: datetime | None

    model_config = {"from_attributes": True}