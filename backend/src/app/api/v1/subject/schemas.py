from pydantic import BaseModel

from app.enums import SubjectStatus

class SubjectCreateRequest(BaseModel):
    subject_name: str
    course_id: int

class SubjectUpdateRequest(BaseModel):
    subject_name: str | None = None
    course_id: int | None = None
    status: SubjectStatus | None = None

class SubjectResponse(BaseModel):
    subject_id: int
    subject_name: str
    course_id: int
    course_title: str
    status: SubjectStatus

    model_config = {"from_attributes": True}