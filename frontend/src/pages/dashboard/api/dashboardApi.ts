import { createApiClient, ApiError } from '@shared/api'
import type { OutstandingTest, CompletedTest, CohortRank } from "../model"

export class DashboardApiError extends ApiError {
    constructor(message: string, status: number) {
        super(message, status)
        this.name = 'DashboardApiError'
    }
}

const request = createApiClient({ basePath: '/student', ErrorClass: DashboardApiError })

export function getOutstandingTests(): Promise<OutstandingTest[]> {
    return request<OutstandingTest[]>(`/outstandingTests`)
}

export function getCompletedTests(): Promise<CompletedTest[]> {
    return request<CompletedTest[]>(`/completedTests`)
}

export function getCohortRank(): Promise<CohortRank> {
     return request<CohortRank>(`/cohortRank`)
}

export function getCourseTitle(): Promise<string> {
     return request<string>(`/courseTitle`)
}