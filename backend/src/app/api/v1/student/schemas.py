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
    
class SubjectResponse(BaseModel):
    label: str
    value: int    

class LeaderboardEntry(BaseModel):
    user_id: int
    rank: int
    name: str
    avg_score: float
    points: int

class LeaderboardResponse(BaseModel):
    top_students: list[LeaderboardEntry]
    current_user_entry: LeaderboardEntry | None
    is_in_top_5: bool
    