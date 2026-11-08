from pydantic import BaseModel
from datetime import datetime

class QuestionOptionResponse(BaseModel):
    optionId: int
    optionText: str
    isCorrect: bool

class QuestionResponse(BaseModel):
    questionId: int
    questionText: str
    options: list[QuestionOptionResponse]

class TestResponse(BaseModel):
    testId: int
    course: str
    subject: str
    testName: str
    description: str
    timed: bool
    timeLimitMinutes: int | None 
    currentQuestion: int
    questionsPerAttempt: int
    questions: list[QuestionResponse]
    
class TestAttemptCreateRequest(BaseModel):
    testId: int
    startedAt: datetime
    completedAt: datetime
    score: int
    totalQuestions: int
    
class TestAttemptResponse(BaseModel):
    attempt_id: int
    user_id: int
    test_id: int
    startedAt: datetime
    completedAt: datetime
    score: int
    totalQuestions: int

    model_config = {"from_attributes": True}
    


