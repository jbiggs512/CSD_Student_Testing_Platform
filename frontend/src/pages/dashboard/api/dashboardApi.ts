import type { OutstandingTest, CompletedTest, CohortRank } from "../model"
import { API_BASE_URL } from '@shared/config'

export class DashboardApiError extends Error {
    readonly status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = 'DashboardApiError'
        this.status = status
    }
}

export async function getOutstandingTests(id: number): Promise<OutstandingTest[]> {
    let response: Response

    try {
        response = await fetch(`${API_BASE_URL}/student/outstandingTests/${id}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        })
    } catch {
        throw new DashboardApiError(
            'Unable to connect to the server. Please try again.',
            0,
        )
    }

    if (!response.ok) {
        if (response.status === 401) {
            throw new DashboardApiError('Incorrect Credentials. Please try again.', 401)
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
            throw new DashboardApiError(
                detailMessage ?? 'Your account is not permitted to access this resource.',
                403,
            )
        }

        throw new DashboardApiError(
            detailMessage ?? 'Unable to access the requested resource right now. Please try again.',
            response.status,
        )
    }

    const data = (await response.json()) as OutstandingTest[]

    return data
}

export function getCompletedTests(): CompletedTest[] {
    // Mock data for completed tests
    return [
        {
            id: 1,
            testName: 'Test 1',
            scorePercentage: 50,
            questionsCorrect: 6,
            questionsTotal: 12,
            completedDate: '10th October 2026',
            scorePoints: 280
        },
        {
            id: 2,
            testName: 'Test 2',
            scorePercentage: 92,
            questionsCorrect: 18,
            questionsTotal: 20,
            completedDate: '15th October 2026',
            scorePoints: 360
        }
    ]
}

export function getCohortRank(): CohortRank {
    return {
        rank: 12,
        size: 48
    }
}