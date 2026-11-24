import { createApiClient, ApiError } from '@shared/api'
import type { CohortComparisonResponse, LeaderboardResponse, ScoreDistributionResponse, SubjectFilter } from '../model'

export class LeaderboardApiError extends ApiError {
    constructor(message: string, status: number) {
        super(message, status)
        this.name = 'LeaderboardApiError'
    }
}

const request = createApiClient({ basePath: '/student', ErrorClass: LeaderboardApiError })

export function getCourseTitle(): Promise<string | undefined> {
    return request<string>('/courseTitle')
}

export function getSubjects(): Promise<SubjectFilter[] | undefined>{
    return request<SubjectFilter[]>(`/subjects`)
}

export function getLeaderboard(subjectId: number): Promise<LeaderboardResponse | undefined> {
    return request<LeaderboardResponse>(`/leaderboard/${subjectId}`)
}

export function getCohortComparison(subjectId: number): Promise<CohortComparisonResponse | undefined> {
    return request<CohortComparisonResponse>(`/${subjectId}/cohortComparison`)
}

export function getScoreDistribution(subjectId: number): Promise<ScoreDistributionResponse | undefined> {
    return request<ScoreDistributionResponse>(`/${subjectId}/scoreDistribution`)
}