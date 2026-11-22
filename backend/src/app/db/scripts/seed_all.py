import argparse
from dataclasses import dataclass
import os
from pathlib import Path
import sys

from alembic import command as alembic_command
from alembic.config import Config as AlembicConfig
from sqlalchemy.orm import Session

from app.db.scripts.common import SeedCounts, verify_schema_ready
from app.db.scripts.seed_courses import seed_courses
from app.db.scripts.seed_roles import seed_roles
from app.db.scripts.seed_test import seed_test_data
from app.db.scripts.seed_test_attempt import seed_test_attempt_data
from app.db.scripts.seed_user_courses import seed_user_courses
from app.db.scripts.seed_users import ROLE_PASSWORD_ENV_VARS, seed_users
from app.db.session import SessionLocal


@dataclass
class SeedReport:
    """Structured summary of all records processed across a full seed run."""

    roles: SeedCounts
    courses: SeedCounts
    subjects: SeedCounts
    questions: SeedCounts
    tests: SeedCounts
    users: SeedCounts
    user_courses: SeedCounts
    test_attempts: SeedCounts

    def format_summary(self, *, dry_run: bool = False) -> str:
        header = (
            "Seed Summary [DRY RUN — rolled back]:"
            if dry_run
            else "Seed Summary:"
        )
        rows = (
            ("Roles", self.roles),
            ("Courses", self.courses),
            ("Subjects", self.subjects),
            ("Questions", self.questions),
            ("Tests", self.tests),
            ("Users", self.users),
            ("Enrollments", self.user_courses),
            ("Attempts", self.test_attempts),
        )
        lines = [header]
        for label, counts in rows:
            lines.append(
                f"  {label:<12}: {counts.created:>4} created, {counts.skipped:>4} skipped"
            )
        return "\n".join(lines)


def run_migrations() -> None:
    """Apply pending Alembic database migrations up to head."""
    backend_dir = Path(__file__).resolve().parents[4]
    alembic_cfg = AlembicConfig(str(backend_dir / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    alembic_command.upgrade(alembic_cfg, "head")


def seed_all(
    db: Session,
    *,
    baseline_only: bool = False,
    require_custom_passwords: bool = False,
) -> SeedReport:
    """Seed the complete database dependency graph idempotently within caller's session."""
    verify_schema_ready(db)

    roles = seed_roles(db)
    courses = seed_courses(db, baseline_only=baseline_only)
    curriculum = seed_test_data(db, baseline_only=baseline_only)
    courses.created += curriculum.courses.created
    users = seed_users(
        db,
        baseline_only=baseline_only,
        require_custom_passwords=require_custom_passwords,
    )
    user_courses = seed_user_courses(db, baseline_only=baseline_only)
    test_attempts = seed_test_attempt_data(db, baseline_only=baseline_only)

    return SeedReport(
        roles=roles,
        courses=courses,
        subjects=curriculum.subjects,
        questions=curriculum.questions,
        tests=curriculum.tests,
        users=users,
        user_courses=user_courses,
        test_attempts=test_attempts,
    )


def _warn_if_prod_uses_default_passwords() -> None:
    if os.getenv("SEED_ENV", "").strip().lower() != "prod":
        return

    has_default = bool(os.getenv("SEED_DEFAULT_PASSWORD"))
    has_all_role_vars = all(
        bool(os.getenv(env_name)) for env_name in ROLE_PASSWORD_ENV_VARS.values()
    )
    if not (has_default or has_all_role_vars):
        print(
            "Warning: SEED_ENV=prod is set without SEED_DEFAULT_PASSWORD or all role-specific "
            "password environment variables; default development credentials will be used for "
            "newly created accounts.",
            file=sys.stderr,
        )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Seed Altius Student Testing Platform database idempotently.",
    )
    parser.add_argument(
        "--migrate",
        action="store_true",
        help="Run 'alembic upgrade head' before seeding.",
    )
    parser.add_argument(
        "--baseline-only",
        action="store_true",
        help="Seed only minimal baseline courses, accounts, OOP test, and 1 sample attempt.",
    )
    parser.add_argument(
        "--require-custom-passwords",
        action="store_true",
        help=(
            "Fail unless SEED_DEFAULT_PASSWORD or all role password variables "
            "(SEED_ADMIN_PASSWORD, SEED_LECTURER_PASSWORD, SEED_STUDENT_PASSWORD) are set."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Execute seeding inside a transaction and roll back without persisting changes.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint for orchestrated local and production database seeding."""
    args = _build_parser().parse_args(argv)

    try:
        if args.migrate:
            run_migrations()

        if not args.require_custom_passwords:
            _warn_if_prod_uses_default_passwords()

        db = SessionLocal()
        try:
            report = seed_all(
                db,
                baseline_only=args.baseline_only,
                require_custom_passwords=args.require_custom_passwords,
            )
            if args.dry_run:
                db.rollback()
            else:
                db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    except Exception as exc:
        print(f"Database seeding failed: {exc}", file=sys.stderr)
        return 1

    print(report.format_summary(dry_run=args.dry_run))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
