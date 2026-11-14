import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAvailableCourses,
  RegisterApiError,
  RegisterPage,
  validateRegistrationInput,
  type RegistrationFormInput,
} from '@/pages/register'

const SAMPLE_COURSES = [
  { course_id: 1, course_title: 'BSc Software Engineering' },
  { course_id: 2, course_title: 'BSc Computer Science' },
]

const VALID_FORM_INPUT: RegistrationFormInput = {
  studentNumber: 'WS123456',
  firstName: 'Alex',
  lastName: 'Student',
  courseId: '1',
  email: 'alex.student@weston.ac.uk',
  password: 'Password123!',
}

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>Login Route</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function jsonResponse(body: unknown, status = 200, ok = status < 400): Response {
  return { ok, status, json: async () => body } as Response
}

async function fillAndSubmitForm(overrides: Partial<RegistrationFormInput> = {}) {
  const values = { ...VALID_FORM_INPUT, ...overrides }
  const courseTrigger = screen.getByLabelText('Course') as HTMLButtonElement

  await waitFor(() => expect(courseTrigger.disabled).toBe(false))

  fireEvent.change(screen.getByLabelText('Student Number'), {
    target: { value: values.studentNumber },
  })
  fireEvent.change(screen.getByLabelText('First Name'), {
    target: { value: values.firstName },
  })
  fireEvent.change(screen.getByLabelText('Last Name'), {
    target: { value: values.lastName },
  })

  fireEvent.click(courseTrigger)
  fireEvent.click(await screen.findByText('BSc Software Engineering'))

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: values.email },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: values.password },
  })

  fireEvent.click(screen.getByRole('button', { name: 'Register' }))
}

describe('RegisterPage', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => cleanup())

  it('renders registration fields, approval subtitle, and Login link', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse(SAMPLE_COURSES))

    const { container } = renderRegisterPage()

    expect(container.querySelector('#register-page')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Register to Altius' })).toBeDefined()
    expect(
      screen.getByText('Accounts will need lecturer approval before becoming active'),
    ).toBeDefined()
    expect(screen.getByRole('link', { name: 'Login' }).getAttribute('href')).toBe('/login')

    for (const label of [
      'Student Number',
      'First Name',
      'Last Name',
      'Course',
      'Email',
      'Password',
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it.each([
    [{ studentNumber: '' }, 'All fields are required'],
    [{ studentNumber: 'bad id!' }, 'Student Number must be 3-50 letters or numbers'],
    [{ email: 'invalid-email' }, 'valid email address'],
    [{ password: 'weakpassword' }, 'Password must be at least 8 characters'],
  ] as const)('validates invalid input %o', (override, expectedMessage) => {
    expect(validateRegistrationInput({ ...VALID_FORM_INPUT, ...override })).toContain(
      expectedMessage,
    )
  })

  it('accepts valid registration input and blocks invalid form submission', () => {
    expect(validateRegistrationInput(VALID_FORM_INPUT)).toBeNull()

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(SAMPLE_COURSES))

    renderRegisterPage()
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert').textContent).toContain(
      'Incorrect Input, Please try again.',
    )
  })

  it('submits trimmed registration payload and shows pending approval alert', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(SAMPLE_COURSES))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            user_id: 10,
            username: 'WS123456',
            first_name: 'Alex',
            last_name: 'Student',
            email: 'alex.student@weston.ac.uk',
            role: 'student',
            account_status: 'pending',
            registration_date: '2026-11-08',
            last_login: null,
          },
          201,
        ),
      )

    renderRegisterPage()
    await fillAndSubmitForm({
      studentNumber: '  WS123456  ',
      firstName: '  Alex  ',
      lastName: '  Student  ',
      email: '  alex.student@weston.ac.uk  ',
    })

    await waitFor(() => {
      expect(screen.getByText(/Your account is pending lecturer approval/i)).toBeDefined()
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/user/student'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          username: 'WS123456',
          first_name: 'Alex',
          last_name: 'Student',
          email: 'alex.student@weston.ac.uk',
          password: 'Password123!',
          courses: [1],
        }),
      }),
    )
  })

  it('handles registration and course loading errors cleanly', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(SAMPLE_COURSES))
      .mockResolvedValueOnce(
        jsonResponse({ detail: 'Username is already in use.' }, 409, false),
      )

    renderRegisterPage()
    await fillAndSubmitForm()

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Username is already in use.',
      )
    })

    // Non-JSON 500 error fallback
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    } as unknown as Response)
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Incorrect Input, Please try again.',
      )
    })

    // Network failure
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Unable to connect to the server. Please try again.',
      )
    })

    // Course API error paths
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, 500, false))
    await expect(getAvailableCourses()).rejects.toThrow(RegisterApiError)

    fetchSpy.mockRejectedValueOnce(new TypeError('Network down'))
    await expect(getAvailableCourses()).rejects.toThrow(
      'Unable to load courses right now. Please try again.',
    )
  })
})
