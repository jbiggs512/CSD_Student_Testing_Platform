from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import Course, Subject, Test, Question, QuestionOption


def seed_test_data(db: Session) -> None:
    course = db.scalar(
        select(Course).where(Course.course_title == "BSc Software Engineering")
    )
    if course is None:
        course = Course(course_title="BSc Software Engineering")
        db.add(course)
        db.flush()

    subject = db.scalar(
        select(Subject).where(
            Subject.subject_name == "Object Oriented Programming",
            Subject.course_id == course.course_id,
        )
    )
    if subject is None:
        subject = Subject(
            subject_name="Object Oriented Programming",
            course_id=course.course_id,
        )
        db.add(subject)
        db.flush()

    test = db.scalar(
        select(Test).where(
            Test.test_name == "OOP Key Principles",
            Test.subject_id == subject.subject_id,
        )
    )
    if test is not None:
        print("Test data already exists. Skipping seeding.")
        return

    test = Test(
        subject_id=subject.subject_id,
        test_name="OOP Key Principles",
        description="This is a quick test on the key principles of OOP.",
        questions_per_attempt=5,
    )
    db.add(test)
    db.flush()

    # Example quiz data 
    quiz_data = [
        {
            "text": "Which of the following best describes the principle of encapsulation in object-oriented programming?",
            "options": [
                ("Restricting direct access to an object's internal data and bundling methods that operate on that data.", True),
                ("Inheriting methods and properties from multiple base parent classes simultaneously.", False),
                ("Allowing a single interface to control completely unrelated low-level hardware structures.", False),
                ("Converting dynamic runtime logic directly into static compiled machine instructions.", False),
            ],
        },
        {
            "text": "In the context of polymorphism, what enables dynamic method dispatch in languages like Java or C++?",
            "options": [
                ("Virtual methods resolved at runtime based on the actual object type.", True),
                ("Compile-time static string replacements across global function tables.", False),
                ("Explicit manual pointer arithmetic managed entirely by application code.", False),
                ("Strict compile-time type casting without runtime object metadata.", False),
            ],
        },
        {
            "text": "What is the primary architectural benefit of adhering to the Liskov Substitution Principle (LSP)?",
            "options": [
                ("Objects of a superclass can be replaced with objects of a subclass without breaking application correctness.", True),
                ("It eliminates the need to write unit tests for deeply nested subclass hierarchies.", False),
                ("It automatically compresses database storage footprints for complex relational schemas.", False),
                ("It guarantees zero latency during network requests across distributed microservices.", False),
            ],
        },
        {
            "text": "How does composition differ fundamentally from inheritance in object-oriented design?",
            "options": [
                ("Composition builds complex types by containing instances of other classes rather than inheriting behavior.", True),
                ("Composition requires strict multi-threading locks around every instantiated member variable.", False),
                ("Inheritance prevents code reuse whereas composition forces deep multi-level class trees.", False),
                ("There is no functional difference; they compile into the exact same bytecode instructions.", False),
            ],
        },
        {
            "text": "What is the main purpose of an abstract class in object-oriented programming?",
            "options": [
                ("To provide a partial implementation that serves as a common template for subclasses to extend.", True),
                ("To completely block subclasses from overriding any inherited parent functionality.", False),
                ("To enforce strict global variable scoping across unrelated application packages.", False),
                ("To allocate unmanaged memory blocks directly on the operating system heap.", False),
            ],
        },
    ]

    for q_data in quiz_data:
        question = Question(
            subject_id=subject.subject_id,
            test_id=test.test_id,
            question_text=q_data["text"],
        )
        db.add(question)
        db.flush()

        for option_text, is_correct in q_data["options"]:
            option = QuestionOption(
                question_id=question.question_id,
                option_text=option_text,
                is_correct=is_correct,
            )
            db.add(option)

    db.commit()
    print("Seeded test data successfully.")

if __name__ == "__main__":
    with SessionLocal.begin() as db:
        seed_test_data(db)