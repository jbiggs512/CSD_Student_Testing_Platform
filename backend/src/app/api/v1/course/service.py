from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Course


def get_courses(db: Session) -> list[Course]:
    return list(
        db.scalars(select(Course).order_by(Course.course_title)).all()
    )
