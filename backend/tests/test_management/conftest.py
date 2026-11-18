"""Shared fixtures for lecturer test management API tests."""

import uuid
from collections.abc import Callable

import pytest
from sqlalchemy import select

from app.api.v1.test.schemas import MIN_QUESTIONS_PER_ATTEMPT
from app.db.models import Course, Question, QuestionOption, Subject
from app.enums import SubjectStatus

TESTS_URL = "/api/v1/test"


@pytest.fixture
def make_subject(db_session) -> Callable[..., Subject]:
    """Factory that creates a uniquely named subject on the default course."""

    def _make_subject(status: SubjectStatus = SubjectStatus.ACTIVE) -> Subject:
        course = db_session.scalar(
            select(Course).where(Course.course_title == "BSc Software Engineering")
        )
        if course is None:
            course = Course(course_title="BSc Software Engineering")
            db_session.add(course)
            db_session.flush()

        subject = Subject(
            subject_name=f"Test Management Subject {uuid.uuid4().hex[:8]}",
            course_id=course.course_id,
            status=status,
        )
        db_session.add(subject)
        db_session.commit()
        db_session.refresh(subject)
        return subject

    return _make_subject


@pytest.fixture
def add_pool_questions(db_session) -> Callable[[Subject, int], None]:
    """Factory that adds `count` four-option questions to a subject's pool."""

    def _add_pool_questions(subject: Subject, count: int) -> None:
        for index in range(count):
            question = Question(
                subject_id=subject.subject_id,
                question_text=f"Pool question {index + 1}",
            )
            db_session.add(question)
            db_session.flush()
            for option_index in range(4):
                db_session.add(
                    QuestionOption(
                        question_id=question.question_id,
                        option_text=f"Option {option_index + 1}",
                        is_correct=option_index == 0,
                    )
                )
        db_session.commit()

    return _add_pool_questions


@pytest.fixture
def pool_subject(make_subject, add_pool_questions) -> Subject:
    """An active subject with ten questions in its pool."""
    subject = make_subject()
    add_pool_questions(subject, MIN_QUESTIONS_PER_ATTEMPT)
    return subject


@pytest.fixture
def test_payload() -> Callable[..., dict]:
    """Factory that builds a valid create-test payload with optional overrides."""

    def _test_payload(subject_id: int, **overrides) -> dict:
        payload = {
            "subject_id": subject_id,
            "test_name": "Week 1 Quiz",
            "description": "Covers the basics.",
            "time_limit_minutes": 20,
            "questions_per_attempt": MIN_QUESTIONS_PER_ATTEMPT,
        }
        payload.update(overrides)
        return payload

    return _test_payload
