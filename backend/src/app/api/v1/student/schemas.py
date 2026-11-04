from pydantic import BaseModel

class OutstandingTestResponse(BaseModel):
    id: int
    testName: str
    subjectName: str
    description: str
    questionsPerAttempt: int
    