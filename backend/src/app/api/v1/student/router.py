from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Response, status
from typing import Annotated

from app.api.deps import get_db, require_roles, get_current_user
from app.api.v1.student import schemas
from app.api.v1.student import service

from app.db.models import User
from app.enums import UserRole

router = APIRouter()

@router.get("/outstandingTests")
def get_outstanding_tests(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> list[schemas.OutstandingTestResponse]:
    """Get outstanding tests by current student ID"""
    return service.get_outstanding_tests(db, current_user.user_id)

@router.get("/completedTests")
def get_completed_tests(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> list[schemas.CompletedTestResponse]:
    """Get completed tests by current student ID"""
    return service.get_completed_tests(db, current_user.user_id)

@router.get("/cohortRank")
def get_cohort_rank(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> schemas.CohortRankResponse:
    """Get cohort rank for the current student"""
    cohort_rank = service.get_cohort_rank(db, current_user)
    if cohort_rank is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return cohort_rank

@router.get("/courseTitle")
def get_course_title(
    response: Response,
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> str | None:
    """Get course title for the current student"""
    course = service.get_course_title(current_user)
    if course is None:
        response.status_code = status.HTTP_204_NO_CONTENT
        return None
    return course

@router.get("/subjects")
def get_subjects(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> list[schemas.SubjectResponse]:
    """Get subjects available for the current student"""
    subjects = service.get_subjects(db, current_user)
    if subjects is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return subjects

@router.get("/leaderboard/{subject_id}")
def get_leaderboard(
    subject_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> schemas.LeaderboardResponse:
    """Get the leaderboard data for the passed subject"""
    leaderboard = service.get_leaderboard(db, current_user, subject_id)
    if leaderboard is None:
            return Response(status_code=status.HTTP_204_NO_CONTENT)
    return leaderboard

@router.get("/statistics")
def get_statistics(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> schemas.StatisticsResponse:
    """Get the statistics overview for the authenticated student"""
    stats = service.get_statistics(db, current_user.user_id)
    if stats is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return stats

@router.get("/gradesOverTime")
def grades_over_time(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
):
    """
    Get the grades over time for the current authenticated user.
    Returns no content if the user is not enrolled on a course or has no test results.
    """
    result = service.get_grades_over_time(db, current_user.user_id)
    if result is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return result

@router.get("/{subject_id}/cohortComparison")
def cohort_comparison(
    subject_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> schemas.CohortComparisonResponse:
    """Get the data for the cohort comparison chart for the authenticated user and passed subject"""
    return service.get_cohort_comparison(db, current_user, subject_id)


@router.get("/{subject_id}/scoreDistribution")
def score_distribution(
    subject_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> schemas.ScoreDistributionResponse:
    """Get the data for the score distribution chart for the authenticated user and passed subject"""
    return service.get_score_distribution(db, current_user, subject_id)