from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Course

COURSE_NOT_FOUND_DETAIL = "Course not found."
COURSE_ALREADY_EXISTS_DETAIL = "A course with this title already exists."


def get_courses(db: Session) -> list[Course]:
    return list(
        db.scalars(select(Course).order_by(Course.course_title)).all()
    )


def create_course(db: Session, course_title: str) -> Course:
    existing_course = db.scalar(
        select(Course).where(Course.course_title == course_title)
    )
    if existing_course:
        raise HTTPException(status_code=400, detail=COURSE_ALREADY_EXISTS_DETAIL)

    course = Course(course_title=course_title)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def update_course(db: Session, course_id: int, course_title: str) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail=COURSE_NOT_FOUND_DETAIL)

    existing_course = db.scalar(
        select(Course).where(
            Course.course_title == course_title,
            Course.course_id != course_id,
        )
    )
    if existing_course:
        raise HTTPException(status_code=400, detail=COURSE_ALREADY_EXISTS_DETAIL)

    course.course_title = course_title
    db.commit()
    db.refresh(course)
    return course
