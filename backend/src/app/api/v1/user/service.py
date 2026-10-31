from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException

from typing import TypeAlias

from app.db.models import User, Role
from app.enums import UserRole
from app.api.v1.user.schemas import LecturerCreateRequest
from app.core.security import hash_password

UserCreateRequest: TypeAlias = (
    LecturerCreateRequest
)

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
        raise HTTPException(status_code=422, detail=f"Role '{user_data.role}' does not exist.")

    # Hash the password before storing it in the database.
    hashed_password = hash_password(user_data.password)

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

# TODO: Confirm method of authenticating 'current_user'.
def delete_user(
    db: Session,
    target_username: str,
    # current_user: User
) -> None:

    # Check if the user exists in the database and retrieve it.
    target_user = db.scalar(
        select(User).where
            (User.username == target_username)
    )

    if target_user is None:
        raise HTTPException(status_code=404, detail=f"User '{target_username}' not found.")

    # TODO: Confirm method of authenticating/retrieving 'current_user' before implementing the delete logic.
    #current_role = current_user.role.role_name
    #target_role = target_user.role.role_name


    # Check if the authenticated user has the necessary permissions to delete the user.
    #match target_role:
    #    case UserRole.STUDENT.value:
    #        pass
    #    case UserRole.LECTURER.value:
    #        pass
    #    case UserRole.ADMIN.value:
    #        pass
    #    case _:
    #        pass

    # Delete the user from the database.
    db.delete(target_user)
    db.commit()