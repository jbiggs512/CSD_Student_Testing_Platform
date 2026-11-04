from pydantic import BaseModel


class CourseCreateRequest(BaseModel):
    course_title: str


class CourseUpdateRequest(BaseModel):
    course_title: str


class CourseResponse(BaseModel):
    course_id: int
    course_title: str

    model_config = {"from_attributes": True}
