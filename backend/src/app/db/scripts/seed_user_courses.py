from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Course, User
from app.db.scripts.common import SeedCounts
from app.db.scripts.seed_users import DEFAULT_USERS
from app.db.session import SessionLocal


def seed_user_courses(
    db: Session,
    *,
    baseline_only: bool = False,
) -> SeedCounts:
    """Link seeded students and lecturers to their designated degree courses."""
    target_specs = [
        spec
        for spec in DEFAULT_USERS
        if spec.courses and (not baseline_only or spec.baseline)
    ]
    if not target_specs:
        return SeedCounts()

    target_usernames = [spec.username for spec in target_specs]
    users_by_username = {
        user.username: user
        for user in db.scalars(
            select(User)
            .options(selectinload(User.courses))
            .where(User.username.in_(target_usernames))
        ).all()
    }
    courses_by_title = {
        course.course_title: course
        for course in db.scalars(select(Course)).all()
    }

    counts = SeedCounts()

    for spec in target_specs:
        user = users_by_username.get(spec.username)
        if user is None:
            counts.skipped += len(spec.courses)
            continue

        enrolled_course_ids = {course.course_id for course in user.courses}
        for course_title in spec.courses:
            course = courses_by_title.get(course_title)
            if course is None or course.course_id in enrolled_course_ids:
                counts.skipped += 1
                continue

            user.courses.append(course)
            enrolled_course_ids.add(course.course_id)
            counts.created += 1

    if counts.created > 0:
        db.flush()

    return counts


if __name__ == "__main__":
    with SessionLocal.begin() as db:
        result = seed_user_courses(db)
        print(
            f"User course enrollments seeded: "
            f"{result.created} created, {result.skipped} skipped."
        )
