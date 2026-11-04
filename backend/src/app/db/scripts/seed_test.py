
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import Course, Subject, Test, Question, QuestionOption


def seed_test_data(db: Session) -> None:
    course = db.scalar(
        select(Course).where(Course.course_title == "Sample Course")
    )
    if course is None:
        course = Course(course_title="Sample Course")
        db.add(course)
        db.flush()

    subject = db.scalar(
        select(Subject).where(
            Subject.subject_name == "Sample Subject",
            Subject.course_id == course.course_id,
        )
    )
    if subject is None:
        subject = Subject(
            subject_name="Sample Subject",
            course_id=course.course_id,
        )
        db.add(subject)
        db.flush()

    test = db.scalar(
        select(Test).where(
            Test.test_name == "Sample Test",
            Test.subject_id == subject.subject_id,
        )
    )
    if test is not None:
        print("Test data already exists. Skipping seeding.")
        return

    test = Test(
        subject_id=subject.subject_id,
        test_name="Sample Test",
        description="This is a sample test.",
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

    db.commit()
    print("Seeded test data successfully.")

if __name__ == "__main__":
    with SessionLocal.begin() as db:
        seed_test_data(db)
