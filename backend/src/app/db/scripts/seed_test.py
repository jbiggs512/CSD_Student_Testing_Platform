
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import Course, Subject, Test, Question, QuestionOption

def seed_test_data(db: Session) -> None:
    # Check if course data already exists
    existing_course = db.scalar(select(Course).where(Course.course_id == 1))
    if not existing_course:
        # Create a course for the test
        course = Course(
            course_id=1,
            course_title="Sample Course",
        )
        db.add(course)
        db.flush()  # Flush to get the course_id

   # Check if subject data already exists
    existing_subject = db.scalar(select(Subject).where(Subject.subject_id == 1))
    if not existing_subject:
        # Create a subject for the test
        subject = Subject(
            subject_id=1,
            subject_name="Sample Subject",
            course_id=1  
        )
        db.add(subject)
        db.flush()  # Flush to get the subject_id

    # Check if test data already exists
    existing_test = db.scalar(select(Test).where(Test.test_id == 1))
    if existing_test:
        print("Test data already exists. Skipping seeding.")
        return

    # Create a test
    test = Test(
        test_id=1,
        subject_id=1,
        test_name="Sample Test",
        description="This is a sample test.",
        questions_per_attempt=5,
    )
    db.add(test)
    db.flush()  # Flush to get the test_id

    # Create questions for the test
    questions = [
        Question(
            question_id=i + 1,
            test_id=test.test_id,
            question_text=f"Sample Question {i + 1}"
        )
        for i in range(5)
    ]
    db.add_all(questions)
    db.flush()  # Flush to get the question_ids

    # Create options for each question
    for question in questions:
        options = [
            QuestionOption(
                option_id=j + 1 + (question.question_id - 1) * 4,
                question_id=question.question_id,
                option_text=f"Option {j + 1} for Question {question.question_id}",
                is_correct=(j == 0)  # First option is correct
            )
            for j in range(4)
        ]
        db.add_all(options)

    db.commit()
    print("Seeded test data successfully.")

if __name__ == "__main__":
    with SessionLocal.begin() as db:
        seed_test_data(db)
