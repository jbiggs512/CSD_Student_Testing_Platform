
from sqlalchemy import select

from app.db.session import SessionLocal
from app.db.models import Role
from app.enums import UserRole

# TODO: Add script to Dockerfile to run this script on container startup. This will ensure that the roles are seeded in the database when the application starts.
def seed_roles() -> None:
    with SessionLocal.begin() as db:
        for role in UserRole:
            existing_role = db.scalar(
                select(Role).where(
                    Role.role_name == role.value
                )
            )

            if existing_role is None:
                db.add(Role(role_name=role.value))
                print(f"Added role: {role.value}")
            else:
                print(f"Role already exists: {role.value}")


if __name__ == "__main__":
    seed_roles()
