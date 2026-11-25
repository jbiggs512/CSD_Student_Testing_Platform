from datetime import datetime, timezone
import uuid
import pytest
from sqlalchemy import select
from app.enums import AccountStatus, UserRole
from app.db.models import Course, Subject, Test, TestAttempt, User

@pytest.fixture
def test_attempts(db_session, authenticated_student):
    """
    Two example test attempts
    """
    student, headers = authenticated_student

    course = db_session.scalar(
        select(Course).where(
            Course.course_title == "BSc Software Engineering"
        )
    )
    assert course is not None
    
    subject = db_session.scalar(
        select(Subject).where(
            Subject.subject_name == "Object Oriented Programming",
            Subject.course_id == course.course_id,
        )
    )
    assert subject is not None
    
    lower_score_test = Test(
        subject=subject,
        test_name="First Test",
        description="First test example in the AI subject.",
        questions_per_attempt=10,
    )
    higher_score_test = Test(
        subject=subject,
        test_name="Second Test",
        description="Second test example in the AI subject.",
        questions_per_attempt=10,
    )
    db_session.add_all(
        [
            lower_score_test,
            higher_score_test,
            TestAttempt(
                user_id=student.user_id,
                test=lower_score_test,
                completed_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                score=140,
                total_questions=10,
                correct_questions=6,
            ),
            TestAttempt(
                user_id=student.user_id,
                test=higher_score_test,
                completed_at=datetime(2026, 1, 2, tzinfo=timezone.utc),
                score=260,
                total_questions=10,
                correct_questions=9,
            ),
        ]
    )
    db_session.commit()

    return headers


@pytest.fixture
def authenticated_student(db_session, auth_headers):
    """
    Unique STUDENT user from the DB, with matching auth headers
    """
    username = f"TEST_student_{uuid.uuid4().hex[:8]}"
    headers = auth_headers(UserRole.STUDENT, username=username)
    student = db_session.scalar(select(User).where(User.username == username))
    assert student is not None
    return student, headers


@pytest.fixture
def student_with_course(db_session, authenticated_student):
    """
    Unique STUDENT user, assigned to the default course, with matching auth headers
    """
    student, headers = authenticated_student
    course = db_session.scalar(
        select(Course).where(
            Course.course_title == "BSc Software Engineering"
        )
    )
    assert course is not None
    student.courses.append(course)
    db_session.flush()
    return student, headers, course


@pytest.fixture
def leaderboard_test_setup(db_session, student_with_course):
    """
    Full test setup with unique STUDENT user, auth headers, a course, subject and example test 
    for use in the leaderboard endpoint tests
    """
    student, headers, course = student_with_course
    subject = Subject(subject_name="Leaderboard Subject", course=course)
    test = Test(
        subject=subject,
        test_name="Leaderboard Test",
        description="A test for leaderboard endpoint coverage.",
        questions_per_attempt=5,
    )
    db_session.add(test)
    db_session.flush()
    return student, headers, course, subject, test


def test_outstanding_tests(client, auth_headers):
    """
    Test the outstanding tests endpoint
    """
    headers = auth_headers(UserRole.STUDENT)
    
    response = client.get("/api/v1/student/outstandingTests", headers=headers)
    assert response.status_code == 200

def test_outstanding_tests_returns_unauthorised(client):
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

def test_completed_tests_returns_unauthorised(client):
    """
    Test the completed tests endpoint returns unauthorised
    """
    
    response = client.get("/api/v1/student/completedTests")
    assert response.status_code == 401

def test_cohort_rank_returns_no_content(client, auth_headers):
    """
    Test the cohort rank endpoint returns no content when user has no results
    """
    headers = auth_headers(UserRole.STUDENT)
    
    response = client.get("/api/v1/student/cohortRank", headers=headers)
    assert response.status_code == 204

def test_cohort_rank(client, db_session, student_with_course):
    """
    Test the cohort rank endpoint 
    """

    student, headers, course = student_with_course
    subject = Subject(subject_name="Cohort Subject", course=course)
    test = Test(
        subject=subject,
        test_name="Cohort Rank Test",
        description="A test for cohort rank endpoint coverage.",
        questions_per_attempt=5,
    )
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
    
def test_cohort_rank_returns_unauthorised(client):
    """
    Test the cohort rank endpoint returns unauthorised
    """
    
    response = client.get("/api/v1/student/cohortRank")
    assert response.status_code == 401


def test_student_subjects_returns_subjects_for_enrolled_course(
    client, db_session, student_with_course
):
    _, headers, enrolled_course = student_with_course
    other_course = db_session.scalar(
        select(Course).where(
            Course.course_title == "BSc Computer Science"
        )
    )
    assert other_course is not None
    enrolled_subject = Subject(
        subject_name="Enrolled Subject",
        course=enrolled_course,
    )
    other_subject = Subject(
        subject_name="Other Subject",
        course=other_course,
    )
    db_session.add_all([enrolled_subject, other_subject])
    db_session.commit()

    response = client.get("/api/v1/student/subjects", headers=headers)

    assert response.status_code == 200
    returned_subjects = response.json()
    assert {
        entry["value"] for entry in returned_subjects
    } == {
        subject.subject_id
        for subject in db_session.scalars(
            select(Subject).where(
                Subject.course_id == enrolled_course.course_id
            )
        )
    }
    assert {
        "label": "Enrolled Subject",
        "value": enrolled_subject.subject_id,
    } in returned_subjects
    assert all(
        entry["value"] != other_subject.subject_id
        for entry in returned_subjects
    )


def test_student_subjects_returns_no_content(client, auth_headers):
    headers = auth_headers(UserRole.STUDENT)

    response = client.get("/api/v1/student/subjects", headers=headers)

    assert response.status_code == 204 


def test_student_course_title_returns_enrolled_course_title(
    client, student_with_course
):
    _, headers, course = student_with_course

    response = client.get("/api/v1/student/courseTitle", headers=headers)

    assert response.status_code == 200
    assert response.json() == course.course_title


def test_student_leaderboard_returns_ranked_student_results(
    client, db_session, leaderboard_test_setup
):
    student, headers, course, subject, test = leaderboard_test_setup
    peer = User(
        username=f"TEST_peer_{uuid.uuid4().hex[:8]}",
        first_name="Peer",
        last_name="Student",
        email=f"TEST_peer_{uuid.uuid4().hex[:8]}@example.com",
        password_hash="unused",
        role_id=student.role_id,
        account_status=AccountStatus.ACTIVE,
    )
    peer.courses.append(course)
    db_session.add(peer)
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
    client, db_session, leaderboard_test_setup
):
    student, headers, course, subject, test = leaderboard_test_setup
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

    db_session.add_all(peers)
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


def test_student_leaderboard_returns_unauthorised(client):
    response = client.get("/api/v1/student/leaderboard/1")

    assert response.status_code == 401


@pytest.fixture
def cohort_comparison_test_setup(db_session, student_with_course):
    student, headers, course = student_with_course
    subject = Subject(
        subject_name="Cohort Comparison Subject",
        course=course,
    )
    test = Test(
        subject=subject,
        test_name="Cohort Comparison Test",
        description="A test for cohort chart endpoint coverage.",
        questions_per_attempt=10,
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
    peer.courses.append(course)
    db_session.add_all([test, peer])
    db_session.flush()
    db_session.add_all(
        [
            TestAttempt(
                user_id=student.user_id,
                test_id=test.test_id,
                completed_at=datetime.now(timezone.utc),
                score=800,
                total_questions=10,
                correct_questions=8,
            ),
            TestAttempt(
                user_id=peer.user_id,
                test_id=test.test_id,
                completed_at=datetime.now(timezone.utc),
                score=900,
                total_questions=10,
                correct_questions=9,
            ),
        ]
    )
    db_session.commit()
    return student, headers, subject, test


def test_cohort_comparison_returns_averages(
    client, db_session, cohort_comparison_test_setup
):
    student, headers, subject, test = cohort_comparison_test_setup
    low_score_peer = User(
        username=f"TEST_peer_{uuid.uuid4().hex[:8]}",
        first_name="Low",
        last_name="Student",
        email=f"TEST_peer_{uuid.uuid4().hex[:8]}@example.com",
        password_hash="unused",
        role_id=student.role_id,
        account_status=AccountStatus.ACTIVE,
    )
    low_score_peer.courses.append(subject.course)
    db_session.add(low_score_peer)
    db_session.flush()
    db_session.add(
        TestAttempt(
            user_id=low_score_peer.user_id,
            test_id=test.test_id,
            completed_at=datetime.now(timezone.utc),
            score=700,
            total_questions=10,
            correct_questions=7,
        )
    )
    db_session.commit()

    response = client.get(
        f"/api/v1/student/{subject.subject_id}/cohortComparison",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == {
        "subject": "Cohort Comparison Subject",
        "top5_average": 80,
        "user_average": 80,
        "cohort_average": 80,
    }


def test_cohort_comparison_returns_nulls_for_student_with_no_attempt(
    client, db_session, student_with_course
):
    student, headers, course = student_with_course
    subject = Subject(
        subject_name="Empty Cohort Subject",
        course=course,
    )
    db_session.add(subject)
    db_session.commit()

    response = client.get(
        f"/api/v1/student/{subject.subject_id}/cohortComparison",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == {
        "subject": "Empty Cohort Subject",
        "top5_average": 0,
        "user_average": 0,
        "cohort_average": 0,
    }


def test_cohort_comparison_returns_unauthorised(client):
    response = client.get("/api/v1/student/1/cohortComparison")

    assert response.status_code == 401


def test_score_distribution_returns_all_bands_and_current_user_band(
    client, db_session, cohort_comparison_test_setup
):
    student, headers, subject, test = cohort_comparison_test_setup
    low_score_peer = User(
        username=f"TEST_peer_{uuid.uuid4().hex[:8]}",
        first_name="Low",
        last_name="Student",
        email=f"TEST_peer_{uuid.uuid4().hex[:8]}@example.com",
        password_hash="unused",
        role_id=student.role_id,
        account_status=AccountStatus.ACTIVE,
    )
    low_score_peer.courses.append(subject.course)
    db_session.add(low_score_peer)
    db_session.flush()
    db_session.add(
        TestAttempt(
            user_id=low_score_peer.user_id,
            test_id=test.test_id,
            completed_at=datetime.now(timezone.utc),
            score=700,
            total_questions=10,
            correct_questions=7,
        )
    )
    db_session.commit()

    response = client.get(
        f"/api/v1/student/{subject.subject_id}/scoreDistribution",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == {
        "subject": "Cohort Comparison Subject",
        "bands": [
            {"band": "40–49", "count": 0},
            {"band": "50–59", "count": 0},
            {"band": "60–69", "count": 0},
            {"band": "70–79", "count": 1},
            {"band": "80–89", "count": 1},
            {"band": "90–100", "count": 1},
        ],
        "user_band": "80–89",
        "user_score": 80,
    }


def test_score_distribution_returns_empty_bands_for_student_with_no_attempt(
    client, db_session, student_with_course
):
    _, headers, course = student_with_course
    subject = Subject(
        subject_name="Empty Distribution Subject",
        course=course,
    )
    db_session.add(subject)
    db_session.commit()

    response = client.get(
        f"/api/v1/student/{subject.subject_id}/scoreDistribution",
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["subject"] == "Empty Distribution Subject"
    assert data["user_band"] is None
    assert data["user_score"] is 0
    assert data["bands"] == [
        {"band": "40–49", "count": 0},
        {"band": "50–59", "count": 0},
        {"band": "60–69", "count": 0},
        {"band": "70–79", "count": 0},
        {"band": "80–89", "count": 0},
        {"band": "90–100", "count": 0},
    ]


def test_score_distribution_returns_unauthorised(client):
    response = client.get("/api/v1/student/1/scoreDistribution")

    assert response.status_code == 401


def test_statistics_returns_no_content(client, auth_headers):
    """
    Test the statistics endpoint returns no content when user has not yet completed any tests
    """
    headers = auth_headers(UserRole.STUDENT)
    
    response = client.get("/api/v1/student/statistics", headers=headers)
    assert response.status_code == 204


def test_statistics_returns_success(client, test_attempts):
    response = client.get(
        "/api/v1/student/statistics",
        headers=test_attempts,
    )

    assert response.status_code == 200
    assert response.json() == {
        "total_points": 400,
        "average_score": 75,
        "best_score": {
            "score": 90,
            "test_name": "Second Test",
            "completed_date": "2 Jan 2026",
        },
        "worst_score": {
            "score": 60,
            "test_name": "First Test",
            "completed_date": "1 Jan 2026",
        },
    }

def test_statistics_returns_unauthorised(client):
    """
    Test the statistics endpoint returns unauthorised
    """
    response = client.get("/api/v1/student/statistics")
    assert response.status_code == 401
    
def test_grades_over_time_returns_no_content(client, auth_headers):
    """
    Test the grades over time endpoint returns no content when user has not yet completed any tests
    """
    headers = auth_headers(UserRole.STUDENT)
    
    response = client.get("/api/v1/student/gradesOverTime", headers=headers)
    assert response.status_code == 204


def test_grades_over_time_returns_success(client, test_attempts):
    response = client.get(
        "/api/v1/student/gradesOverTime",
        headers=test_attempts,
    )

    assert response.status_code == 200
    assert response.json() == {
        "average": 75,
        "points": [
            {
                "completed_at": "2026-01-01T00:00:00+00:00",
                "percentage": 60,
                "test_name": "First Test",
                "is_best": False,
                "is_worst": True,
            },
            {
                "completed_at": "2026-01-02T00:00:00+00:00",
                "percentage": 90,
                "test_name": "Second Test",
                "is_best": True,
                "is_worst": False,
            },
        ],
    }

def test_grades_over_time_returns_unauthorised(client):
    """
    Test the grades over time endpoint returns unauthorised
    """
    response = client.get("/api/v1/student/gradesOverTime")
    assert response.status_code == 401