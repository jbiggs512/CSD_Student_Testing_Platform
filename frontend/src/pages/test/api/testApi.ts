import { createApiClient, ApiError } from '@shared/api'
import type { TestDetails, TestAttempt, TestAttemptRequest } from "../model"

export class TestApiError extends ApiError {
    constructor(message: string, status: number) {
        super(message, status)
        this.name = 'TestApiError'
    }
}

const request = createApiClient({ basePath: '/student', ErrorClass: TestApiError })

export function getTestDetails(id: number): Promise<TestDetails> {
    return request<TestDetails>(`/${id}`)
}

export function createTestAttempt(
    payload: TestAttemptRequest,
): Promise<TestAttempt> {
    return request<TestAttempt>('/attempt', {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}