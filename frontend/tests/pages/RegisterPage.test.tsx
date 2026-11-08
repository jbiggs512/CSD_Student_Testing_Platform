import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAvailableCourses,
  RegisterApiError,
  RegisterPage,
  validateRegistrationInput,
} from '@/pages/register'

const SAMPLE_COURSES = [
  { course_id: 1, course_title: 'BSc Software Engineering' },
  { course_id: 2, course_title: 'BSc Computer Science' },
]

function renderRegisterWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>Login Route</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function buildCoursesResponse(courses = SAMPLE_COURSES) {
  return {
    ok: true,
    status: 200,
    json: async () => courses,
  } as Response
}

function buildRegisterSuccessResponse() {
  return {
    ok: true,
    status: 201,
    json: async () => ({
      user_id: 10,
      username: 'WS123456',
      first_name: 'Alex',
      last_name: 'Student',
      email: 'alex.student@weston.ac.uk',
      role: 'student',
      account_status: 'pending',
      registration_date: '2026-11-08',
      last_login: null,
    }),
  } as Response
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders mockup branding, required fields, approval notice, and Login link', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(buildCoursesResponse())

    const { container } = renderRegisterWithRoutes()

    expect(container.querySelector('#register-page')).not.toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Register to Altius' }),
    ).toBeDefined()
    expect(
      screen.getByText(
        'Accounts will need lecturer approval before becoming active',
      ),
    ).toBeDefined()
    expect(screen.getByText('Have an account? Log in now!')).toBeDefined()

    const loginLink = screen.getByRole('link', { name: 'Login' })
    expect(loginLink.getAttribute('href')).toBe('/login')

    expect(screen.getByLabelText('Student Number')).toBeDefined()
    expect(screen.getByLabelText('First Name')).toBeDefined()
    expect(screen.getByLabelText('Last Name')).toBeDefined()
    expect(screen.getByLabelText('Course')).toBeDefined()
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByLabelText('Password')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Register' })).toBeDefined()

    await waitFor(() => {
      expect(
        (screen.getByLabelText('Course') as HTMLButtonElement).disabled,
      ).toBe(false)
    })
  })

  it('validates empty fields, student number regex, email format, and password complexity', () => {
    expect(
      validateRegistrationInput({
        studentNumber: '',
        firstName: 'Alex',
        lastName: 'Student',
        courseId: '1',
        email: 'alex@weston.ac.uk',
        password: 'Password123!',
      }),
    ).toContain('Incorrect Input, Please try again.')

    expect(
      validateRegistrationInput({
        studentNumber: 'invalid student!',
        firstName: 'Alex',
        lastName: 'Student',
        courseId: '1',
        email: 'alex@weston.ac.uk',
        password: 'Password123!',
      }),
    ).toContain('Student Number must be 3-50 letters or numbers')

    expect(
      validateRegistrationInput({
        studentNumber: 'WS123456',
        firstName: 'Alex',
        lastName: 'Student',
        courseId: '1',
        email: 'invalid-email',
        password: 'Password123!',
      }),
    ).toContain('valid email address')

    expect(
      validateRegistrationInput({
        studentNumber: 'WS123456',
        firstName: 'Alex',
        lastName: 'Student',
        courseId: '1',
        email: 'alex@weston.ac.uk',
        password: 'weakpassword',
      }),
    ).toContain('Password must be at least 8 characters')

    expect(
      validateRegistrationInput({
        studentNumber: 'ws123456',
        firstName: 'Alex',
        lastName: 'Student',
        courseId: '1',
        email: 'alex@weston.ac.uk',
        password: 'Password123!',
      }),
    ).toBeNull()
  })

  it('shows the error banner when submitting invalid inputs without calling POST /user/student', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(buildCoursesResponse())

    renderRegisterWithRoutes()

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert').textContent).toContain(
      'Incorrect Input, Please try again.',
    )
  })

  it('submits student registration with selected course and displays pending approval message', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(buildCoursesResponse())
      .mockResolvedValueOnce(buildRegisterSuccessResponse())

    renderRegisterWithRoutes()

    const courseTrigger = screen.getByLabelText('Course')
    await waitFor(() => {
      expect((courseTrigger as HTMLButtonElement).disabled).toBe(false)
    })

    fireEvent.change(screen.getByLabelText('Student Number'), {
      target: { value: '  WS123456  ' },
    })
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: '  Alex  ' },
    })
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: '  Student  ' },
    })

    fireEvent.click(courseTrigger)
    const option = await screen.findByText('BSc Software Engineering')
    fireEvent.click(option)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: '  alex.student@weston.ac.uk  ' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password123!' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(
        screen.getByText(/Your account is pending lecturer approval/i),
      ).toBeDefined()
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

  it('displays API error messages when registration or course loading fails', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(buildCoursesResponse())
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ detail: 'Username is already in use.' }),
      } as Response)

    renderRegisterWithRoutes()

    const courseTrigger = screen.getByLabelText('Course')
    await waitFor(() => {
      expect((courseTrigger as HTMLButtonElement).disabled).toBe(false)
    })

    fireEvent.change(screen.getByLabelText('Student Number'), {
      target: { value: 'WS123456' },
    })
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Alex' },
    })
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Student' },
    })
    fireEvent.click(courseTrigger)
    fireEvent.click(await screen.findByText('BSc Software Engineering'))
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@weston.ac.uk' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password123!' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Username is already in use.',
      )
    })

    // Non-JSON error body fallback
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Not JSON')
      },
    } as unknown as Response)
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Incorrect Input, Please try again.',
      )
    })

    // Network error on registerStudent
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Unable to connect to the server. Please try again.',
      )
    })
  })

  it('handles course loading API errors cleanly', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)
    await expect(getAvailableCourses()).rejects.toThrow(RegisterApiError)

    fetchSpy.mockRejectedValueOnce(new TypeError('Network down'))
    await expect(getAvailableCourses()).rejects.toThrow(
      'Unable to load courses right now. Please try again.',
    )

    fetchSpy.mockRejectedValueOnce(new Error('Courses failed'))
    renderRegisterWithRoutes()
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Unable to load courses right now. Please try again.',
      )
    })
  })
})
