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
import { AccountDisabledDialog } from '@/shared/components'

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

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard Content</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
      <AccountDisabledDialog />
    </MemoryRouter>,
  )
}

describe('AccountDisabledDialog', () => {
  beforeEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('stays hidden until an API call reports the account is disabled', () => {
    renderWithRoutes()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('shows an error dialog with a Return to Login button on 403 Account has been disabled', async () => {
    seedAuthenticatedUser()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Account has been disabled.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    renderWithRoutes()

    const request = createApiClient({ basePath: '/student' })
    await expect(request('/dashboard')).rejects.toThrow('Account has been disabled.')

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('Account Disabled')
    expect(dialog.textContent).toContain('Account has been disabled.')

    const returnButton = screen.getByRole('button', { name: 'Return to Login' })
    fireEvent.click(returnButton)

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeTruthy()
    })
    expect(getAccessToken()).toBeNull()
    expect(getCurrentUser()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not open for other 403 permission errors', async () => {
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

    renderWithRoutes()

    const request = createApiClient({ basePath: '/student' })
    await expect(request('/dashboard')).rejects.toThrow(
      'You do not have permission to perform this action.',
    )

    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('opens when token refresh returns 403 Account has been disabled', async () => {
    seedAuthenticatedUser()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Account has been disabled.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    renderWithRoutes()

    const token = await refreshAccessToken()
    expect(token).toBeNull()

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('Account has been disabled.')
  })
})
