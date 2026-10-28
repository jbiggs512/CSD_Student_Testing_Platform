# Business logic for auth. Keep routes thin, put the real work here.
# Example:
# def authenticate_user(email: str, password: str) -> str:
#     ...

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import User, Role
from app.enums import AccountStatus
from app.api.v1.user.schemas import LecturerCreateRequest
# from app.security import hash_password - could be a better approach in the future.

from typing import TypeAlias

UserCreateRequest: TypeAlias = (
    LecturerCreateRequest
)

def hash_password(password: str) -> str:
    # Implement password hashing logic here or security app logic
    pass

def create_user(
    db: Session,
    user_data: UserCreateRequest,
) -> User:
    
    # DB Role Check
    role = db.scalar(
        select(Role).where(
            Role.role_name == user_data.role
        )
    )

    if role is None:
        raise ValueError(f"Role '{user_data.role}' does not exist in the database.")

    # Hash the password before storing it in the database.
    # TODO: Implement actual password hashing logic. For now, we are just using the plain password.
    # WARNING: Storing plain passwords is insecure. Implement proper hashing before production.
    hashed_password = user_data.password

    # Create the SQLAlchemy user object.
    user = User(
        username=user_data.username,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        password_hash=hashed_password,
        role_id=role.role_id,
        account_status=user_data.account_status,
    )

    # Save the user to the database.
    db.add(user)
    db.commit()
    db.refresh(user)

    return user
