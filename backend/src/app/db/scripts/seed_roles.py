from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Role
from app.db.scripts.common import SeedCounts
from app.db.session import SessionLocal
from app.enums import UserRole


def seed_roles(db: Session) -> SeedCounts:
    """Ensure all application user roles exist, returning created/skipped counts."""
    existing_roles = set(db.scalars(select(Role.role_name)).all())
    counts = SeedCounts()
    new_roles: list[Role] = []

    for role in UserRole:
        if role.value in existing_roles:
            counts.skipped += 1
        else:
            new_roles.append(Role(role_name=role.value))
            existing_roles.add(role.value)
            counts.created += 1

    if new_roles:
        db.add_all(new_roles)
        db.flush()

    return counts


if __name__ == "__main__":
    with SessionLocal.begin() as db:
        result = seed_roles(db)
        print(f"Roles seeded: {result.created} created, {result.skipped} skipped.")
