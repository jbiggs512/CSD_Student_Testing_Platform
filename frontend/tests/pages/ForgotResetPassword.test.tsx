import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/login'

describe('ForgotPasswordPage & ResetPasswordPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('validates email and submits POST /auth/forgot-password', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      }),
    )

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    expect(screen.getByText('Please enter a valid email address.')).toBeDefined()
    expect(fetchSpy).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alice@weston.ac.uk' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'If an account with that email exists, a password reset link has been sent.',
        ),
      ).toBeDefined()
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/auth/forgot-password'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'alice@weston.ac.uk' }),
      }),
    )
    expect(screen.getByRole('link', { name: 'Back to Login' })).toBeDefined()
  })

  it('shows an error when ResetPasswordPage has no token', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByText(
        'This password reset link is missing or invalid. Please request a new one.',
      ),
    ).toBeDefined()
    expect(
      screen.getByRole('link', { name: 'Request New Reset Link' }),
    ).toBeDefined()
  })

  it('validates password inputs, submits POST /auth/reset-password, and handles API errors', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json(
          { detail: 'Invalid or expired password reset token.' },
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ message: 'Password has been reset successfully.' }),
      )

    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token-123']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'short' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))
    expect(
      screen.getByText('Password must be at least 8 characters long.'),
    ).toBeDefined()

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPassword456!' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'Mismatch456!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))
    expect(screen.getByText('Passwords do not match.')).toBeDefined()

    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'NewPassword456!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

    await waitFor(() => {
      expect(
        screen.getByText('Invalid or expired password reset token.'),
      ).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

    await waitFor(() => {
      expect(
        screen.getByText('Password has been reset successfully.'),
      ).toBeDefined()
    })
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.stringContaining('/auth/reset-password'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          token: 'test-token-123',
          new_password: 'NewPassword456!',
        }),
      }),
    )
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeDefined()
  })
})
