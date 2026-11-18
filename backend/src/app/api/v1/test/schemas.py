from pydantic import BaseModel, Field
from datetime import datetime

MIN_QUESTIONS_PER_ATTEMPT = 10

class QuestionOptionResponse(BaseModel):
    option_id: int
    option_text: str

class QuestionResponse(BaseModel):
    question_id: int
    question_text: str
    options: list[QuestionOptionResponse]

class TestResponse(BaseModel):
    test_id: int
    course: str
    subject: str
    test_name: str
    description: str
    timed: bool
    time_limit_minutes: int | None 
    current_question: int
    questions_per_attempt: int
    questions: list[QuestionResponse]


class TestAnswerSubmission(BaseModel):
    question_id: int
    selected_option_id: int | None = None


class TestAttemptCreateRequest(BaseModel):
    test_id: int
    started_at: datetime
    completed_at: datetime
    answers: list[TestAnswerSubmission] = Field(default_factory=list)
    
class TestAttemptResponse(BaseModel):
    attempt_id: int
    user_id: int
    test_id: int
    started_at: datetime
    completed_at: datetime
    score: int
    total_questions: int
    correct_questions: int

    model_config = {"from_attributes": True}
    



class TestCreateRequest(BaseModel):
    subject_id: int
    test_name: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    time_limit_minutes: int | None = Field(default=None, gt=0, le=600)
    questions_per_attempt: int = Field(
        default=MIN_QUESTIONS_PER_ATTEMPT, ge=MIN_QUESTIONS_PER_ATTEMPT, le=200
    )


class LecturerTestResponse(BaseModel):
    test_id: int
    test_name: str
    description: str | None
    subject_id: int
    subject_name: str
    course_title: str
    time_limit_minutes: int | None
    questions_per_attempt: int
    pool_size: int
    attempt_count: int = 0
    average_percentage: float | None = None


class TestManagementStatsResponse(BaseModel):
    student_total: int
    student_average_last_7_days: float | None
    weakest_test_last_7_days: str | None


class StudentTestAttemptItem(BaseModel):
    attempt_id: int
    user_id: int
    username: str
    student_name: str
    score: int
    correct_questions: int
    total_questions: int
    percentage: float
    completed_at: datetime


class TestResultsDetailResponse(BaseModel):
    test_id: int
    test_name: str
    subject_name: str
    course_title: str
    attempt_count: int
    average_percentage: float | None
    highest_score: int | None
    lowest_score: int | None
    attempts: list[StudentTestAttemptItem]
