import { setAccessToken } from '@shared/api'
import { API_BASE_URL } from '@shared/config'
import type { LoginCredentials, LoginResponse } from '../model'

export class LoginApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'LoginApiError'
    this.status = status
  }
}

export async function loginWithCredentials(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  let response: Response

  try {
    // credentials: 'include' is required so the browser accepts and stores the
    // HttpOnly refresh_token cookie returned by the backend across origins.
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    })
  } catch {
    throw new LoginApiError(
      'Unable to connect to the server. Please try again.',
      0,
    )
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new LoginApiError('Incorrect Credentials. Please try again.', 401)
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
      throw new LoginApiError(
        detailMessage ?? 'Your account is not permitted to sign in.',
        403,
      )
    }

    throw new LoginApiError(
      detailMessage ?? 'Unable to sign in right now. Please try again.',
      response.status,
    )
  }

  const data = (await response.json()) as LoginResponse
  setAccessToken(data.access_token)
  return data
}
