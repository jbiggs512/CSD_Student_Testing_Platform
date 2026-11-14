from pydantic import BaseModel


class QuestionOptionCreateRequest(BaseModel):
    option_text: str
    is_correct: bool


class QuestionOptionResponse(BaseModel):
    option_id: int
    option_text: str
    is_correct: bool

    model_config = {"from_attributes": True}


class QuestionCreateRequest(BaseModel):
    subject_id: int
    question_text: str
    options: list[QuestionOptionCreateRequest]


class QuestionUpdateRequest(BaseModel):
    subject_id: int | None = None
    question_text: str | None = None
    options: list[QuestionOptionCreateRequest] | None = None


class QuestionBulkItemRequest(BaseModel):
    question_text: str
    options: list[QuestionOptionCreateRequest]


class QuestionBulkCreateRequest(BaseModel):
    subject_id: int
    questions: list[QuestionBulkItemRequest]


class QuestionResponse(BaseModel):
    question_id: int
    question_code: str | None = None
    subject_id: int | None
    test_id: int | None = None
    question_text: str
    options: list[QuestionOptionResponse]

    model_config = {"from_attributes": True}


class QuestionBulkCreateResponse(BaseModel):
    created_count: int
    questions: list[QuestionResponse]
