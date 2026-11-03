import type { TestDetails } from "../model"
import { API_BASE_URL } from '@shared/config'

export class TestApiError extends Error {
    readonly status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = 'TestApiError'
        this.status = status
    }
}

export async function getTestDetails(id: number): Promise<TestDetails> {
    let response: Response

    try {
        response = await fetch(`${API_BASE_URL}/test/${id}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
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

    const data = (await response.json()) as TestDetails

    return data
}
