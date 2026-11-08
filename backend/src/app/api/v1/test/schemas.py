from pydantic import BaseModel
from datetime import datetime

class QuestionOptionResponse(BaseModel):
    option_id: int
    option_text: str
    is_correct: bool

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
    
class TestAttemptCreateRequest(BaseModel):
    test_id: int
    started_at: datetime
    completed_at: datetime
    score: int
    total_questions: int
    
class TestAttemptResponse(BaseModel):
    attempt_id: int
    user_id: int
    test_id: int
    started_at: datetime
    completed_at: datetime
    score: int
    total_questions: int

    model_config = {"from_attributes": True}
    


