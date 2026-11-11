import { createApiClient, ApiError } from '@shared/api'

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