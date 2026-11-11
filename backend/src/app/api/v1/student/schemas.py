from pydantic import BaseModel

class OutstandingTestResponse(BaseModel):
    id: int
    test_name: str
    subject_name: str
    description: str
    questions_per_attempt: int
    
class CompletedTestResponse(BaseModel):
    id: int
    test_name: str
    score_percentage: int
    questions_correct: int
    questions_total: int
    completed_date: str
    score_points: int
    
class CohortRankResponse(BaseModel):
    rank: int
    size: int
    