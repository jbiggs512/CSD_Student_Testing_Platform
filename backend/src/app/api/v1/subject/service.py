from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.models import Subject
from app.enums import SubjectStatus

from app.api.v1.subject.schemas import SubjectResponse, SubjectCreateRequest, SubjectUpdateRequest

# Constants for error messages
SUBJECT_NOT_FOUND_DETAIL = "Subject not found."
SUBJECT_ALREADY_EXISTS_DETAIL = "Subject already exists for this course."

# Utility function to check subject existence and return it, or raise a 404 error if not found
def get_subject_or_404(db: Session, subject_id: int) -> Subject:
    subject = db.execute(
        select(Subject).where(Subject.subject_id == subject_id)
    ).scalar_one_or_none()

    if not subject:
        raise HTTPException(status_code=404, detail=SUBJECT_NOT_FOUND_DETAIL)

    return subject

## Subject Management Service Functions

# Create a new subject
def create_subject(db: Session, request: SubjectCreateRequest) -> SubjectResponse:
    # Check if the subject already exists for the given course
    existing_subject = db.execute(
        select(Subject).where(
            Subject.course_id == request.course_id,
            Subject.subject_name == request.subject_name
        )
    ).scalar_one_or_none()

    if existing_subject:
        raise HTTPException(status_code=400, detail=SUBJECT_ALREADY_EXISTS_DETAIL)

    new_subject = Subject(
        subject_name=request.subject_name,
        course_id=request.course_id,
        status=SubjectStatus.ACTIVE
    )

    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)

    return new_subject

# Update an existing subject
def update_subject(db: Session, request: SubjectUpdateRequest, subject_id: int) -> SubjectResponse:
    # Retrieve the existing subject
    existing_subject = get_subject_or_404(db, subject_id)

    next_subject_name = (
        request.subject_name
        if request.subject_name is not None
        else existing_subject.subject_name
    )
    next_course_id = (
        request.course_id
        if request.course_id is not None
        else existing_subject.course_id
    )

    duplicate_subject = db.execute(
        select(Subject).where(
            Subject.course_id == next_course_id,
            Subject.subject_name == next_subject_name,
            Subject.subject_id != subject_id,
        )
    ).scalar_one_or_none()

    if duplicate_subject:
        raise HTTPException(status_code=400, detail=SUBJECT_ALREADY_EXISTS_DETAIL)

    if request.subject_name is not None:
        existing_subject.subject_name = request.subject_name
    if request.course_id is not None:
        existing_subject.course_id = request.course_id
    if request.status is not None:
        existing_subject.status = request.status

    db.commit()
    db.refresh(existing_subject)

    return existing_subject

# Retrieve a single subject by ID
def get_subject(db: Session, subject_id: int) -> SubjectResponse:
    return get_subject_or_404(db, subject_id)

# Retrieve all subjects
def get_subjects(db: Session) -> list[SubjectResponse]:
    # Retrieve all subjects from the database
    return db.execute(select(Subject)).scalars().all()
    
# Delete a subject by ID
def delete_subject(db: Session, subject_id: int) -> None:
    subject = get_subject_or_404(db, subject_id)

    db.delete(subject)
    db.commit()