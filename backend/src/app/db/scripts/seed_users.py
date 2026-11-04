from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models import Role, User
from app.db.scripts.seed_roles import seed_roles
from app.db.session import SessionLocal
from app.enums import AccountStatus, UserRole

DEFAULT_PASSWORD = "Password123!"


@dataclass(frozen=True)
class SeedUserSpec:
    username: str
    first_name: str
    last_name: str
    email: str
    role: UserRole
    account_status: AccountStatus
    password: str = DEFAULT_PASSWORD


DEFAULT_USERS: list[SeedUserSpec] = [
    SeedUserSpec(
        username="admin",
        first_name="System",
        last_name="Admin",
        email="admin@weston.ac.uk",
        role=UserRole.ADMIN,
        account_status=AccountStatus.ACTIVE,
    ),
    SeedUserSpec(
        username="lecturer",
        first_name="Jane",
        last_name="Lecturer",
        email="lecturer@weston.ac.uk",
        role=UserRole.LECTURER,
        account_status=AccountStatus.ACTIVE,
    ),
    SeedUserSpec(
        username="student",
        first_name="Alex",
        last_name="Student",
        email="student@weston.ac.uk",
        role=UserRole.STUDENT,
        account_status=AccountStatus.ACTIVE,
    ),
    SeedUserSpec(
        username="student.pending",
        first_name="Sam",
        last_name="Pending",
        email="student.pending@weston.ac.uk",
        role=UserRole.STUDENT,
        account_status=AccountStatus.PENDING,
    ),
]


def seed_users(db: Session) -> None:
    seed_roles(db)
    db.flush()

    roles_by_name = {
        role.role_name: role
        for role in db.scalars(select(Role)).all()
    }

    for spec in DEFAULT_USERS:
        existing_user = db.scalar(
            select(User).where(
                (User.username == spec.username) | (User.email == spec.email)
            )
        )

        if existing_user is not None:
            print(f"User already exists: {spec.username}")
            continue

        role = roles_by_name[spec.role.value]
        user = User(
            username=spec.username,
            first_name=spec.first_name,
            last_name=spec.last_name,
            email=spec.email,
            password_hash=hash_password(spec.password),
            role_id=role.role_id,
            account_status=spec.account_status,
        )
        db.add(user)
        print(
            f"Added user: {spec.username} "
            f"(role={spec.role.value}, status={spec.account_status.value})"
        )


if __name__ == "__main__":
    with SessionLocal.begin() as db:
        seed_users(db)
