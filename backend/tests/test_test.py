import uuid

from sqlalchemy import select

from app.db.models import Course, Question, QuestionOption, Role, Subject, Test, User
from app.db.scripts.seed_test import seed_test_data
from app.enums import SubjectStatus, UserRole


def test_get_test_data(client, db_session, auth_headers):
    """
    Test that test data can be retrieved
    """

    seed_test_data(db_session)
    test = db_session.scalar(
        select(Test).where(Test.test_name == "OOP Key Principles")
    )
    assert test is not None

    headers = auth_headers(UserRole.STUDENT)
    student = db_session.scalar(
        select(User)
        .join(Role, User.role_id == Role.role_id)
        .where(Role.role_name == UserRole.STUDENT.value)
        .order_by(User.user_id.desc())
    )
    assert student is not None

    student.courses.append(test.subject.course)
    db_session.commit()

    response = client.get(f"/api/v1/test/{test.test_id}", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["course"] == "BSc Software Engineering"
    assert body["subject"] == "Object Oriented Programming"
    assert body["test_name"] == "OOP Key Principles"
    assert body["description"] == "This is a quick test on the key principles of OOP."
    assert body["questions_per_attempt"] == 5
    assert body["current_question"] == 1
    assert len(body["questions"]) == 5
    for question in body["questions"]:
        for option in question["options"]:
            assert "is_correct" not in option


def test_get_test_data_draws_random_questions_from_subject_pool(
    client, db_session, auth_headers
):
    course = db_session.scalar(
        select(Course).where(Course.course_title == "BSc Software Engineering")
    )
    assert course is not None

    subject = Subject(
        subject_name=f"Pool Draw Subject {uuid.uuid4().hex[:8]}",
        course_id=course.course_id,
        status=SubjectStatus.ACTIVE,
    )
    db_session.add(subject)
    db_session.flush()

    for idx in range(12):
        question = Question(
            subject_id=subject.subject_id,
            question_text=f"Pool draw question {idx + 1}",
        )
        db_session.add(question)
        db_session.flush()
        for opt_idx in range(4):
            db_session.add(
                QuestionOption(
                    question_id=question.question_id,
                    option_text=f"Answer {opt_idx + 1}",
                    is_correct=opt_idx == 0,
                )
            )
    db_session.commit()

    lecturer_headers = auth_headers(UserRole.LECTURER)
    create_res = client.post(
        "/api/v1/test",
        json={
            "subject_id": subject.subject_id,
            "test_name": "Pool Sampled Quiz",
            "questions_per_attempt": 4,
        },
        headers=lecturer_headers,
    )
    assert create_res.status_code == 201
    test_id = create_res.json()["test_id"]

    student_headers = auth_headers(UserRole.STUDENT)
    student = db_session.scalar(
        select(User)
        .join(Role, User.role_id == Role.role_id)
        .where(Role.role_name == UserRole.STUDENT.value)
        .order_by(User.user_id.desc())
    )
    assert student is not None
    student.courses.append(course)
    db_session.commit()

    seen_draws: set[tuple[int, ...]] = set()
    for _ in range(5):
        res = client.get(f"/api/v1/test/{test_id}", headers=student_headers)
        assert res.status_code == 200
        payload = res.json()
        assert payload["description"] == ""
        assert len(payload["questions"]) == 4
        question_ids = tuple(q["question_id"] for q in payload["questions"])
        assert len(set(question_ids)) == 4
        seen_draws.add(question_ids)

    assert len(seen_draws) > 1


def test_get_test_data_not_enrolled_returns_401(client, db_session, auth_headers):
    seed_test_data(db_session)
    test = db_session.scalar(
        select(Test).where(Test.test_name == "OOP Key Principles")
    )
    assert test is not None

    headers = auth_headers(UserRole.STUDENT)
    response = client.get(f"/api/v1/test/{test.test_id}", headers=headers)
    assert response.status_code == 401


def test_get_test_data_not_found(client, auth_headers):
    """
    Test that a 404 error is returned when the test is not found
    """

    headers = auth_headers(UserRole.STUDENT)
    response = client.get("/api/v1/test/999", headers=headers)
    assert response.status_code == 404
    body = response.json()
    assert body["detail"] == "Test with ID '999' not found."


def test_get_test_data_requires_authentication(client):
    response = client.get("/api/v1/test/1")

    assert response.status_code == 401


def test_save_test_attempt_grades_answers_server_side(
    client, db_session, auth_headers
):
    seed_test_data(db_session)
    test = db_session.scalar(
        select(Test).where(Test.test_name == "OOP Key Principles")
    )
    assert test is not None

    questions = db_session.scalars(
        select(Question)
        .where(Question.subject_id == test.subject_id)
        .order_by(Question.question_id.asc())
    ).all()
    assert len(questions) >= 3

    student_headers = auth_headers(UserRole.STUDENT)

    # Unenrolled student is rejected
    attempt_payload_base = {
        "test_id": test.test_id,
        "started_at": "2026-11-16T21:00:00Z",
        "completed_at": "2026-11-16T21:05:00Z",
        "answers": [],
    }
    unenrolled = client.post(
        "/api/v1/test/attempt", json=attempt_payload_base, headers=student_headers
    )
    assert unenrolled.status_code == 401

    student = db_session.scalar(
        select(User)
        .join(Role, User.role_id == Role.role_id)
        .where(Role.role_name == UserRole.STUDENT.value)
        .order_by(User.user_id.desc())
    )
    assert student is not None
    student.courses.append(test.subject.course)
    db_session.commit()

    # Unknown test returns 404
    missing_test = client.post(
        "/api/v1/test/attempt",
        json={**attempt_payload_base, "test_id": 999999},
        headers=student_headers,
    )
    assert missing_test.status_code == 404

    q1, q2, q3 = questions[0], questions[1], questions[2]
    q1_correct = next(opt for opt in q1.options if opt.is_correct)
    q2_wrong = next(opt for opt in q2.options if not opt.is_correct)

    # 1 correct (+30), 1 duplicate attempt for q1 (ignored), 1 wrong (-10), 1 unanswered (0) => score 20
    graded_res = client.post(
        "/api/v1/test/attempt",
        json={
            "test_id": test.test_id,
            "started_at": "2026-11-16T21:00:00Z",
            "completed_at": "2026-11-16T21:05:00Z",
            "answers": [
                {"question_id": q1.question_id, "selected_option_id": q1_correct.option_id},
                {"question_id": q1.question_id, "selected_option_id": q1_correct.option_id},
                {"question_id": q2.question_id, "selected_option_id": q2_wrong.option_id},
                {"question_id": q3.question_id, "selected_option_id": None},
            ],
        },
        headers=student_headers,
    )
    assert graded_res.status_code == 201, graded_res.text
    graded = graded_res.json()
    assert graded["score"] == 20
    assert graded["correct_questions"] == 1
    assert graded["total_questions"] == test.questions_per_attempt

    # Net negative score is clamped to 0
    q1_wrong = next(opt for opt in q1.options if not opt.is_correct)
    clamped_res = client.post(
        "/api/v1/test/attempt",
        json={
            "test_id": test.test_id,
            "started_at": "2026-11-16T21:06:00Z",
            "completed_at": "2026-11-16T21:07:00Z",
            "answers": [
                {"question_id": q1.question_id, "selected_option_id": q1_wrong.option_id},
                {"question_id": q2.question_id, "selected_option_id": q2_wrong.option_id},
            ],
        },
        headers=student_headers,
    )
    assert clamped_res.status_code == 201, clamped_res.text
    clamped = clamped_res.json()
    assert clamped["score"] == 0
    assert clamped["correct_questions"] == 0