from datetime import datetime, timezone
import uuid

from sqlalchemy import select

from app.enums import AccountStatus, UserRole
from app.db.models import Course, Subject, Test, TestAttempt, User

def test_outstanding_tests(client, auth_headers):
    """
    Test the outstanding tests endpoint
    """
    headers = auth_headers(UserRole.STUDENT)
    
    response = client.get("/api/v1/student/outstandingTests", headers=headers)
    assert response.status_code == 200

def test_outstanding_tests_returns_401(client):
    """
    Test the outstanding tests endpoint returns unauthorised
    """
    
    response = client.get("/api/v1/student/outstandingTests")
    assert response.status_code == 401
    
def test_completed_tests(client, auth_headers):
    """
    Test the completed tests endpoint
    """
    headers = auth_headers(UserRole.STUDENT)
    
    response = client.get("/api/v1/student/completedTests", headers=headers)
    assert response.status_code == 200

def test_completed_tests_returns_401(client):
    """
    Test the completed tests endpoint returns unauthorised
    """
    
    response = client.get("/api/v1/student/completedTests")
    assert response.status_code == 401

def test_cohort_rank_returns_412(client, auth_headers):
    """
    Test the cohort rank endpoint returns precondition failed when user has no results
    """
    headers = auth_headers(UserRole.STUDENT)
    
    response = client.get("/api/v1/student/cohortRank", headers=headers)
    assert response.status_code == 412

def test_cohort_rank(client, db_session, auth_headers):
    """
    Test the cohort rank endpoint 
    """

    username = f"TEST_student_{uuid.uuid4().hex[:8]}"
    headers = auth_headers(UserRole.STUDENT, username=username)
    student = db_session.scalar(select(User).where(User.username == username))
    assert student is not None

    course = Course(course_title=f"Cohort Course {uuid.uuid4().hex[:8]}")
    subject = Subject(subject_name="Cohort Subject", course=course)
    test = Test(
        subject=subject,
        test_name="Cohort Rank Test",
        description="A test for cohort rank endpoint coverage.",
        questions_per_attempt=5,
    )
    student.courses.append(course)
    db_session.add(test)
    db_session.flush()
    db_session.add(
        TestAttempt(
            user_id=student.user_id,
            test_id=test.test_id,
            completed_at=datetime.now(timezone.utc),
            score=120,
            total_questions=5,
            correct_questions=4,
        )
    )
    db_session.commit()

    response = client.get("/api/v1/student/cohortRank", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"rank": 1, "size": 1}
    
def test_cohort_rank_returns_401(client):
    """
    Test the cohort rank endpoint returns unauthorised
    """
    
    response = client.get("/api/v1/student/cohortRank")
    assert response.status_code == 401


def test_student_subjects_returns_subjects_for_enrolled_course(
    client, db_session, auth_headers
):
    username = f"TEST_student_{uuid.uuid4().hex[:8]}"
    headers = auth_headers(UserRole.STUDENT, username=username)
    student = db_session.scalar(
        select(User).where(User.username == username)
    )
    assert student is not None

    enrolled_course = Course(
        course_title=f"Subject Course {uuid.uuid4().hex[:8]}"
    )
    other_course = Course(
        course_title=f"Other Course {uuid.uuid4().hex[:8]}"
    )
    enrolled_subject = Subject(
        subject_name="Enrolled Subject",
        course=enrolled_course,
    )
    other_subject = Subject(
        subject_name="Other Subject",
        course=other_course,
    )
    student.courses.append(enrolled_course)
    db_session.add_all([enrolled_subject, other_subject])
    db_session.commit()

    response = client.get("/api/v1/student/subjects", headers=headers)

    assert response.status_code == 200
    assert response.json() == [
        {"label": "Enrolled Subject", "value": enrolled_subject.subject_id}
    ]


def test_student_subjects_requires_course_enrollment(client, auth_headers):
    headers = auth_headers(UserRole.STUDENT)

    response = client.get("/api/v1/student/subjects", headers=headers)

    assert response.status_code == 412
    assert response.json()["detail"] == "You are not enrolled in any courses."


def test_student_course_title_returns_enrolled_course_title(
    client, db_session, auth_headers
):
    username = f"TEST_student_{uuid.uuid4().hex[:8]}"
    headers = auth_headers(UserRole.STUDENT, username=username)
    student = db_session.scalar(
        select(User).where(User.username == username)
    )
    assert student is not None

    course = Course(course_title=f"Course Title {uuid.uuid4().hex[:8]}")
    student.courses.append(course)
    db_session.commit()

    response = client.get("/api/v1/student/courseTitle", headers=headers)

    assert response.status_code == 200
    assert response.json() == course.course_title


def test_student_leaderboard_returns_ranked_student_results(
    client, db_session, auth_headers
):
    username = f"TEST_student_{uuid.uuid4().hex[:8]}"
    headers = auth_headers(UserRole.STUDENT, username=username)
    student = db_session.scalar(
        select(User).where(User.username == username)
    )
    assert student is not None

    course = Course(course_title=f"Leaderboard Course {uuid.uuid4().hex[:8]}")
    subject = Subject(subject_name="Leaderboard Subject", course=course)
    test = Test(
        subject=subject,
        test_name="Leaderboard Test",
        description="A test for leaderboard endpoint coverage.",
        questions_per_attempt=5,
    )
    peer = User(
        username=f"TEST_peer_{uuid.uuid4().hex[:8]}",
        first_name="Peer",
        last_name="Student",
        email=f"TEST_peer_{uuid.uuid4().hex[:8]}@example.com",
        password_hash="unused",
        role_id=student.role_id,
        account_status=AccountStatus.ACTIVE,
    )
    student.courses.append(course)
    peer.courses.append(course)
    db_session.add_all([test, peer])
    db_session.flush()
    db_session.add_all(
        [
            TestAttempt(
                user_id=student.user_id,
                test_id=test.test_id,
                completed_at=datetime.now(timezone.utc),
                score=120,
                total_questions=5,
                correct_questions=3,
            ),
            TestAttempt(
                user_id=peer.user_id,
                test_id=test.test_id,
                completed_at=datetime.now(timezone.utc),
                score=180,
                total_questions=5,
                correct_questions=4,
            ),
        ]
    )
    db_session.commit()

    response = client.get(
        f"/api/v1/student/leaderboard/{subject.subject_id}",
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_in_top_5"] is True
    assert data["current_user_entry"] is None
    assert len(data["top_students"]) == 2
    assert data["top_students"][0] == {
        "user_id": peer.user_id,
        "rank": 1,
        "name": "Peer S.",
        "avg_score": 80.0,
        "points": 180,
    }
    assert data["top_students"][1] == {
        "user_id": student.user_id,
        "rank": 2,
        "name": "Test S.",
        "avg_score": 60.0,
        "points": 120,
    }


def test_student_leaderboard_includes_current_user_outside_top_five(
    client, db_session, auth_headers
):
    username = f"TEST_student_{uuid.uuid4().hex[:8]}"
    headers = auth_headers(UserRole.STUDENT, username=username)
    student = db_session.scalar(
        select(User).where(User.username == username)
    )
    assert student is not None

    course = Course(course_title=f"Leaderboard Course {uuid.uuid4().hex[:8]}")
    subject = Subject(subject_name="Leaderboard Subject", course=course)
    test = Test(
        subject=subject,
        test_name="Leaderboard Test",
        description="A test for the outside-top-five leaderboard case.",
        questions_per_attempt=5,
    )
    peers = []
    for index in range(6):
        peer_id = uuid.uuid4().hex[:8]
        peer = User(
            username=f"TEST_peer_{peer_id}",
            first_name="Peer",
            last_name=f"Student{index}",
            email=f"TEST_peer_{peer_id}@example.com",
            password_hash="unused",
            role_id=student.role_id,
            account_status=AccountStatus.ACTIVE,
        )
        peer.courses.append(course)
        peers.append(peer)

    student.courses.append(course)
    db_session.add_all([test, *peers])
    db_session.flush()
    db_session.add_all(
        [
            TestAttempt(
                user_id=peer.user_id,
                test_id=test.test_id,
                completed_at=datetime.now(timezone.utc),
                score=(index + 1) * 100,
                total_questions=5,
                correct_questions=5,
            )
            for index, peer in enumerate(peers)
        ]
    )
    db_session.commit()

    response = client.get(
        f"/api/v1/student/leaderboard/{subject.subject_id}",
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_in_top_5"] is False
    assert len(data["top_students"]) == 5
    assert all(
        entry["user_id"] != student.user_id for entry in data["top_students"]
    )
    assert data["current_user_entry"] == {
        "user_id": student.user_id,
        "rank": 7,
        "name": "Test S.",
        "avg_score": 0.0,
        "points": 0,
    }


def test_student_leaderboard_requires_authentication(client):
    response = client.get("/api/v1/student/leaderboard/1")

    assert response.status_code == 401