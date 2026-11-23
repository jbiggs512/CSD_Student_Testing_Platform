import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@shared/api'
import { LecturerDashboardPage } from '@/pages/lecturerDashboard'
import {
  createTest,
  deleteTest,
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
  attempt_count: 2,
  attempted_student_count: 2,
  average_percentage: 75,
}

const initialStats = {
  student_total: 24,
  student_average_last_7_days: 78.4,
  weakest_test_last_7_days: 'Midterm OOP Exam',
}

const sampleResultsDetail = {
  test_id: 10,
  test_name: 'Midterm OOP Exam',
  subject_name: 'Object Oriented Programming',
  course_title: 'BSc Software Engineering',
  attempt_count: 1,
  average_percentage: 80,
  highest_score: 220,
  lowest_score: 220,
  attempts: [
    {
      attempt_id: 501,
      user_id: 7,
      username: 'WS100007',
      student_name: 'Alice Student',
      score: 220,
      correct_questions: 8,
      total_questions: 10,
      percentage: 80,
      completed_at: '2026-11-16T12:00:00Z',
    },
  ],
}

function mockDashboardFetch({
  tests = [] as (typeof createdTest)[],
  postResponse,
}: {
  tests?: (typeof createdTest)[]
  postResponse?: Response
} = {}) {
  let currentTests = [...tests]

  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/subject')) {
        return Response.json([activeSubject])
      }
      if (url.endsWith('/test/stats')) {
        return Response.json(initialStats)
      }
      if (url.endsWith('/test/10/results')) {
        return Response.json(sampleResultsDetail)
      }
      const deleteMatch = /\/test\/(\d+)$/.exec(url)
      if (deleteMatch && init?.method === 'DELETE') {
        const deletedId = Number(deleteMatch[1])
        currentTests = currentTests.filter((item) => item.test_id !== deletedId)
        return new Response(null, { status: 204 })
      }
      if (url.endsWith('/test') && init?.method === 'POST') {
        if (postResponse) {
          return postResponse
        }
        currentTests = [createdTest, ...currentTests]
        return Response.json(createdTest, { status: 201 })
      }
      if (url.endsWith('/test')) {
        return Response.json(currentTests)
      }
      return Response.json({}, { status: 404 })
    })
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

  it('loads active subjects, hero stats, and creates a new test via POST /test', async () => {
    const fetchSpy = mockDashboardFetch()

    render(<TestManagementPage />)

    await waitFor(() => expect(screen.getByText('24')).toBeDefined())
    expect(screen.getByText('78%')).toBeDefined()
    expect(screen.getByText('Midterm OOP Exam')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /create new test/i }))

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

    expect(screen.getByText('45 mins')).toBeDefined()
    expect(screen.getByRole('button', { name: 'View Results' })).toBeDefined()
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('opens the TestResultsDialog when View Results is clicked and shows student scores', async () => {
    mockDashboardFetch({ tests: [createdTest] })

    render(<TestManagementPage />)

    const viewResultsButton = await screen.findByRole('button', {
      name: 'View Results',
    })
    fireEvent.click(viewResultsButton)

    await waitFor(() => {
      expect(screen.getByText('Alice Student')).toBeDefined()
    })

    expect(screen.getByText('WS100007')).toBeDefined()
    expect(screen.getAllByText('80%').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('8 / 10')).toBeDefined()
    expect(screen.getAllByText('220 pts').length).toBeGreaterThanOrEqual(2)
  })

  it('opens delete confirmation showing student attempt count and deletes test on confirm', async () => {
    const fetchSpy = mockDashboardFetch({ tests: [createdTest] })

    render(<TestManagementPage />)

    const deleteIconBtn = await screen.findByRole('button', {
      name: 'Delete Midterm OOP Exam',
    })
    fireEvent.click(deleteIconBtn)

    expect(
      screen.getByText('Are you sure you want to delete this test?'),
    ).toBeDefined()
    expect(
      screen.getByText(/2 students have attempted this test\./),
    ).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(
      screen.queryByText('Are you sure you want to delete this test?'),
    ).toBeNull()
    expect(
      fetchSpy.mock.calls.some(([, init]) => init?.method === 'DELETE'),
    ).toBe(false)

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Midterm OOP Exam' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(
        screen.getByText('Deleted test "Midterm OOP Exam".'),
      ).toBeDefined()
    })

    expect(
      fetchSpy.mock.calls.some(
        ([url, init]) =>
          String(url).endsWith('/test/10') && init?.method === 'DELETE',
      ),
    ).toBe(true)
    expect(screen.getByText('No tests available yet')).toBeDefined()
  })

  it('displays singular and zero student attempt counts in the delete confirmation dialog', async () => {
    const oneStudentTest = {
      ...createdTest,
      test_id: 11,
      test_name: 'Quiz One',
      attempt_count: 1,
      attempted_student_count: 1,
    }
    const zeroStudentTest = {
      ...createdTest,
      test_id: 12,
      test_name: 'Quiz Zero',
      attempt_count: 0,
      attempted_student_count: 0,
    }
    mockDashboardFetch({ tests: [oneStudentTest, zeroStudentTest] })

    render(<TestManagementPage />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete Quiz One' }),
    )
    expect(
      screen.getByText(/1 student has attempted this test\./),
    ).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    fireEvent.click(screen.getByRole('button', { name: 'Delete Quiz Zero' }))
    expect(
      screen.getByText(/0 students have attempted this test\./),
    ).toBeDefined()
  })

  it('validates form inputs and surfaces API errors on TestManagementPage', async () => {
    mockDashboardFetch({
      postResponse: new Response(
        JSON.stringify({
          detail: 'A test with this name already exists for this subject.',
        }),
        { status: 400 },
      ),
    })

    render(<TestManagementPage />)

    fireEvent.click(screen.getByRole('button', { name: /create new test/i }))

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
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(deleteTest(10)).resolves.toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/test/10'),
      expect.objectContaining({ method: 'DELETE' }),
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
