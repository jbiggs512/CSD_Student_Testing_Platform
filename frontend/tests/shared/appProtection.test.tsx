import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAccessToken,
  createApiClient,
  getAccessToken,
  getCurrentUser,
  refreshAccessToken,
  setAccessToken,
  setCurrentUser,
} from '@/shared/api'
import { AppProtection } from '@/shared/components'

function seedAuthenticatedUser() {
  setAccessToken('active-token')
  setCurrentUser({
    user_id: 1,
    username: 'WS123456',
    first_name: 'Test',
    last_name: 'Student',
    email: 'student@weston.ac.uk',
    role: 'student',
    account_status: 'active',
    registration_date: '2026-10-31',
    last_login: null,
  })
}

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Unexpected render failure')
  }
  return <div>Dashboard Content</div>
}

function renderWithProtection(shouldThrow = false) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AppProtection>
        <Routes>
          <Route
            path="/dashboard"
            element={<ThrowingChild shouldThrow={shouldThrow} />}
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </AppProtection>
    </MemoryRouter>,
  )
}

describe('AppProtection', () => {
  beforeEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders child routes normally when there are no errors', () => {
    renderWithProtection()
    expect(screen.getByText('Dashboard Content')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders the shared ErrorPage with Return to Login on 403 Account has been disabled', async () => {
    seedAuthenticatedUser()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Account has been disabled.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    renderWithProtection()

    const request = createApiClient({ basePath: '/student' })
    await expect(request('/dashboard')).rejects.toThrow('Account has been disabled.')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Error 403')
    expect(alert.textContent).toContain('Account Disabled')
    expect(alert.textContent).toContain('Account has been disabled.')
    expect(screen.queryByText('Dashboard Content')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Return to Login' }))

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeTruthy()
    })
    expect(getAccessToken()).toBeNull()
    expect(getCurrentUser()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not trigger for other 403 permission errors', async () => {
    seedAuthenticatedUser()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: 'You do not have permission to perform this action.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    renderWithProtection()

    const request = createApiClient({ basePath: '/student' })
    await expect(request('/dashboard')).rejects.toThrow(
      'You do not have permission to perform this action.',
    )

    expect(screen.getByText('Dashboard Content')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders the shared ErrorPage when token refresh returns 403 Account has been disabled', async () => {
    seedAuthenticatedUser()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Account has been disabled.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    renderWithProtection()

    const token = await refreshAccessToken()
    expect(token).toBeNull()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Account Disabled')
  })

  it('catches unexpected React rendering errors via ErrorBoundary and allows returning to login', async () => {
    seedAuthenticatedUser()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    renderWithProtection(true)

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Error 500')
    expect(alert.textContent).toContain('Something Went Wrong')

    fireEvent.click(screen.getByRole('button', { name: 'Return to Login' }))

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeTruthy()
    })
    expect(getAccessToken()).toBeNull()
  })
})
