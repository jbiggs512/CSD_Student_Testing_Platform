from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Course
from app.db.scripts.common import SeedCounts, load_seed_json
from app.db.session import SessionLocal

_CURRICULUM_DATA = load_seed_json("curriculum.json")

BASELINE_COURSES: list[str] = [
    item["course_title"]
    for item in _CURRICULUM_DATA["courses"]
    if item.get("baseline", False)
]

DEFAULT_COURSES: list[str] = [
    item["course_title"] for item in _CURRICULUM_DATA["courses"]
]


def seed_courses(db: Session, *, baseline_only: bool = False) -> SeedCounts:
    """Seed degree courses idempotently without modifying existing course rows."""
    target_titles = BASELINE_COURSES if baseline_only else DEFAULT_COURSES
    existing_titles = set(db.scalars(select(Course.course_title)).all())

    counts = SeedCounts()
    new_courses: list[Course] = []

    for course_title in target_titles:
        if course_title in existing_titles:
            counts.skipped += 1
        else:
            new_courses.append(Course(course_title=course_title))
            existing_titles.add(course_title)
            counts.created += 1

    if new_courses:
        db.add_all(new_courses)
        db.flush()

    return counts


if __name__ == "__main__":
    with SessionLocal.begin() as db:
        result = seed_courses(db)
        print(f"Courses seeded: {result.created} created, {result.skipped} skipped.")
