
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import Course


DEFAULT_COURSES = [
    "BSc Software Engineering",
    "BSc Computer Science",
    "BSc Cyber Security",
    "BSc Data Science",
]


def seed_courses(db: Session) -> None:
    for course_title in DEFAULT_COURSES:
        existing_course = db.scalar(
            select(Course).where(Course.course_title == course_title)
        )

        if existing_course is None:
            db.add(Course(course_title=course_title))
            print(f"Added course: {course_title}")
        else:
            print(f"Course already exists: {course_title}")

    db.flush()


if __name__ == "__main__":
    with SessionLocal.begin() as db:
        seed_courses(db)
