from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models import Role, User
from app.db.scripts.common import SeedCounts, load_seed_json
from app.db.scripts.seed_roles import seed_roles
from app.db.session import SessionLocal
from app.enums import AccountStatus, UserRole

DEFAULT_PASSWORD = "Password123!"

ROLE_PASSWORD_ENV_VARS: dict[UserRole, str] = {
    UserRole.ADMIN: "SEED_ADMIN_PASSWORD",
    UserRole.LECTURER: "SEED_LECTURER_PASSWORD",
    UserRole.STUDENT: "SEED_STUDENT_PASSWORD",
}


@dataclass(frozen=True)
class SeedUserSpec:
    """Declarative specification for a seeded platform account."""

    username: str
    first_name: str
    last_name: str
    email: str
    role: UserRole
    account_status: AccountStatus
    password: str = DEFAULT_PASSWORD
    courses: tuple[str, ...] = ()
    registration_days_ago: int = 30
    last_login_hours_ago: int | None = None
    baseline: bool = False


def _load_default_users() -> list[SeedUserSpec]:
    payload = load_seed_json("users.json")
    return [
        SeedUserSpec(
            username=item["username"],
            first_name=item["first_name"],
            last_name=item["last_name"],
            email=item["email"],
            role=UserRole(item["role"]),
            account_status=AccountStatus(item["account_status"]),
            courses=tuple(item.get("courses", ())),
            registration_days_ago=int(item.get("registration_days_ago", 30)),
            last_login_hours_ago=item.get("last_login_hours_ago"),
            baseline=bool(item.get("baseline", False)),
        )
        for item in payload["users"]
    ]


DEFAULT_USERS: list[SeedUserSpec] = _load_default_users()


def resolve_seed_password(
    role: UserRole,
    fallback_password: str,
    *,
    require_custom_passwords: bool = False,
) -> str:
    """Resolve account password from role/default env vars or safe fallback."""
    role_env_name = ROLE_PASSWORD_ENV_VARS[role]
    role_password = os.getenv(role_env_name)
    if role_password:
        return role_password

    default_env_password = os.getenv("SEED_DEFAULT_PASSWORD")
    if default_env_password:
        return default_env_password

    if require_custom_passwords:
        raise ValueError(
            f"Custom seed password required for role '{role.value}'. "
            f"Set {role_env_name} or SEED_DEFAULT_PASSWORD."
        )

    return fallback_password


def _compute_timestamps(
    spec: SeedUserSpec,
    today: date,
    now_naive_utc: datetime,
) -> tuple[date, datetime | None]:
    registration_date = today - timedelta(days=spec.registration_days_ago)
    last_login = (
        now_naive_utc - timedelta(hours=spec.last_login_hours_ago)
        if spec.last_login_hours_ago is not None
        else None
    )
    return registration_date, last_login


def seed_users(
    db: Session,
    *,
    baseline_only: bool = False,
    require_custom_passwords: bool = False,
) -> SeedCounts:
    """Seed admins, lecturers, and students idempotently without overwrites."""
    seed_roles(db)

    roles_by_name = {
        role.role_name: role
        for role in db.scalars(select(Role)).all()
    }
    existing_usernames = {
        username.lower()
        for username in db.scalars(select(User.username)).all()
    }
    existing_emails = {
        email.lower()
        for email in db.scalars(select(User.email)).all()
    }

    target_specs = (
        [spec for spec in DEFAULT_USERS if spec.baseline]
        if baseline_only
        else DEFAULT_USERS
    )

    password_hash_cache: dict[str, str] = {}
    now_naive_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    today = now_naive_utc.date()

    counts = SeedCounts()
    new_users: list[User] = []

    for spec in target_specs:
        # Resolve password even when skipping so --require-custom-passwords fails fast.
        plain_password = resolve_seed_password(
            spec.role,
            spec.password,
            require_custom_passwords=require_custom_passwords,
        )

        if (
            spec.username.lower() in existing_usernames
            or spec.email.lower() in existing_emails
        ):
            counts.skipped += 1
            continue

        if plain_password not in password_hash_cache:
            password_hash_cache[plain_password] = hash_password(plain_password)

        registration_date, last_login = _compute_timestamps(
            spec,
            today,
            now_naive_utc,
        )
        role = roles_by_name[spec.role.value]

        new_users.append(
            User(
                username=spec.username,
                first_name=spec.first_name,
                last_name=spec.last_name,
                email=spec.email,
                password_hash=password_hash_cache[plain_password],
                role_id=role.role_id,
                account_status=spec.account_status,
                registration_date=registration_date,
                last_login=last_login,
            )
        )
        existing_usernames.add(spec.username.lower())
        existing_emails.add(spec.email.lower())
        counts.created += 1

    if new_users:
        db.add_all(new_users)
        db.flush()

    return counts


if __name__ == "__main__":
    with SessionLocal.begin() as db:
        result = seed_users(db)
        print(f"Users seeded: {result.created} created, {result.skipped} skipped.")
