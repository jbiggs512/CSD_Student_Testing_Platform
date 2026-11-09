from sqlalchemy import select
from sqlalchemy.orm import Session
import datetime

from app.db.session import SessionLocal
from app.db.models import Course, Subject, Test, Question, QuestionOption, User, TestAttempt

def seed_test_attempt_data(db: Session) -> None:
    course = db.scalar(
        select(Course).where(Course.course_title == "BSc Software Engineering")
    )
    if course is None:
        course = Course(course_title="BSc Software Engineering")
        db.add(course)
        db.flush()

    subject = db.scalar(
        select(Subject).where(
            Subject.subject_name == "Artificial Intelligence",
            Subject.course_id == course.course_id,
        )
    )
    if subject is None:
        subject = Subject(
            subject_name="Artificial Intelligence",
            course_id=course.course_id,
        )
        db.add(subject)
        db.flush()

    test = db.scalar(
        select(Test).where(
            Test.test_name == "Intro to Artificial Intelligence",
            Test.subject_id == subject.subject_id,
        )
    )
    if test is not None:
        print("Test data already exists. Skipping seeding.")
        return

    test = Test(
        subject_id=subject.subject_id,
        test_name="Intro to Artificial Intelligence",
        description="This is a quick test on the intro to AI lecture.",
        questions_per_attempt=5,
    )
    db.add(test)
    db.flush()

    questions = [
        Question(
            test_id=test.test_id,
            question_text=f"Sample Question {index}",
        )
        for index in range(1, 6)
    ]
    db.add_all(questions)
    db.flush()

    for question in questions:
        db.add_all(
            [
                QuestionOption(
                    question_id=question.question_id,
                    option_text=f"Option {index} for Question {question.question_id}",
                    is_correct=index == 1,
                )
                for index in range(1, 5)
            ]
        )
    db.flush()
    
    student = db.scalar(select(User).where(User.username == "student"))
    if student is None:
        print('Failed to find testing student user')
    else:
        db.add(TestAttempt(
            user_id=student.user_id,
            test_id=test.test_id,
            started_at=datetime.now(),
            completed_at=datetime.now(),
            score=120,
            total_questions=5,
            correct_questions=4
        ))
    
    db.commit()
    print("Seeded test attempt data successfully.")

if __name__ == "__main__":
    with SessionLocal.begin() as db:
        seed_test_attempt_data(db)