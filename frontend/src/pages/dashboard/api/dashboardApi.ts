import { getAccessToken } from '@shared/api'
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

async function dashboardRequest<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const token = getAccessToken()
    
    if (!token) {
        throw new DashboardApiError(
            'Your session has expired. Please sign in again.',
            401,
        )
    }
        
    let response: Response
    try {
       response = await fetch(`${API_BASE_URL}/student${endpoint}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...options.headers,
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

    const data = (await response.json()) as T

    return data
}

export function getOutstandingTests(): Promise<OutstandingTest[]> {
    return dashboardRequest<OutstandingTest[]>(`/outstandingTests`)
}

export function getCompletedTests(): Promise<CompletedTest[]> {
    return dashboardRequest<CompletedTest[]>(`/completedTests`)
}

export function getCohortRank(): Promise<CohortRank> {
     return dashboardRequest<CohortRank>(`/cohortRank`)
}