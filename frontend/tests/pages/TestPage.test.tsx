import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TestPage, TestPageContent } from '@/pages/test'
import type { TestDetails } from '@/pages/test/model'
import { API_BASE_URL } from '@/shared/config/env'
import { getTestDetails, TestApiError } from '@/pages/test/api/testApi'

function createTestDetails(): TestDetails {
  return {
    "course": "Introduction to Software",
    "subject": "Basic Computing & Software",
    "testName": "Beginner Software Quiz",
    "description": "A quiz to test your basic knowledge of software and computing.",
    "timed": true,
    "timeLimitMinutes": 600,
    "currentQuestion": 1,
    "questionsPerAttempt": 10,
    "questions": [
      {
        "questionId": 1,
        "questionText": "What does HTML stand for?",
        "options": [
          { "optionId": 1, "optionText": "HyperText Markup Language", "isCorrect": true, "selected": false },
          { "optionId": 2, "optionText": "High Tech Modern Language", "isCorrect": false, "selected": false },
          { "optionId": 3, "optionText": "Hyperlink and Text Markup Language", "isCorrect": false, "selected": false },
          { "optionId": 4, "optionText": "Home Tool Markup Language", "isCorrect": false, "selected": false }
        ]
      },
      {
        "questionId": 2,
        "questionText": "Which of the following is a programming language?",
        "options": [
          { "optionId": 1, "optionText": "Python", "isCorrect": true, "selected": false },
          { "optionId": 2, "optionText": "HTML", "isCorrect": false, "selected": false },
          { "optionId": 3, "optionText": "CSS", "isCorrect": false, "selected": false },
          { "optionId": 4, "optionText": "SQL", "isCorrect": false, "selected": false }
        ]
      },
      {
        "questionId": 3,
        "questionText": "What is the primary function of a web browser?",
        "options": [
          { "optionId": 1, "optionText": "To display web pages", "isCorrect": true, "selected": false },
          { "optionId": 2, "optionText": "To compile code", "isCorrect": false, "selected": false },
          { "optionId": 3, "optionText": "To manage computer hardware", "isCorrect": false, "selected": false },
          { "optionId": 4, "optionText": "To create databases", "isCorrect": false, "selected": false }
        ]
      },
      {
        "questionId": 4,
        "questionText": "Which symbol is commonly used for single-line comments in JavaScript?",
        "options": [
          { "optionId": 1, "optionText": "//", "isCorrect": true, "selected": false },
          { "optionId": 2, "optionText": "#", "isCorrect": false, "selected": false },
          { "optionId": 3, "optionText": "/*", "isCorrect": false, "selected": false },
          { "optionId": 4, "optionText": "<!--", "isCorrect": false, "selected": false }
        ]
      },
      {
        "questionId": 5,
        "questionText": "What does CSS stand for?",
        "options": [
          { "optionId": 1, "optionText": "Cascading Style Sheets", "isCorrect": true, "selected": false },
          { "optionId": 2, "optionText": "Computer Style System", "isCorrect": false, "selected": false },
          { "optionId": 3, "optionText": "Creative Style Sheets", "isCorrect": false, "selected": false },
          { "optionId": 4, "optionText": "Colorful Style Sheets", "isCorrect": false, "selected": false }
        ]
      },
      {
        "questionId": 6,
        "questionText": "Which data structure operates on a Last-In, First-Out (LIFO) basis?",
        "options": [
          { "optionId": 1, "optionText": "Stack", "isCorrect": true, "selected": false },
          { "optionId": 2, "optionText": "Queue", "isCorrect": false, "selected": false },
          { "optionId": 3, "optionText": "Array", "isCorrect": false, "selected": false },
          { "optionId": 4, "optionText": "Linked List", "isCorrect": false, "selected": false }
        ]
      },
      {
        "questionId": 7,
        "questionText": "What is Git primarily used for?",
        "options": [
          { "optionId": 1, "optionText": "Version control", "isCorrect": true, "selected": false },
          { "optionId": 2, "optionText": "Designing user interfaces", "isCorrect": false, "selected": false },
          { "optionId": 3, "optionText": "Database management", "isCorrect": false, "selected": false },
          { "optionId": 4, "optionText": "Network security", "isCorrect": false, "selected": false }
        ]
      },
      {
        "questionId": 8,
        "questionText": "Which of the following is a relational database management system?",
        "options": [
          { "optionId": 1, "optionText": "PostgreSQL", "isCorrect": true, "selected": false },
          { "optionId": 2, "optionText": "MongoDB", "isCorrect": false, "selected": false },
          { "optionId": 3, "optionText": "Redis", "isCorrect": false, "selected": false },
          { "optionId": 4, "optionText": "Cassandra", "isCorrect": false, "selected": false }
        ]
      },
      {
        "questionId": 9,
        "questionText": "What does API stand for?",
        "options": [
          { "optionId": 1, "optionText": "Application Programming Interface", "isCorrect": true, "selected": false },
          { "optionId": 2, "optionText": "Advanced Programming Interaction", "isCorrect": false, "selected": false },
          { "optionId": 3, "optionText": "Automated Program Integration", "isCorrect": false, "selected": false },
          { "optionId": 4, "optionText": "Application Process Integration", "isCorrect": false, "selected": false }
        ]
      },
      {
        "questionId": 10,
        "questionText": "Which file extension is typically used for Python source code files?",
        "options": [
          { "optionId": 1, "optionText": ".py", "isCorrect": true, "selected": false },
          { "optionId": 2, "optionText": ".js", "isCorrect": false, "selected": false },
          { "optionId": 3, "optionText": ".html", "isCorrect": false, "selected": false },
          { "optionId": 4, "optionText": ".java", "isCorrect": false, "selected": false }
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
    </MemoryRouter>,
  )
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
    render(
      <MemoryRouter initialEntries={['/test/1']}>
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

    fireEvent.click(screen.getByRole('button', { name: 'Exit Test' }))
    expect(screen.getByText('Student Dashboard')).toBeDefined()
  })
})

describe('Test data loading', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(cleanup)

  it('shows loading state and requests details for the route test ID', async () => {
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
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('selects only one option and updates the rendered question grid state', async () => {
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

  it('requests and returns test details successfully', async () => {
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
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    )
  })

  it('redirects to the dashboard when the API request fails', async () => {
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
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    await expect(getTestDetails(1)).rejects.toMatchObject({
      name: 'TestApiError',
      message: 'Unable to connect to the server. Please try again.',
      status: 0,
    })
  })

  it('reports unauthorized responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
    } as Response)

    await expect(getTestDetails(1)).rejects.toEqual(
      new TestApiError('Incorrect Credentials. Please try again.', 401),
    )
  })

  it('uses the default forbidden message for missing detail text', async () => {
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

