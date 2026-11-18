import { createApiClient, ApiError } from '@shared/api'
import type { LeaderboardResponse, SubjectFilter } from '../model'

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