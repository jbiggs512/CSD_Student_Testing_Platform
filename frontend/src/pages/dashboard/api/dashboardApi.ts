import { createApiClient, ApiError } from '@shared/api'
import type { OutstandingTest, CompletedTest, CohortRank } from "../model"

export class DashboardApiError extends ApiError {
    constructor(message: string, status: number) {
        super(message, status)
        this.name = 'DashboardApiError'
    }
}

const request = createApiClient({ basePath: '/student', ErrorClass: DashboardApiError })

export function getOutstandingTests(): Promise<OutstandingTest[] | undefined> {
    return request<OutstandingTest[]>(`/outstandingTests`)
}

export function getCompletedTests(): Promise<CompletedTest[] | undefined> {
    return request<CompletedTest[]>(`/completedTests`)
}

export function getCohortRank(): Promise<CohortRank | undefined> {
     return request<CohortRank>(`/cohortRank`)
}

export function getCourseTitle(): Promise<string | undefined> {
     return request<string>(`/courseTitle`)
}