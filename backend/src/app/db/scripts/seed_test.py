from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Course, Question, QuestionOption, Subject, Test
from app.db.scripts.common import SeedCounts, load_seed_json
from app.db.session import SessionLocal
from app.enums import SubjectStatus


@dataclass
class CurriculumSeedSummary:
    """Aggregate counts across courses, subjects, questions, and tests."""

    courses: SeedCounts
    subjects: SeedCounts
    questions: SeedCounts
    tests: SeedCounts


def _filter_items(items: list[dict[str, Any]], baseline_only: bool) -> list[dict[str, Any]]:
    if not baseline_only:
        return items
    return [item for item in items if item.get("baseline", False)]


def _sync_courses(
    db: Session,
    courses_data: list[dict[str, Any]],
) -> tuple[dict[str, Course], SeedCounts]:
    courses_by_title = {
        course.course_title: course
        for course in db.scalars(select(Course)).all()
    }
    counts = SeedCounts()
    new_courses: list[Course] = []

    for course_spec in courses_data:
        title = course_spec["course_title"]
        if title in courses_by_title:
            counts.skipped += 1
        else:
            course = Course(course_title=title)
            courses_by_title[title] = course
            new_courses.append(course)
            counts.created += 1

    if new_courses:
        db.add_all(new_courses)
        db.flush()

    return courses_by_title, counts


def _sync_subjects(
    db: Session,
    courses_data: list[dict[str, Any]],
    courses_by_title: dict[str, Course],
    baseline_only: bool,
) -> tuple[dict[tuple[int, str], Subject], SeedCounts]:
    subjects_by_key = {
        (subject.course_id, subject.subject_name): subject
        for subject in db.scalars(select(Subject)).all()
    }
    counts = SeedCounts()
    new_subjects: list[Subject] = []

    for course_spec in courses_data:
        course = courses_by_title[course_spec["course_title"]]
        for subject_spec in _filter_items(course_spec["subjects"], baseline_only):
            key = (course.course_id, subject_spec["subject_name"])
            if key in subjects_by_key:
                counts.skipped += 1
            else:
                subject = Subject(
                    subject_name=subject_spec["subject_name"],
                    course_id=course.course_id,
                    status=SubjectStatus(subject_spec.get("status", "active")),
                )
                subjects_by_key[key] = subject
                new_subjects.append(subject)
                counts.created += 1

    if new_subjects:
        db.add_all(new_subjects)
        db.flush()

    return subjects_by_key, counts


def _sync_questions(
    db: Session,
    courses_data: list[dict[str, Any]],
    courses_by_title: dict[str, Course],
    subjects_by_key: dict[tuple[int, str], Subject],
    baseline_only: bool,
) -> SeedCounts:
    existing_keys = {
        (row.subject_id, row.question_text.strip().lower())
        for row in db.execute(select(Question.subject_id, Question.question_text)).all()
        if row.subject_id is not None
    }
    counts = SeedCounts()
    new_questions: list[Question] = []

    for course_spec in courses_data:
        course = courses_by_title[course_spec["course_title"]]
        for subject_spec in _filter_items(course_spec["subjects"], baseline_only):
            subject = subjects_by_key[(course.course_id, subject_spec["subject_name"])]
            for q_spec in _filter_items(subject_spec.get("questions", []), baseline_only):
                key = (subject.subject_id, q_spec["text"].strip().lower())
                if key in existing_keys:
                    counts.skipped += 1
                    continue

                question = Question(
                    subject_id=subject.subject_id,
                    test_id=None,
                    question_text=q_spec["text"],
                    options=[
                        QuestionOption(
                            option_text=opt["text"],
                            is_correct=bool(opt["is_correct"]),
                        )
                        for opt in q_spec["options"]
                    ],
                )
                existing_keys.add(key)
                new_questions.append(question)
                counts.created += 1

    if new_questions:
        db.add_all(new_questions)
        db.flush()

    return counts


def _sync_tests(
    db: Session,
    courses_data: list[dict[str, Any]],
    courses_by_title: dict[str, Course],
    subjects_by_key: dict[tuple[int, str], Subject],
    baseline_only: bool,
) -> SeedCounts:
    existing_keys = {
        (row.subject_id, row.test_name.strip().lower())
        for row in db.execute(select(Test.subject_id, Test.test_name)).all()
    }
    counts = SeedCounts()
    new_tests: list[Test] = []

    for course_spec in courses_data:
        course = courses_by_title[course_spec["course_title"]]
        for subject_spec in _filter_items(course_spec["subjects"], baseline_only):
            subject = subjects_by_key[(course.course_id, subject_spec["subject_name"])]
            for test_spec in _filter_items(subject_spec.get("tests", []), baseline_only):
                key = (subject.subject_id, test_spec["test_name"].strip().lower())
                if key in existing_keys:
                    counts.skipped += 1
                    continue

                new_tests.append(
                    Test(
                        subject_id=subject.subject_id,
                        test_name=test_spec["test_name"],
                        description=test_spec["description"],
                        questions_per_attempt=int(test_spec["questions_per_attempt"]),
                        time_limit_minutes=test_spec.get("time_limit_minutes"),
                    )
                )
                existing_keys.add(key)
                counts.created += 1

    if new_tests:
        db.add_all(new_tests)
        db.flush()

    return counts


def seed_test_data(
    db: Session,
    *,
    baseline_only: bool = False,
) -> CurriculumSeedSummary:
    """Seed courses, subjects, question pools, and tests idempotently."""
    curriculum = load_seed_json("curriculum.json")
    courses_data = _filter_items(curriculum["courses"], baseline_only)

    courses_by_title, course_counts = _sync_courses(db, courses_data)
    subjects_by_key, subject_counts = _sync_subjects(
        db, courses_data, courses_by_title, baseline_only
    )
    question_counts = _sync_questions(
        db, courses_data, courses_by_title, subjects_by_key, baseline_only
    )
    test_counts = _sync_tests(
        db, courses_data, courses_by_title, subjects_by_key, baseline_only
    )

    return CurriculumSeedSummary(
        courses=course_counts,
        subjects=subject_counts,
        questions=question_counts,
        tests=test_counts,
    )


if __name__ == "__main__":
    with SessionLocal.begin() as db:
        summary = seed_test_data(db)
        print(
            "Curriculum seeded: "
            f"courses(+{summary.courses.created}/{summary.courses.skipped}), "
            f"subjects(+{summary.subjects.created}/{summary.subjects.skipped}), "
            f"questions(+{summary.questions.created}/{summary.questions.skipped}), "
            f"tests(+{summary.tests.created}/{summary.tests.skipped})."
        )
