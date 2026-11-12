import { createApiClient, ApiError } from '@shared/api'
import type { LeaderboardResponse, SubjectFilter } from '../model'

export class LeaderboardApiError extends ApiError {
    constructor(message: string, status: number) {
        super(message, status)
        this.name = 'LeaderboardApiError'
    }
}

const request = createApiClient({ basePath: '/student', ErrorClass: LeaderboardApiError })

export function getCourseTitle(): Promise<string> {
    return request<string>('/courseTitle')
}

export function getSubjects(): Promise<SubjectFilter[]>{
    return request<SubjectFilter[]>(`/subjects`)
}

export function getLeaderboard(subjectId: number): Promise<LeaderboardResponse> {
    return request<LeaderboardResponse>(`/leaderboard/${subjectId}`)
}