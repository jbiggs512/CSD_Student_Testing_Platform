from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

DATA_DIR = Path(__file__).resolve().parent / "data"

REQUIRED_TABLES = frozenset(
    {
        "roles",
        "users",
        "courses",
        "subjects",
        "tests",
        "questions",
        "question_options",
        "user_courses",
        "test_attempts",
    }
)


@dataclass
class SeedCounts:
    """Tracks how many records were created vs already present during seeding."""

    created: int = 0
    skipped: int = 0

    def __iadd__(self, other: "SeedCounts") -> "SeedCounts":
        self.created += other.created
        self.skipped += other.skipped
        return self


def load_seed_json(filename: str) -> dict[str, Any]:
    """Load and parse a UTF-8 JSON seed dataset from the scripts data directory."""
    path = DATA_DIR / filename
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def calculate_attempt_score(correct_questions: int, total_questions: int) -> int:
    """Compute server-compatible points (+30 correct, -10 wrong, clamped at 0)."""
    wrong_questions = max(0, total_questions - correct_questions)
    raw_score = (correct_questions * 30) - (wrong_questions * 10)
    return max(0, raw_score)


def verify_schema_ready(db: Session) -> None:
    """Verify database connectivity and ensure all required schema tables exist."""
    db.execute(text("SELECT 1"))
    existing_tables = set(inspect(db.connection()).get_table_names())
    missing_tables = sorted(REQUIRED_TABLES - existing_tables)
    if missing_tables:
        missing_list = ", ".join(missing_tables)
        raise RuntimeError(
            f"Database schema is incomplete (missing tables: {missing_list}). "
            "Run 'uv run alembic upgrade head' or pass '--migrate' before seeding."
        )
