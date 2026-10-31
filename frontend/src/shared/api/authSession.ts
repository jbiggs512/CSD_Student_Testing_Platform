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
  currentAccessToken = null
  currentUser = null
}

async function performSessionRestore(): Promise<AuthUser | null> {
  try {
    let token = currentAccessToken

    if (!token) {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!refreshResponse.ok) {
        clearAccessToken()
        return null
      }

      const refreshData = (await refreshResponse.json()) as {
        access_token?: unknown
      }
      if (
        typeof refreshData.access_token !== 'string' ||
        refreshData.access_token.length === 0
      ) {
        clearAccessToken()
        return null
      }

      token = refreshData.access_token
      setAccessToken(token)
    }

    const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

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

  if (!pendingRestore) {
    pendingRestore = performSessionRestore().finally(() => {
      pendingRestore = null
    })
  }

  return pendingRestore
}
