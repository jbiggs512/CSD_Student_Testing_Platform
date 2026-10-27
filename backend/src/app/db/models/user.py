from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
    Enum as SQLAlchemyEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.enums import AccountStatus


class Role(Base):
    __tablename__ = "roles"

    role_id: Mapped[int] = mapped_column(primary_key=True)
    role_name: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        unique=True,
    )

    # One role can be assigned to many users.
    users: Mapped[list["User"]] = relationship(back_populates="role")

class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        Index("idx_users_status_role", "account_status", "role_id"),
    )

    user_id: Mapped[int] = mapped_column(primary_key=True)

    # Requires role_id to be a foreign key to the roles table, ensuring that each user is assigned a valid role
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.role_id"),
        nullable=False,
    )

    username: Mapped[str] = mapped_column(
        String(8),
        nullable=False,
        unique=True,
    )

    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    
    email: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
        unique=True,
    )
    
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    account_status: Mapped[AccountStatus] = mapped_column(
        SQLAlchemyEnum(
            AccountStatus,
            name="account_status_enum",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=lambda enum_cls: [
                member.value for member in enum_cls
            ],
        ),
        nullable=False,
        default=AccountStatus.PENDING,
        server_default=AccountStatus.PENDING.value
    )

    registration_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        server_default=func.current_date(),
    )
    last_login: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    courses: Mapped[list["Course"]] = relationship(
        secondary="user_courses",
        back_populates="users",
    )

    # Each user has one role.
    role: Mapped["Role"] = relationship(back_populates="users")

    # Each user can have many test attempts.
    test_attempts: Mapped[list["TestAttempt"]] = relationship(
        back_populates="user",
        passive_deletes="all",
    )
