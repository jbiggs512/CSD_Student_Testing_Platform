import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@shared/api'
import { LecturerDashboardPage } from '@/pages/lecturerDashboard'
import {
  createTest,
  getSubjects,
  TestManagementApiError,
} from '@/pages/tests/api'
import { TestManagementPage } from '@/pages/tests'

const activeSubject = {
  subject_id: 1,
  subject_name: 'Object Oriented Programming',
  course_id: 1,
  course_title: 'BSc Software Engineering',
  status: 'active' as const,
}

const createdTest = {
  test_id: 10,
  test_name: 'Midterm OOP Exam',
  description: 'Covers classes and polymorphism.',
  subject_id: 1,
  subject_name: 'Object Oriented Programming',
  course_title: 'BSc Software Engineering',
  time_limit_minutes: 45,
  questions_per_attempt: 10,
  pool_size: 25,
}

describe('LecturerDashboardPage & TestManagementPage', () => {
  beforeEach(() => {
    clearAccessToken()
    setAccessToken('lecturer-jwt-token')
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    clearAccessToken()
  })

  it('links to /tests from the LecturerDashboardPage', () => {
    render(
      <MemoryRouter>
        <LecturerDashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Test management')).toBeDefined()
    const manageTestsLink = screen.getByRole('link', { name: /manage tests/i })
    expect(manageTestsLink.getAttribute('href')).toBe('/tests')
  })

  it('loads active subjects and creates a new test via POST /test', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json([activeSubject]))
      .mockResolvedValueOnce(Response.json(createdTest, { status: 201 }))

    render(<TestManagementPage />)

    const subjectTrigger = screen.getByLabelText('Subject') as HTMLButtonElement
    await waitFor(() => expect(subjectTrigger.disabled).toBe(false))

    fireEvent.change(screen.getByLabelText('Test Name'), {
      target: { value: 'Midterm OOP Exam' },
    })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Covers classes and polymorphism.' },
    })
    fireEvent.change(screen.getByLabelText('Time Limit (mins)'), {
      target: { value: '45' },
    })

    fireEvent.click(subjectTrigger)
    fireEvent.click(
      await screen.findByText(
        'Object Oriented Programming (BSc Software Engineering)',
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(
        screen.getByText('Created test "Midterm OOP Exam".'),
      ).toBeDefined()
    })

    expect(screen.getByText('Midterm OOP Exam')).toBeDefined()
    expect(screen.getByText('45 mins')).toBeDefined()
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('validates form inputs and surfaces API errors on TestManagementPage', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json([activeSubject]))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: 'A test with this name already exists for this subject.',
          }),
          { status: 400 },
        ),
      )

    render(<TestManagementPage />)

    const subjectTrigger = screen.getByLabelText('Subject') as HTMLButtonElement
    await waitFor(() => expect(subjectTrigger.disabled).toBe(false))

    fireEvent.change(screen.getByLabelText('Test Name'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText('Test name is required.')).toBeDefined()

    fireEvent.change(screen.getByLabelText('Test Name'), {
      target: { value: 'Midterm OOP Exam' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText('Please select a subject.')).toBeDefined()

    fireEvent.click(subjectTrigger)
    fireEvent.click(
      await screen.findByText(
        'Object Oriented Programming (BSc Software Engineering)',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'A test with this name already exists for this subject.',
        ),
      ).toBeDefined()
    })
  })

  it('testManagementApi handles unauthenticated and network errors', async () => {
    clearAccessToken()
    await expect(getSubjects()).rejects.toEqual(
      new TestManagementApiError(
        'Your session has expired. Please sign in again.',
        401,
      ),
    )

    setAccessToken('lecturer-jwt-token')
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new TypeError('Failed to fetch'),
    )
    await expect(
      createTest({ subject_id: 1, test_name: 'Quiz' }),
    ).rejects.toEqual(
      new TestManagementApiError(
        'Unable to connect to the server. Please try again.',
        0,
      ),
    )
  })
})
