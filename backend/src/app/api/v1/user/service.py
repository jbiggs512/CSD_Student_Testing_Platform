from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from typing import TypeAlias

from app.db.models import User, Role
from app.enums import AccountStatus, UserRole
from app.api.v1.user.schemas import (
    LecturerCreateRequest,
    LecturerUpdateRequest,
    StudentUpdateRequest,
    StudentCreateRequest,
)
from app.core.security import hash_password

ROLE_NOT_FOUND_DETAIL = "Role does not exist."
USERNAME_EXISTS_DETAIL = "Username is already in use."
EMAIL_EXISTS_DETAIL = "Email is already registered."
LECTURER_NOT_FOUND_DETAIL = "Lecturer not found."
STUDENT_NOT_FOUND_DETAIL = "Student not found."

UserCreateRequest: TypeAlias = (
    LecturerCreateRequest | StudentCreateRequest
)


def _get_lecturer_or_404(db: Session, username: str) -> User:
    lecturer = db.scalar(
        select(User)
        .options(joinedload(User.role))
        .join(User.role)
        .where(
            User.username == username,
            Role.role_name == UserRole.LECTURER.value,
        )
    )
    if lecturer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=LECTURER_NOT_FOUND_DETAIL,
        )
    return lecturer


def _get_student_or_404(db: Session, username: str) -> User:
    student = db.scalar(
        select(User)
        .options(joinedload(User.role))
        .join(User.role)
        .where(
            User.username == username,
            Role.role_name == UserRole.STUDENT.value,
        )
    )
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=STUDENT_NOT_FOUND_DETAIL,
        )
    return student

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
        raise HTTPException(
            status_code=422,
            detail=ROLE_NOT_FOUND_DETAIL
        )

    # Check for duplicate username
    existing_username = db.scalar(
        select(User).where(
            User.username == user_data.username
        )
    )

    if existing_username:
        raise HTTPException(
            status_code=409,
            detail=USERNAME_EXISTS_DETAIL
        )

    # Check for duplicate email
    existing_email = db.scalar(
        select(User).where(
            User.email == user_data.email
        )
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail=EMAIL_EXISTS_DETAIL
        )

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


def get_lecturers(db: Session) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .options(joinedload(User.role))
            .join(User.role)
            .where(Role.role_name == UserRole.LECTURER.value)
            .order_by(User.last_name, User.first_name, User.username)
        ).all()
    )


def update_lecturer(
    db: Session,
    username: str,
    changes: LecturerUpdateRequest,
) -> User:
    lecturer = _get_lecturer_or_404(db, username)

    if changes.email is not None:
        existing_email = db.scalar(
            select(User).where(
                User.email == changes.email,
                User.user_id != lecturer.user_id,
            )
        )
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=EMAIL_EXISTS_DETAIL,
            )
        lecturer.email = changes.email

    if changes.first_name is not None:
        lecturer.first_name = changes.first_name
    if changes.last_name is not None:
        lecturer.last_name = changes.last_name
    if changes.password is not None:
        lecturer.password_hash = hash_password(changes.password)
    if changes.account_status is not None:
        lecturer.account_status = changes.account_status

    db.commit()
    db.refresh(lecturer)
    return lecturer


def delete_lecturer(db: Session, username: str) -> None:
    lecturer = _get_lecturer_or_404(db, username)
    db.delete(lecturer)
    db.commit()


def get_students(db: Session) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .options(joinedload(User.role))
            .join(User.role)
            .where(Role.role_name == UserRole.STUDENT.value)
            .order_by(User.last_name, User.first_name, User.username)
        ).all()
    )


def update_student(
    db: Session,
    username: str,
    changes: StudentUpdateRequest,
) -> User:
    student = _get_student_or_404(db, username)

    if changes.email is not None:
        existing_email = db.scalar(
            select(User).where(
                User.email == changes.email,
                User.user_id != student.user_id,
            )
        )
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=EMAIL_EXISTS_DETAIL,
            )
        student.email = changes.email

    if changes.first_name is not None:
        student.first_name = changes.first_name
    if changes.last_name is not None:
        student.last_name = changes.last_name
    if changes.password is not None:
        student.password_hash = hash_password(changes.password)
    if changes.account_status is not None:
        student.account_status = changes.account_status

    db.commit()
    db.refresh(student)
    return student


def delete_student(db: Session, username: str) -> None:
    student = _get_student_or_404(db, username)
    db.delete(student)
    db.commit()


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