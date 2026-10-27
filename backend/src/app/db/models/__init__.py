from app.db.models.user import Role, User
from app.db.models.course import Course
from app.db.models.subject import Subject
from app.db.models.test import Test
from app.db.models.question import Question

# Assocation table for the many-to-many relationship between users and courses.
from app.db.models.user_course import user_courses

# Temporary: retain while the example endpoints are still in use.
from app.db.models.example import ExampleRecord

__all__ = ["Role", "User", "Course", "Subject", "Test", "Question", "user_courses", "ExampleRecord"]