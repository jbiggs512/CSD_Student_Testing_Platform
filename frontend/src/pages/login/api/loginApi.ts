import { setAccessToken, setCurrentUser } from '@shared/api'
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

    if (response.status === 423) {
      throw new LoginApiError(
        detailMessage ??
          'Your account is temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
        423,
      )
    }

    throw new LoginApiError(
      detailMessage ?? 'Unable to sign in right now. Please try again.',
      response.status,
    )
  }

  const data = (await response.json()) as LoginResponse
  setAccessToken(data.access_token)
  setCurrentUser(data.user)
  return data
}

async function postAuthMessage(
  endpoint: string,
  payload: Record<string, string>,
  fallbackError: string,
): Promise<string> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new LoginApiError(
      'Unable to connect to the server. Please try again.',
      0,
    )
  }

  let body: { message?: unknown; detail?: unknown } = {}
  try {
    body = (await response.json()) as { message?: unknown; detail?: unknown }
  } catch {
    // Non-JSON responses fall back to the default message below.
  }

  if (!response.ok) {
    const detail =
      typeof body.detail === 'string' && body.detail.trim()
        ? body.detail
        : fallbackError
    throw new LoginApiError(detail, response.status)
  }

  return typeof body.message === 'string' && body.message.trim()
    ? body.message
    : 'Done.'
}

export async function requestPasswordReset(email: string): Promise<string> {
  return postAuthMessage(
    'forgot-password',
    { email },
    'Unable to send password reset email. Please try again.',
  )
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<string> {
  return postAuthMessage(
    'reset-password',
    { token, new_password: newPassword },
    'Unable to reset your password. Please try again.',
  )
}
