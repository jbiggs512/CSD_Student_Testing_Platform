import { getAccessToken } from '@shared/api'
import type { TestDetails, TestAttempt, TestAttemptRequest } from "../model"
import { API_BASE_URL } from '@shared/config'

export class TestApiError extends Error {
    readonly status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = 'TestApiError'
        this.status = status
    }
}

async function testRequest<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const token = getAccessToken()

    if (!token) {
        throw new TestApiError(
            'Your session has expired. Please sign in again.',
            401,
        )
    }

    let response: Response
    try {
        response = await fetch(`${API_BASE_URL}/test${endpoint}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...options.headers,
            },
        })
    } catch {
        throw new TestApiError(
            'Unable to connect to the server. Please try again.',
            0,
        )
    }

    if (!response.ok) {
        if (response.status === 401) {
            throw new TestApiError('Incorrect Credentials. Please try again.', 401)
        }

        let detailMessage: string | undefined
        try {
            const errorBody = (await response.json()) as { detail?: unknown }
            if (typeof errorBody.detail === 'string' && errorBody.detail.trim()) {
                detailMessage = errorBody.detail
            }
        } catch {
            // Non-JSON error bodies (e.g. proxy 502/500 pages) fall back to the default message below.
        }

        if (response.status === 403) {
            throw new TestApiError(
                detailMessage ?? 'Your account is not permitted to access this resource.',
                403,
            )
        }

        throw new TestApiError(
            detailMessage ?? 'Unable to access the requested resource right now. Please try again.',
            response.status,
        )
    }

    const data = (await response.json()) as T

    return data
}

export function getTestDetails(id: number): Promise<TestDetails> {
    return testRequest<TestDetails>(`/${id}`)
}

export function createTestAttempt(
  request: TestAttemptRequest,
): Promise<TestAttempt> {
  return testRequest<TestAttempt>('/attempt', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}