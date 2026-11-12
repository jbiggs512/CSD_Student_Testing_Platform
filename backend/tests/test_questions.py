import uuid
import pytest
from sqlalchemy import select

from app.db.models import Course, Question, Subject
from app.enums import SubjectStatus, UserRole

QUESTIONS_URL = "/api/v1/question"


@pytest.fixture
def test_subject(db_session):
    course = db_session.scalar(
        select(Course).where(Course.course_title == "BSc Software Engineering")
    )
    if course is None:
        course = Course(course_title="BSc Software Engineering")
        db_session.add(course)
        db_session.flush()

    subject = Subject(
        subject_name=f"Question Pool Subject {uuid.uuid4().hex[:8]}",
        course_id=course.course_id,
        status=SubjectStatus.ACTIVE,
    )
    db_session.add(subject)
    db_session.commit()
    db_session.refresh(subject)
    return subject


def valid_question_payload(subject_id: int) -> dict:
    return {
        "subject_id": subject_id,
        "question_text": "What does HTTP stand for?",
        "options": [
            {"option_text": "HyperText Transfer Protocol", "is_correct": True},
            {"option_text": "High Tech Transfer Process", "is_correct": False},
            {"option_text": "Hyperlink Text Transmission Program", "is_correct": False},
            {"option_text": "Home Tool Transfer Protocol", "is_correct": False},
        ],
    }


def test_create_question_as_lecturer(client, db_session, test_subject, auth_headers):
    headers = auth_headers(UserRole.LECTURER)
    payload = valid_question_payload(test_subject.subject_id)

    response = client.post(QUESTIONS_URL, json=payload, headers=headers)
    assert response.status_code == 201

    data = response.json()
    assert data["subject_id"] == test_subject.subject_id
    assert data["question_text"] == payload["question_text"]
    assert len(data["options"]) == 4
    assert sum(1 for opt in data["options"] if opt["is_correct"]) == 1

    stored = db_session.scalar(
        select(Question).where(Question.question_id == data["question_id"])
    )
    assert stored is not None


def test_create_question_as_student_returns_403(client, test_subject, auth_headers):
    headers = auth_headers(UserRole.STUDENT)
    payload = valid_question_payload(test_subject.subject_id)

    response = client.post(QUESTIONS_URL, json=payload, headers=headers)
    assert response.status_code == 403


def test_create_question_validation_errors(client, test_subject, auth_headers):
    headers = auth_headers(UserRole.LECTURER)

    # Empty question text
    payload = valid_question_payload(test_subject.subject_id)
    payload["question_text"] = "   "
    res = client.post(QUESTIONS_URL, json=payload, headers=headers)
    assert res.status_code == 400
    assert res.json()["detail"] == "Question text is required."

    # Wrong number of options
    payload = valid_question_payload(test_subject.subject_id)
    payload["options"] = payload["options"][:3]
    res = client.post(QUESTIONS_URL, json=payload, headers=headers)
    assert res.status_code == 400
    assert res.json()["detail"] == "A question must have exactly 4 options."

    # Multiple correct answers
    payload = valid_question_payload(test_subject.subject_id)
    payload["options"][1]["is_correct"] = True
    res = client.post(QUESTIONS_URL, json=payload, headers=headers)
    assert res.status_code == 400
    assert res.json()["detail"] == "Exactly one option must be marked as the correct answer."


def test_get_questions_filtered_by_subject(client, test_subject, auth_headers):
    headers = auth_headers(UserRole.LECTURER)
    payload = valid_question_payload(test_subject.subject_id)
    create_res = client.post(QUESTIONS_URL, json=payload, headers=headers)
    assert create_res.status_code == 201

    response = client.get(
        f"{QUESTIONS_URL}?subject_id={test_subject.subject_id}",
        headers=headers,
    )
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["question_text"] == payload["question_text"]


def test_update_question_as_lecturer(client, test_subject, auth_headers):
    headers = auth_headers(UserRole.LECTURER)
    create_res = client.post(
        QUESTIONS_URL,
        json=valid_question_payload(test_subject.subject_id),
        headers=headers,
    )
    question_id = create_res.json()["question_id"]

    update_payload = {
        "question_text": "Updated question text?",
        "options": [
            {"option_text": "Option A", "is_correct": False},
            {"option_text": "Option B", "is_correct": True},
            {"option_text": "Option C", "is_correct": False},
            {"option_text": "Option D", "is_correct": False},
        ],
    }
    response = client.patch(
        f"{QUESTIONS_URL}/{question_id}",
        json=update_payload,
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["question_text"] == "Updated question text?"
    correct_opts = [opt for opt in data["options"] if opt["is_correct"]]
    assert len(correct_opts) == 1
    assert correct_opts[0]["option_text"] == "Option B"


def test_delete_question_as_lecturer(client, db_session, test_subject, auth_headers):
    headers = auth_headers(UserRole.LECTURER)
    create_res = client.post(
        QUESTIONS_URL,
        json=valid_question_payload(test_subject.subject_id),
        headers=headers,
    )
    question_id = create_res.json()["question_id"]

    delete_res = client.delete(f"{QUESTIONS_URL}/{question_id}", headers=headers)
    assert delete_res.status_code == 204

    stored = db_session.scalar(
        select(Question).where(Question.question_id == question_id)
    )
    assert stored is None


def test_question_codes_are_unique_across_subjects_with_same_prefix(
    client, db_session, test_subject, auth_headers
):
    headers = auth_headers(UserRole.LECTURER)

    subject_a = Subject(
        subject_name=f"Software Engineering {uuid.uuid4().hex[:4]}",
        course_id=test_subject.course_id,
        status=SubjectStatus.ACTIVE,
    )
    subject_b = Subject(
        subject_name=f"Software Testing {uuid.uuid4().hex[:4]}",
        course_id=test_subject.course_id,
        status=SubjectStatus.ACTIVE,
    )
    db_session.add_all([subject_a, subject_b])
    db_session.commit()

    res_a = client.post(
        QUESTIONS_URL,
        json=valid_question_payload(subject_a.subject_id),
        headers=headers,
    )
    res_b = client.post(
        QUESTIONS_URL,
        json=valid_question_payload(subject_b.subject_id),
        headers=headers,
    )
    assert res_a.status_code == 201
    assert res_b.status_code == 201

    code_a = res_a.json()["question_code"]
    code_b = res_b.json()["question_code"]
    assert code_a != code_b
    assert code_a.endswith(f"-{res_a.json()['question_id']:03d}")
    assert code_b.endswith(f"-{res_b.json()['question_id']:03d}")


def test_bulk_create_questions_as_lecturer(client, db_session, test_subject, auth_headers):
    headers = auth_headers(UserRole.LECTURER)
    payload = {
        "subject_id": test_subject.subject_id,
        "questions": [
            {
                "question_text": "Bulk Question 1?",
                "options": [
                    {"option_text": "A1", "is_correct": True},
                    {"option_text": "B1", "is_correct": False},
                    {"option_text": "C1", "is_correct": False},
                    {"option_text": "D1", "is_correct": False},
                ],
            },
            {
                "question_text": "Bulk Question 2?",
                "options": [
                    {"option_text": "A2", "is_correct": False},
                    {"option_text": "B2", "is_correct": True},
                    {"option_text": "C2", "is_correct": False},
                    {"option_text": "D2", "is_correct": False},
                ],
            },
        ],
    }

    response = client.post(f"{QUESTIONS_URL}/bulk", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["created_count"] == 2
    assert len(data["questions"]) == 2
    assert data["questions"][0]["question_text"] == "Bulk Question 1?"
    assert data["questions"][1]["question_text"] == "Bulk Question 2?"


def test_bulk_create_questions_atomic_validation(client, db_session, test_subject, auth_headers):
    headers = auth_headers(UserRole.LECTURER)
    payload = {
        "subject_id": test_subject.subject_id,
        "questions": [
            {
                "question_text": "Valid Question 1?",
                "options": [
                    {"option_text": "A1", "is_correct": True},
                    {"option_text": "B1", "is_correct": False},
                    {"option_text": "C1", "is_correct": False},
                    {"option_text": "D1", "is_correct": False},
                ],
            },
            {
                "question_text": "Invalid Question 2?",
                "options": [
                    {"option_text": "A2", "is_correct": False},
                    {"option_text": "B2", "is_correct": False},
                    {"option_text": "C2", "is_correct": False},
                    {"option_text": "D2", "is_correct": False},
                ],
            },
        ],
    }

    response = client.post(f"{QUESTIONS_URL}/bulk", json=payload, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Question 2:")

    stored = list(
        db_session.scalars(
            select(Question).where(Question.subject_id == test_subject.subject_id)
        ).all()
    )
    assert len(stored) == 0


def test_bulk_create_questions_sanitizes_input(client, test_subject, auth_headers):
    headers = auth_headers(UserRole.LECTURER)
    payload = {
        "subject_id": test_subject.subject_id,
        "questions": [
            {
                "question_text": "  What is <script>alert(1)</script> XSS?\x00  ",
                "options": [
                    {"option_text": "  Cross-Site Scripting<iframe src='x'></iframe>  ", "is_correct": True},
                    {"option_text": "Option\x07 B", "is_correct": False},
                    {"option_text": "Option C", "is_correct": False},
                    {"option_text": "Option D", "is_correct": False},
                ],
            }
        ],
    }

    response = client.post(f"{QUESTIONS_URL}/bulk", json=payload, headers=headers)
    assert response.status_code == 201
    created = response.json()["questions"][0]
    assert created["question_text"] == "What is XSS?"
    assert created["options"][0]["option_text"] == "Cross-Site Scripting"
    assert created["options"][1]["option_text"] == "Option B"

