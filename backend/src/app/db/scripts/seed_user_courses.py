
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import User, Course, user_courses


def seed_user_courses(db: Session) -> None:
    existing_student = db.scalar(
        select(User).where(User.username == "student")
    )
    if existing_student is None:
        print('Failed to find testing student user')
    else:
        existing_course = db.scalar(
            select(Course).where(Course.course_title == "BSc Software Engineering")
        )
        if existing_course is None:
            print('Failed to find testing student course')
        else:
            if existing_course not in existing_student.courses:
                existing_student.courses.append(existing_course)
                db.commit()
                print('Added user course link')
            else:
                print('User course link already exists')

if __name__ == "__main__":
    with SessionLocal.begin() as db:
        seed_user_courses(db)
