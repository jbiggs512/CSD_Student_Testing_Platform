from pydantic import BaseModel


class CourseResponse(BaseModel):
    course_id: int
    course_title: str

    model_config = {"from_attributes": True}
