import { API_BASE_URL } from '../config'
import { getAccessToken } from '../api/authSession'

export class ApiError extends Error {
    readonly status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}

export interface ApiClientOptions {
    basePath?: string
    ErrorClass?: new (message: string, status: number) => ApiError
}

export function createApiClient({
    basePath = '',
    ErrorClass = ApiError,
}: ApiClientOptions = {}) {
    return async function request<T>(
        endpoint: string,
        options: RequestInit = {},
    ): Promise<T> {
        const token = getAccessToken()

        if (!token) {
            throw new ErrorClass('Your session has expired. Please sign in again.', 401)
        }

        let response: Response
        try {
            response = await fetch(`${API_BASE_URL}${basePath}${endpoint}`, {
                ...options,
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                    ...options.headers,
                },
            })
        } catch {
            throw new ErrorClass('Unable to connect to the server. Please try again.', 0)
        }

        if (!response.ok) {
            if (response.status === 401) {
                throw new ErrorClass('Incorrect Credentials. Please try again.', 401)
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
                throw new ErrorClass(
                    detailMessage ?? 'Your account is not permitted to access this resource.',
                    403,
                )
            }

            throw new ErrorClass(
                detailMessage ??
                    'Unable to access the requested resource right now. Please try again.',
                response.status,
            )
        }

        return (await response.json()) as T
    }
}