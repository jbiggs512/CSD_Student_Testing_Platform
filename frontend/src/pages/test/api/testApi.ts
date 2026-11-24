import { createApiClient, ApiError } from '@shared/api'
import type { TestDetails, TestAttempt, TestCompletedRequest } from "../model"

export class TestApiError extends ApiError {
    constructor(message: string, status: number) {
        super(message, status)
        this.name = 'TestApiError'
    }
}

const request = createApiClient({ basePath: '/test', ErrorClass: TestApiError })

export async function getServerTime() {
    const res = await fetch('/time');
    const data = await res.json();
    return data.server_time;
}

export function getTestDetails(id: number): Promise<TestDetails | undefined> {
    return request<TestDetails>(`/${id}`)
}

export function createTestAttempt(id: number): Promise<TestAttempt | undefined> {
    return request<TestAttempt>(`/attempt/${id}`, {
        method: 'POST',
    })
}

export function completeTestAttempt(
    payload: TestCompletedRequest,
): Promise<TestAttempt | undefined> {
    return request<TestAttempt>('/complete', {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
}