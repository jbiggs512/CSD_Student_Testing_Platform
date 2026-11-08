import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TestPage, TestPageContent } from '@/pages/test'
import type { TestDetails } from '@/pages/test/model'
import { API_BASE_URL } from '@/shared/config/env'
import { createTestAttempt, getTestDetails, TestApiError } from '@/pages/test/api/testApi'
import { clearAccessToken, setAccessToken } from '@/shared/api'
import { Toaster } from '@/shared/components'

function createTestDetails(): TestDetails {
  return {
    "course": "Introduction to Software",
    "subject": "Basic Computing & Software",
    "test_name": "Beginner Software Quiz",
    "description": "A quiz to test your basic knowledge of software and computing.",
    "timed": true,
    "time_limit_minutes": 600,
    "current_question": 1,
    "questions_per_attempt": 10,
    "questions": [
      {
        "question_id": 1,
        "question_text": "What does HTML stand for?",
        "options": [
          { "option_id": 1, "option_text": "HyperText Markup Language", "is_correct": true, "selected": false },
          { "option_id": 2, "option_text": "High Tech Modern Language", "is_correct": false, "selected": false },
          { "option_id": 3, "option_text": "Hyperlink and Text Markup Language", "is_correct": false, "selected": false },
          { "option_id": 4, "option_text": "Home Tool Markup Language", "is_correct": false, "selected": false }
        ]
      },
      {
        "question_id": 2,
        "question_text": "Which of the following is a programming language?",
        "options": [
          { "option_id": 1, "option_text": "Python", "is_correct": true, "selected": false },
          { "option_id": 2, "option_text": "HTML", "is_correct": false, "selected": false },
          { "option_id": 3, "option_text": "CSS", "is_correct": false, "selected": false },
          { "option_id": 4, "option_text": "SQL", "is_correct": false, "selected": false }
        ]
      },
      {
        "question_id": 3,
        "question_text": "What is the primary function of a web browser?",
        "options": [
          { "option_id": 1, "option_text": "To display web pages", "is_correct": true, "selected": false },
          { "option_id": 2, "option_text": "To compile code", "is_correct": false, "selected": false },
          { "option_id": 3, "option_text": "To manage computer hardware", "is_correct": false, "selected": false },
          { "option_id": 4, "option_text": "To create databases", "is_correct": false, "selected": false }
        ]
      },
      {
        "question_id": 4,
        "question_text": "Which symbol is commonly used for single-line comments in JavaScript?",
        "options": [
          { "option_id": 1, "option_text": "//", "is_correct": true, "selected": false },
          { "option_id": 2, "option_text": "#", "is_correct": false, "selected": false },
          { "option_id": 3, "option_text": "/*", "is_correct": false, "selected": false },
          { "option_id": 4, "option_text": "<!--", "is_correct": false, "selected": false }
        ]
      },
      {
        "question_id": 5,
        "question_text": "What does CSS stand for?",
        "options": [
          { "option_id": 1, "option_text": "Cascading Style Sheets", "is_correct": true, "selected": false },
          { "option_id": 2, "option_text": "Computer Style System", "is_correct": false, "selected": false },
          { "option_id": 3, "option_text": "Creative Style Sheets", "is_correct": false, "selected": false },
          { "option_id": 4, "option_text": "Colorful Style Sheets", "is_correct": false, "selected": false }
        ]
      },
      {
        "question_id": 6,
        "question_text": "Which data structure operates on a Last-In, First-Out (LIFO) basis?",
        "options": [
          { "option_id": 1, "option_text": "Stack", "is_correct": true, "selected": false },
          { "option_id": 2, "option_text": "Queue", "is_correct": false, "selected": false },
          { "option_id": 3, "option_text": "Array", "is_correct": false, "selected": false },
          { "option_id": 4, "option_text": "Linked List", "is_correct": false, "selected": false }
        ]
      },
      {
        "question_id": 7,
        "question_text": "What is Git primarily used for?",
        "options": [
          { "option_id": 1, "option_text": "Version control", "is_correct": true, "selected": false },
          { "option_id": 2, "option_text": "Designing user interfaces", "is_correct": false, "selected": false },
          { "option_id": 3, "option_text": "Database management", "is_correct": false, "selected": false },
          { "option_id": 4, "option_text": "Network security", "is_correct": false, "selected": false }
        ]
      },
      {
        "question_id": 8,
        "question_text": "Which of the following is a relational database management system?",
        "options": [
          { "option_id": 1, "option_text": "PostgreSQL", "is_correct": true, "selected": false },
          { "option_id": 2, "option_text": "MongoDB", "is_correct": false, "selected": false },
          { "option_id": 3, "option_text": "Redis", "is_correct": false, "selected": false },
          { "option_id": 4, "option_text": "Cassandra", "is_correct": false, "selected": false }
        ]
      },
      {
        "question_id": 9,
        "question_text": "What does API stand for?",
        "options": [
          { "option_id": 1, "option_text": "Application Programming Interface", "is_correct": true, "selected": false },
          { "option_id": 2, "option_text": "Advanced Programming Interaction", "is_correct": false, "selected": false },
          { "option_id": 3, "option_text": "Automated Program Integration", "is_correct": false, "selected": false },
          { "option_id": 4, "option_text": "Application Process Integration", "is_correct": false, "selected": false }
        ]
      },
      {
        "question_id": 10,
        "question_text": "Which file extension is typically used for Python source code files?",
        "options": [
          { "option_id": 1, "option_text": ".py", "is_correct": true, "selected": false },
          { "option_id": 2, "option_text": ".js", "is_correct": false, "selected": false },
          { "option_id": 3, "option_text": ".html", "is_correct": false, "selected": false },
          { "option_id": 4, "option_text": ".java", "is_correct": false, "selected": false }
        ]
      }
    ]
  }
}

function renderTestContent(
  testDetails = createTestDetails()
) {
  const props = {
    testDetails,
    onSelectOption: vi.fn(),
    onNavigateQuestion: vi.fn(),
    isAnswered: vi.fn((questionNumber: number) => {
      const question = testDetails.questions[questionNumber - 1]
      return question?.options.some((option) => option.selected) ?? false
    }),
  }
  return {
    ...render(
      <MemoryRouter>
        <TestPageContent {...props} />
      </MemoryRouter>,
    ), props
  }
}

function renderTestWithRoutes(initialEntry = '/test/1') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/test/:id" element={<TestPage />} />
        <Route path="/dashboard" element={<div>Student Dashboard</div>} />
      </Routes>
      <Toaster />
    </MemoryRouter>,
  )
}

function renderDashboardNav(initialEntry = '/test/1') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/test/:id" element={<TestPageContent
          testDetails={createTestDetails()}
          onSelectOption={vi.fn()}
          onNavigateQuestion={vi.fn()}
          isAnswered={vi.fn(() => false)}
        />} />
        <Route path="/dashboard" element={<div>Student Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

// Helper function for POST requests
function mockFetchResponses({ postOk = true, postStatus = 200, postData = {} } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
    if (init?.method === 'POST') {
      return {
        ok: postOk,
        status: postStatus,
        json: async () => postData,
      } as Response;
    }

    return {
      ok: true,
      status: 200,
      json: async () => createTestDetails(),
    } as Response;
  });
}

describe('Test Page Content', () => {
  afterEach(cleanup)

  it('renders test metadata, progress, question, and option text', () => {
    renderTestContent()

    expect(screen.getByText('Introduction to Software - Basic Computing & Software')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Beginner Software Quiz' })).toBeDefined()
    expect(screen.getByText('Question 1 of 10')).toBeDefined()
    expect(screen.getByRole('heading', {
      name: 'What does HTML stand for?',
    })).toBeDefined()
    expect(screen.getByText('HyperText Markup Language')).toBeDefined()
    expect(screen.getByText('High Tech Modern Language')).toBeDefined()
    expect(screen.getByText('Hyperlink and Text Markup Language')).toBeDefined()
    expect(screen.getByText('Home Tool Markup Language')).toBeDefined()
    expect((screen.getByRole('button', { name: 'Previous Question' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Next Question' }) as HTMLButtonElement).disabled).toBe(false)
  })


  it('reports option and question navigation selections to callbacks', () => {
    const { props } = renderTestContent()

    fireEvent.click(screen.getByText('HyperText Markup Language'))
    expect(props.onSelectOption).toHaveBeenCalledWith(1, 1)

    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }))
    expect(props.onNavigateQuestion).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByText('1'))
    expect(props.onNavigateQuestion).toHaveBeenCalledWith(1)
  })

  it('navigates to the dashboard when Exit Test is clicked', () => {
    renderDashboardNav()

    fireEvent.click(screen.getByTestId('exit-test'))
    fireEvent.click(screen.getByTestId('continue-exit-test'))
    expect(screen.getByText('Student Dashboard')).toBeDefined()
  })

  it('calls onSubmit when submission is confirmed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <TestPageContent
          testDetails={createTestDetails()}
          onSelectOption={vi.fn()}
          onNavigateQuestion={vi.fn()}
          isAnswered={vi.fn(() => false)}
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByTestId('submit-test'))
    fireEvent.click(screen.getByTestId('continue-submit-test'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
  })

})

describe('Test data API client', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
    cleanup()
  })


  it('shows loading state and requests details for the route test ID', async () => {
    setAccessToken('test-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => createTestDetails(),
    } as Response)

    renderTestWithRoutes('/test/1')
    expect(screen.getByText('Loading test...')).toBeDefined()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Beginner Software Quiz' })).toBeDefined()
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/test/1'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  })

  it('selects only one option and updates the rendered question grid state', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => createTestDetails(),
    } as Response)

    renderTestWithRoutes()
    await screen.findByText('HyperText Markup Language')

    fireEvent.click(screen.getByText('High Tech Modern Language'))
    expect(screen.getByText('High Tech Modern Language').closest('.border-navy')).not.toBeNull()

    fireEvent.click(screen.getByText('HyperText Markup Language'))
    expect(screen.getByText('HyperText Markup Language').closest('.border-navy')).not.toBeNull()
    expect(screen.getByText('High Tech Modern Language').closest('.border-navy')).toBeNull()
  })

  it('navigates between questions and respects the previous/next boundaries', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => createTestDetails(),
    } as Response)

    renderTestWithRoutes()
    await screen.findByText('Question 1 of 10')

    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }))
    expect(screen.getByText('Question 2 of 10')).toBeDefined()
    expect(screen.getByText('Which of the following is a programming language?')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Previous Question' }))
    expect(screen.getByText('Question 1 of 10')).toBeDefined()
    expect((screen.getByRole('button', { name: 'Previous Question' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByText('2'))
    expect(screen.getByText('Question 2 of 10')).toBeDefined()
  })

  it('submits the selected answers and navigates to the dashboard', async () => {
    setAccessToken('test-token')
    const fetchSpy = mockFetchResponses({
      postData: {
        attempt_id: 42,
        test_id: 1,
        started_at: '2026-11-08T00:00:00.000Z',
        completed_at: '2026-11-08T00:01:00.000Z',
        score: 30,
        total_questions: 10,
      }
    })

    renderTestWithRoutes()
    await screen.findByRole('heading', { name: 'Beginner Software Quiz' })

    fireEvent.click(screen.getByText('HyperText Markup Language'))
    fireEvent.click(screen.getByTestId('submit-test'))
    fireEvent.click(screen.getByTestId('continue-submit-test'))

    await waitFor(() => {
      expect(screen.getByText('Student Dashboard')).toBeDefined()
      expect(screen.getByText('Test results saved!')).toBeDefined()
      expect(screen.getByText('You achieved 30 points')).toBeDefined()
    })

    const postCall = fetchSpy.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(postCall?.[0]).toEqual(expect.stringContaining('/test/attempt'))
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      test_id: 1,
      score: 30,
      total_questions: 10,
    })
  })

  it('shows a submission error without leaving the test page', async () => {
    setAccessToken('test-token')
    mockFetchResponses({
    postOk: false,
    postStatus: 500,
    postData: { detail: 'Submission failed' },
  });
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    renderTestWithRoutes()
    await screen.findByRole('heading', { name: 'Beginner Software Quiz' })

    fireEvent.click(screen.getByTestId('submit-test'))
    fireEvent.click(screen.getByTestId('continue-submit-test'))

    await waitFor(() => {
      expect(screen.getByText('Submission failed')).toBeDefined()
    })
    expect(screen.queryByText('Student Dashboard')).toBeNull()
  })

  it('requests and returns test details successfully', async () => {
    setAccessToken('test-token')
    const details = createTestDetails()

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => details,
    } as Response)

    await expect(getTestDetails(10)).resolves.toEqual(details)
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_BASE_URL}/test/10`,
      {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      }
    );
  })

  it('posts test attempt details successfully', async () => {
    setAccessToken('test-token')
    const request = {
      test_id: 1,
      started_at: '2026-11-08T00:00:00.000Z',
      completed_at: '2026-11-08T00:01:00.000Z',
      score: 30,
      total_questions: 10,
      correct_questions: 1
    }
    const response = {
      attempt_id: 42,
      ...request,
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => response,
    } as Response)

    await expect(createTestAttempt(request)).resolves.toEqual(response)
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_BASE_URL}/test/attempt`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(request),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('redirects to the dashboard when the API request fails', async () => {
    setAccessToken('test-token')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Server error' }),
    } as Response)

    renderTestWithRoutes()

    await waitFor(() => {
      expect(screen.getByText('Student Dashboard')).toBeDefined()
    })
  })

  it('reports connection failures with a zero status', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    await expect(getTestDetails(1)).rejects.toMatchObject({
      name: 'TestApiError',
      message: 'Unable to connect to the server. Please try again.',
      status: 0,
    })
  })

  it('reports unauthorized responses', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
    } as Response)

    await expect(getTestDetails(1)).rejects.toEqual(
      new TestApiError('Incorrect Credentials. Please try again.', 401),
    )
  })

  it('uses the default forbidden message for missing detail text', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ detail: ' ' }),
    } as Response)

    await expect(getTestDetails(1)).rejects.toEqual(
      new TestApiError(
        'Your account is not permitted to access this resource.',
        403,
      ),
    )
  })

  it('uses the server detail message for other error responses', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: ' ' }),
    } as Response)

    await expect(getTestDetails(1)).rejects.toEqual(
      new TestApiError(
        'Unable to access the requested resource right now. Please try again.',
        500,
      ),
    )
  })
})
