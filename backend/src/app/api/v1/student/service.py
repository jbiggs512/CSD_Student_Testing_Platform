from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.v1.student.schemas import OutstandingTestResponse

from app.db.models import TestAttempt, Test, Subject, Course, User

def get_outstanding_tests(
    db: Session, 
    student_id: int
) -> list[OutstandingTestResponse]:
    
    # Find test IDs that the student has already completed
    completed_tests_subquery = (
        select(TestAttempt.test_id)
        .where(TestAttempt.user_id == student_id,
                TestAttempt.completed_at.isnot(None)
        )
    )

    # Get all tests for courses the student is enrolled in, excluding completed ones
    stmt = (
        select(Test)
        .join(Subject, Test.subject_id == Subject.subject_id)
        .join(Course, Subject.course_id == Course.course_id)
        .join(Course.users)
        .where(User.user_id == student_id and not Test.test_id.in_(completed_tests_subquery)
        )
    )

    # Execute and fetch the list of outstanding test model instances
    outstanding_tests = db.scalars(stmt).all()

    return [OutstandingTestResponse(
        
                id=test.test_id,
                test_name=test.test_name,
                subject_name=test.subject.subject_name,
                description=test.description,
                questions_per_attempt=test.questions_per_attempt,
        ) for test in outstanding_tests] 
    
    
