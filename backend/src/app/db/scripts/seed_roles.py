
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import Role
from app.enums import UserRole


def seed_roles(db: Session) -> None:
    for role in UserRole:
        existing_role = db.scalar(
            select(Role).where(Role.role_name == role.value)
        )

        if existing_role is None:
            db.add(Role(role_name=role.value))
            print(f"Added role: {role.value}")
        else:
            print(f"Role already exists: {role.value}")


if __name__ == "__main__":
    with SessionLocal.begin() as db:
        seed_roles(db)
