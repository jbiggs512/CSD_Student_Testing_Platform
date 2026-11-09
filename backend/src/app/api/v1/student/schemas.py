from pydantic import BaseModel

class OutstandingTestResponse(BaseModel):
    id: int
    test_name: str
    subject_name: str
    description: str
    questions_per_attempt: int
    