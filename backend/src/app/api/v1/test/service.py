from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.models import Course, Subject, Test, Question, QuestionOption
from app.api.v1.test.schemas import QuestionOptionResponse, QuestionResponse, TestResponse


def get_test_data(
    db: Session, 
    target_test_id: int
) -> TestResponse:
    
    # Fetch the test data from the database
    test = db.scalar(
        select(Test).where(Test.test_id == target_test_id)
    )

    if test is None:
        raise HTTPException(status_code=404, detail=f"Test with ID '{target_test_id}' not found.")

    return TestResponse(
        testId=test.test_id,
        course=test.subject.course.course_title,
        subject=test.subject.subject_name,
        testName=test.test_name,
        description=test.description,
        questionsPerAttempt=test.questions_per_attempt,
        timeLimitMinutes=test.time_limit_minutes,
        questions=[
            QuestionResponse(
                questionId=question.question_id,
                questionText=question.question_text,
                options=[
                    QuestionOptionResponse(
                        optionId=option.option_id,
                        optionText=option.option_text,
                        isCorrect=option.is_correct
                    )
                    for option in question.options
                ]
            )
            for question in test.questions
        ]
    )