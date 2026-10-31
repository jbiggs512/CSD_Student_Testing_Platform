import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/pages/login'
import { clearAccessToken, getAccessToken } from '@shared/api'
import { resolveApiBaseUrl } from '@shared/config'

function renderLoginWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<div>Register Route</div>} />
        <Route path="/forgot-password" element={<div>Forgot Password Route</div>} />
        <Route path="/dashboard" element={<div>Student Dashboard</div>} />
        <Route path="/lecturerDashboard" element={<div>Lecturer Dashboard</div>} />
        <Route path="/adminDashboard" element={<div>Admin Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function buildSuccessResponse(role: 'student' | 'lecturer' | 'admin' = 'student') {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      access_token: `jwt-token-for-${role}`,
      token_type: 'bearer',
      user: {
        user_id: 1,
        username: 'WS123456',
        first_name: 'Test',
        last_name: 'User',
        email: 'test@weston.ac.uk',
        role,
        account_status: 'active',
        registration_date: '2026-10-31',
        last_login: '2026-10-31T14:00:00',
      },
    }),
  } as Response
}

describe('LoginPage', () => {
  beforeEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders wireframe branding, inputs, and navigation links', () => {
    const { container } = renderLoginWithRoutes()

    expect(container.querySelector('#login-page')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Login to Altius' })).toBeDefined()
    expect(screen.getByText('Welcome back!')).toBeDefined()
    expect(screen.getByAltText('Altius')).toBeDefined()
    expect(screen.getByAltText('Trivium')).toBeDefined()

    expect(screen.getByLabelText('Username')).toBeDefined()
    expect(screen.getByLabelText('Password')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDefined()

    const registerLink = screen.getByRole('link', { name: 'Register' })
    expect(registerLink.getAttribute('href')).toBe('/register')

    const forgotLink = screen.getByRole('link', { name: 'Forgot password?' })
    expect(forgotLink.getAttribute('href')).toBe('/forgot-password')
  })

  it('toggles password visibility when the eye button is clicked', () => {
    renderLoginWithRoutes()

    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    const showBtn = screen.getByRole('button', { name: 'Show password' })
    fireEvent.click(showBtn)
    expect(passwordInput.type).toBe('text')

    const hideBtn = screen.getByRole('button', { name: 'Hide password' })
    fireEvent.click(hideBtn)
    expect(passwordInput.type).toBe('password')
  })

  it('validates empty fields before sending a network request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderLoginWithRoutes()

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain(
      'Please enter both your username and password.',
    )
  })

  it('warns the user when an email address is entered as the username', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderLoginWithRoutes()

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'student@weston.ac.uk' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'SecretPass123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain(
      'Please sign in with your username, not your email address.',
    )
  })

  it.each([
    ['student', 'Student Dashboard'],
    ['lecturer', 'Lecturer Dashboard'],
    ['admin', 'Admin Dashboard'],
  ] as const)(
    'authenticates %s users, stores access token, and routes to %s',
    async (role, expectedScreen) => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(buildSuccessResponse(role))

      renderLoginWithRoutes()

      fireEvent.change(screen.getByLabelText('Username'), {
        target: { value: '  WS123456  ' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'SecretPass123!' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(screen.getByText(expectedScreen)).toBeDefined()
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            username: 'WS123456',
            password: 'SecretPass123!',
          }),
        }),
      )
      expect(getAccessToken()).toBe(`jwt-token-for-${role}`)
    },
  )

  it('displays the alert banner on 401 invalid credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid username or password.' }),
    } as Response)

    renderLoginWithRoutes()

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'WS123456' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'WrongPassword' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Incorrect Credentials. Please try again.',
      )
    })
  })

  it('displays account status errors for 403 disabled/pending accounts and handles 500 or network errors', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    renderLoginWithRoutes()

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'WS333333' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'ValidPass123!' },
    })

    // 403 disabled account with JSON detail
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Account has been disabled.' }),
    } as Response)
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Account has been disabled.',
      )
    })

    // 403 without JSON detail
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as Response)
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Your account is not permitted to sign in.',
      )
    })

    // 500 non-JSON response
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Not JSON')
      },
    } as unknown as Response)
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Unable to sign in right now. Please try again.',
      )
    })

    // Network failure
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Unable to connect to the server. Please try again.',
      )
    })
  })

  it('normalizes VITE_API_URL formats cleanly', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('http://localhost:8000/api/v1')
    expect(resolveApiBaseUrl('   ')).toBe('http://localhost:8000/api/v1')
    expect(resolveApiBaseUrl('http://localhost:8000/api/')).toBe(
      'http://localhost:8000/api/v1',
    )
    expect(resolveApiBaseUrl('http://localhost:8000/api/v1/')).toBe(
      'http://localhost:8000/api/v1',
    )
  })
})
