import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAccessToken,
  getAccessToken,
  getCurrentUser,
  restoreAuthSession,
  setAccessToken,
  setCurrentUser,
  type AuthUser,
  type UserRole,
} from '@shared/api'
import { NavBar, ProtectedRoute } from '@shared/components'

function buildUser(role: UserRole = 'student'): AuthUser {
  return {
    user_id: 1,
    username: 'WS123456',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@weston.ac.uk',
    role,
    account_status: 'active',
    registration_date: '2026-10-31',
    last_login: '2026-10-31T14:00:00',
  }
}

function renderProtectedRoutes(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Screen</div>} />
        <Route element={<ProtectedRoute />}>
          <Route element={<NavBar />}>
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/dashboard" element={<div>Student Dashboard</div>} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['lecturer']} />}>
              <Route
                path="/lecturerDashboard"
                element={<div>Lecturer Dashboard</div>}
              />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route
                path="/adminDashboard"
                element={<div>Admin Dashboard</div>}
              />
            </Route>
            <Route path="/profile" element={<div>Shared Profile Page</div>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute & restoreAuthSession', () => {
  beforeEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders protected route immediately when access token and user are in memory', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    setAccessToken('jwt-student-token')
    setCurrentUser(buildUser('student'))

    renderProtectedRoutes('/dashboard')

    expect(screen.getByText('Student Dashboard')).toBeDefined()
    expect(fetchSpy).not.toHaveBeenCalled()
    await expect(restoreAuthSession()).resolves.toEqual(buildUser('student'))
  })

  it('restricts routes by role and redirects unauthorized roles to their own dashboard', () => {
    setAccessToken('jwt-student-token')
    setCurrentUser(buildUser('student'))

    renderProtectedRoutes('/adminDashboard')

    expect(screen.getByText('Student Dashboard')).toBeDefined()
    expect(screen.queryByText('Admin Dashboard')).toBeNull()
  })

  it('allows any authenticated role to access shared protected routes without allowedRoles', () => {
    setAccessToken('jwt-lecturer-token')
    setCurrentUser(buildUser('lecturer'))

    renderProtectedRoutes('/profile')

    expect(screen.getByText('Shared Profile Page')).toBeDefined()
  })

  it('restores session via /auth/refresh and /auth/me on reload before rendering', async () => {
    const lecturerUser = buildUser('lecturer')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'refreshed-lecturer-token',
          token_type: 'bearer',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => lecturerUser,
      } as Response)

    const { container } = renderProtectedRoutes('/lecturerDashboard')

    expect(container.querySelector('#protected-route-loading')).not.toBeNull()
    expect(screen.queryByText('Lecturer Dashboard')).toBeNull()

    await waitFor(() => {
      expect(screen.getByText('Lecturer Dashboard')).toBeDefined()
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(getAccessToken()).toBe('refreshed-lecturer-token')
    expect(getCurrentUser()).toEqual(lecturerUser)
  })

  it('redirects unauthenticated users to /login when refresh fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Missing refresh token.' }),
    } as Response)

    renderProtectedRoutes('/dashboard')

    await waitFor(() => {
      expect(screen.getByText('Login Screen')).toBeDefined()
    })
    expect(screen.queryByText('Student Dashboard')).toBeNull()
  })

  it('clears session and returns null when refresh payload is malformed, /auth/me fails, or network throws', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    // Missing access_token in refresh response
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response)
    await expect(restoreAuthSession()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()

    // Token already set, but /auth/me returns 401
    setAccessToken('expired-token')
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid token' }),
    } as Response)
    await expect(restoreAuthSession()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()

    // Network error
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(restoreAuthSession()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()
  })
})

