import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/App'
import { LandingPage } from '@/pages/landing'
import { LoginPage } from '@/pages/login'
import { RegisterPage } from '@/pages/register'
import { apiClient } from '@shared/api'
import { ENV } from '@shared/config'

describe('Frontend pages and App shell', () => {
  it('renders App shell', () => {
    const { container } = render(<App />)
    expect(container.querySelector('#app-shell')).not.toBeNull()
  })

  it('renders LandingPage, LoginPage, and RegisterPage', () => {
    const landing = render(<LandingPage />)
    expect(landing.getByText('Landing Page')).toBeDefined()

    const login = render(<LoginPage />)
    expect(login.getByText('Login Page')).toBeDefined()

    const register = render(<RegisterPage />)
    expect(register.getByText('Register Page')).toBeDefined()
  })
})

describe('apiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches JSON data from the configured API URL', async () => {
    const mockData = { status: 'ok' }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response)

    const result = await apiClient<{ status: string }>('/health', {
      headers: { Authorization: 'Bearer token' },
    })

    expect(result).toEqual(mockData)
    expect(fetchSpy).toHaveBeenCalledWith(`${ENV.API_URL}/health`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
    })
  })

  it('throws an error when response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response)

    await expect(apiClient('/protected')).rejects.toThrow(
      'API error: 401 Unauthorized',
    )
  })
})

