from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.models import Test, User, Subject, Course, TestAttempt
from app.api.v1.test.schemas import QuestionOptionResponse, QuestionResponse, TestResponse, TestAttemptCreateRequest, TestAttemptResponse


def get_test_data(
    db: Session, 
    target_test_id: int,
    current_user: User
) -> TestResponse:
    
    # Fetch the test data from the database
    test = db.get(Test, target_test_id)

    if test is None:
        raise HTTPException(status_code=404, detail=f"Test with ID '{target_test_id}' not found.")

    # Check user is allowed to access test
    test_user_check = db.scalar(
        select(Test)
        .join(Subject, Test.subject_id == Subject.subject_id)
        .join(Course, Subject.course_id == Course.course_id)
        .join(Course.users)
        .where(
            User.user_id == current_user.user_id,
            Test.test_id == target_test_id,
        )
    )

    if test_user_check is None:
            raise HTTPException(status_code=401, detail=f"User not allowed to access test with ID '{target_test_id}'.")

    return TestResponse(
        test_id=test.test_id,
        course=test.subject.course.course_title,
        subject=test.subject.subject_name,
        test_name=test.test_name,
        description=test.description,
        timed=test.time_limit_minutes is not None and test.time_limit_minutes > 0,
        time_limit_minutes=test.time_limit_minutes,
        current_question=1,
        questions_per_attempt=test.questions_per_attempt,
        questions=[
            QuestionResponse(
                question_id=question.question_id,
                question_text=question.question_text,
                options=[
                    QuestionOptionResponse(
                        option_id=option.option_id,
                        option_text=option.option_text,
                        is_correct=option.is_correct
                    )
                    for option in question.options
                ]
            )
            for question in test.questions
        ]
    )
    
def save_test_attempt(
    db: Session,
    request: TestAttemptCreateRequest,
    current_user: User
    ) -> TestAttemptResponse:
    
    new_test_attempt = TestAttempt(
        test_id=request.test_id,
        user_id=current_user.user_id,
        started_at=request.started_at,
        completed_at=request.completed_at,
        score=request.score,
        total_questions=request.total_questions,
        correct_questions=request.correct_questions
    )
    
    db.add(new_test_attempt)
    db.commit()
    db.refresh(new_test_attempt)
    
    return new_test_attempt
    
    