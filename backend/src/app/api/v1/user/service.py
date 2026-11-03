from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from typing import TypeAlias

from app.db.models import User, Role
from app.enums import AccountStatus, UserRole
from app.api.v1.user.schemas import LecturerCreateRequest, StudentCreateRequest
from app.core.security import hash_password

UserCreateRequest: TypeAlias = (
    LecturerCreateRequest | StudentCreateRequest
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


def delete_user(
    db: Session,
    target_username: str,
    current_user: User,
) -> None:
    # Check if the user exists in the database and retrieve it.
    target_user = db.scalar(
        select(User)
        .options(joinedload(User.role))
        .where(User.username == target_username)
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{target_username}' not found.",
        )

    if current_user.username == target_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Users cannot delete their own account.",
        )

    current_role = current_user.role.role_name
    target_role = target_user.role.role_name

    # Check if the authenticated user has the necessary permissions to delete the user.
    match target_role:
        case UserRole.STUDENT.value:
            if current_role not in {UserRole.LECTURER.value, UserRole.ADMIN.value}:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only lecturers or admins can delete student accounts.",
                )
        case UserRole.LECTURER.value:
            if current_role != UserRole.ADMIN.value:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can delete lecturer accounts.",
                )
        case UserRole.ADMIN.value:
            if current_role != UserRole.ADMIN.value:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can delete admin accounts.",
                )
        case _:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to delete this user.",
            )

    # Delete the user from the database.
    db.delete(target_user)
    db.commit()


def approve_student(
    db: Session,
    target_username: str,
    current_user: User,
) -> User:
    if current_user.role.role_name not in {UserRole.LECTURER.value, UserRole.ADMIN.value}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only lecturers or admins can approve student accounts.",
        )

    target_user = db.scalar(
        select(User)
        .options(joinedload(User.role))
        .where(User.username == target_username)
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{target_username}' not found.",
        )

    if target_user.role.role_name != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User '{target_username}' is not a student account.",
        )

    if target_user.account_status != AccountStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student account '{target_username}' is not pending approval.",
        )

    target_user.account_status = AccountStatus.ACTIVE
    db.commit()
    db.refresh(target_user)

    return target_user