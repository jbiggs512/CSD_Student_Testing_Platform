import { API_BASE_URL } from '@shared/config'

export type UserRole = 'student' | 'lecturer' | 'admin'

export type AccountStatus = 'active' | 'disabled' | 'pending'

export interface AuthUser {
  user_id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: UserRole
  account_status: AccountStatus
  registration_date: string
  last_login: string | null
  failed_login_attempts?: number
  locked_until?: string | null
}

const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  student: '/dashboard',
  lecturer: '/lecturerDashboard',
  admin: '/adminDashboard',
}

export function getDashboardPathForRole(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role]
}

/**
 * Holds the short-lived JWT access token and authenticated user profile in
 * memory rather than localStorage to avoid XSS exposure. Session persistence
 * across page reloads relies on the backend's HttpOnly refresh_token cookie.
 */
let currentAccessToken: string | null = null
let currentUser: AuthUser | null = null
let pendingRestore: Promise<AuthUser | null> | null = null
let pendingRefresh: Promise<string | null> | null = null
let sessionEpoch = 0

export function getAccessToken(): string | null {
  return currentAccessToken
}

export function setAccessToken(token: string | null): void {
  currentAccessToken = token
}

export function getCurrentUser(): AuthUser | null {
  return currentUser
}

export function setCurrentUser(user: AuthUser | null): void {
  currentUser = user
}

export function clearAccessToken(): void {
  sessionEpoch += 1
  currentAccessToken = null
  currentUser = null
  pendingRestore = null
  pendingRefresh = null
}

async function performTokenRefresh(): Promise<string | null> {
  const currentEpoch = sessionEpoch
  try {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (sessionEpoch !== currentEpoch) {
      return null
    }

    if (!refreshResponse.ok) {
      clearAccessToken()
      return null
    }

    const refreshData = (await refreshResponse.json()) as {
      access_token?: unknown
      user?: AuthUser
    }
    if (
      typeof refreshData.access_token !== 'string' ||
      refreshData.access_token.length === 0
    ) {
      clearAccessToken()
      return null
    }

    setAccessToken(refreshData.access_token)
    if (refreshData.user) {
      setCurrentUser(refreshData.user)
    }
    return refreshData.access_token
  } catch {
    clearAccessToken()
    return null
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  pendingRefresh ??= performTokenRefresh().finally(() => {
    pendingRefresh = null
  })
  return pendingRefresh
}

function buildAuthRequestInit(
  token: string,
  options: RequestInit,
): RequestInit {
  return {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  }
}

export async function fetchWithAuthRetry(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(url, buildAuthRequestInit(token, options))
  if (response.status !== 401) {
    return response
  }

  const refreshedToken = await refreshAccessToken()
  if (!refreshedToken) {
    return response
  }

  return fetch(url, buildAuthRequestInit(refreshedToken, options))
}

/**
 * Completely invalidates both the client in-memory auth state and the backend's
 * HttpOnly refresh token cookie so the user cannot be re-authenticated upon
 * subsequent navigation or page reloads.
 */
export async function logoutUser(): Promise<void> {
  clearAccessToken()

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Session is already cleared locally; ignore network error during logout.
  }
}

async function performSessionRestore(): Promise<AuthUser | null> {
  const currentEpoch = sessionEpoch

  try {
    let token = currentAccessToken

    if (!token) {
      token = await refreshAccessToken()
      if (sessionEpoch !== currentEpoch || !token) {
        return null
      }
    }

    let meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (sessionEpoch !== currentEpoch) {
      return null
    }

    if (meResponse.status === 401) {
      token = await refreshAccessToken()
      if (sessionEpoch !== currentEpoch || !token) {
        return null
      }
      meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (sessionEpoch !== currentEpoch) {
        return null
      }
    }

    if (!meResponse.ok) {
      clearAccessToken()
      return null
    }

    const user = (await meResponse.json()) as AuthUser
    setCurrentUser(user)
    return user
  } catch {
    clearAccessToken()
    return null
  }
}

/**
 * Restores the in-memory access token and user profile on page reload using
 * the HttpOnly refresh_token cookie and GET /auth/me. Concurrent calls share
 * the same in-flight request.
 */
export async function restoreAuthSession(): Promise<AuthUser | null> {
  if (currentAccessToken && currentUser) {
    return currentUser
  }

  pendingRestore ??= performSessionRestore().finally(() => {
    pendingRestore = null
  })

  return pendingRestore
}
