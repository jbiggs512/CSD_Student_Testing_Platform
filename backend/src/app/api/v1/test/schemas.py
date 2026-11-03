from pydantic import BaseModel

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

