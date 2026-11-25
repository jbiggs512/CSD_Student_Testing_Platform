import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TestPage, TestPageContent } from '@/pages/test'
import { useServerTimer } from '@/pages/test/model'
import {  clearAccessToken, setAccessToken } from '@/shared/api'
import { Toaster } from '@/shared/components'

const mockTestDetails = {
  test_id: 1,
  course: "Introduction to Software",
  subject: "Basic Computing & Software",
  test_name: "Beginner Software Quiz",
  description: "A quiz to test your basic knowledge of software and computing.",
  timed: true,
  time_limit_minutes: 600,
  current_question: 1,
  questions_per_attempt: 10,
  questions: [
    {
      "question_id": 1,
      "question_text": "What does HTML stand for?",
      "options": [
        { "option_id": 1, "option_text": "HyperText Markup Language", "selected": false },
        { "option_id": 2, "option_text": "High Tech Modern Language", "selected": false },
        { "option_id": 3, "option_text": "Hyperlink and Text Markup Language", "selected": false },
        { "option_id": 4, "option_text": "Home Tool Markup Language", "selected": false }
      ]
    },
    {
      "question_id": 2,
      "question_text": "Which of the following is a programming language?",
      "options": [
        { "option_id": 1, "option_text": "Python", "selected": false },
        { "option_id": 2, "option_text": "HTML", "selected": false },
        { "option_id": 3, "option_text": "CSS", "selected": false },
        { "option_id": 4, "option_text": "SQL", "selected": false }
      ]
    },
    {
      "question_id": 3,
      "question_text": "What is the primary function of a web browser?",
      "options": [
        { "option_id": 1, "option_text": "To display web pages", "selected": false },
        { "option_id": 2, "option_text": "To compile code", "selected": false },
        { "option_id": 3, "option_text": "To manage computer hardware", "selected": false },
        { "option_id": 4, "option_text": "To create databases", "selected": false }
      ]
    },
    {
      "question_id": 4,
      "question_text": "Which symbol is commonly used for single-line comments in JavaScript?",
      "options": [
        { "option_id": 1, "option_text": "//", "selected": false },
        { "option_id": 2, "option_text": "#", "selected": false },
        { "option_id": 3, "option_text": "/*", "selected": false },
        { "option_id": 4, "option_text": "<!--", "selected": false }
      ]
    },
    {
      "question_id": 5,
      "question_text": "What does CSS stand for?",
      "options": [
        { "option_id": 1, "option_text": "Cascading Style Sheets", "selected": false },
        { "option_id": 2, "option_text": "Computer Style System", "selected": false },
        { "option_id": 3, "option_text": "Creative Style Sheets", "selected": false },
        { "option_id": 4, "option_text": "Colorful Style Sheets", "selected": false }
      ]
    },
    {
      "question_id": 6,
      "question_text": "Which data structure operates on a Last-In, First-Out (LIFO) basis?",
      "options": [
        { "option_id": 1, "option_text": "Stack", "selected": false },
        { "option_id": 2, "option_text": "Queue", "selected": false },
        { "option_id": 3, "option_text": "Array", "selected": false },
        { "option_id": 4, "option_text": "Linked List", "selected": false }
      ]
    },
    {
      "question_id": 7,
      "question_text": "What is Git primarily used for?",
      "options": [
        { "option_id": 1, "option_text": "Version control", "selected": false },
        { "option_id": 2, "option_text": "Designing user interfaces", "selected": false },
        { "option_id": 3, "option_text": "Database management", "selected": false },
        { "option_id": 4, "option_text": "Network security", "selected": false }
      ]
    },
    {
      "question_id": 8,
      "question_text": "Which of the following is a relational database management system?",
      "options": [
        { "option_id": 1, "option_text": "PostgreSQL", "selected": false },
        { "option_id": 2, "option_text": "MongoDB", "selected": false },
        { "option_id": 3, "option_text": "Redis", "selected": false },
        { "option_id": 4, "option_text": "Cassandra", "selected": false }
      ]
    },
    {
      "question_id": 9,
      "question_text": "What does API stand for?",
      "options": [
        { "option_id": 1, "option_text": "Application Programming Interface", "selected": false },
        { "option_id": 2, "option_text": "Advanced Programming Interaction", "selected": false },
        { "option_id": 3, "option_text": "Automated Program Integration", "selected": false },
        { "option_id": 4, "option_text": "Application Process Integration", "selected": false }
      ]
    },
    {
      "question_id": 10,
      "question_text": "Which file extension is typically used for Python source code files?",
      "options": [
        { "option_id": 1, "option_text": ".py", "selected": false },
        { "option_id": 2, "option_text": ".js", "selected": false },
        { "option_id": 3, "option_text": ".html", "selected": false },
        { "option_id": 4, "option_text": ".java", "selected": false }
      ]
    }
  ]
}

const mockTestAttempt = {
  attempt_id: 1,
  test_id: 1,
  started_at: "2026-11-24T20:12:00Z",
  completed_at: null,
  score: null,
  total_questions: null,
  correct_questions: null
}

function renderTestContent(testDetails = mockTestDetails, testAttempt = mockTestAttempt) {
  const props = {
    testDetails,
    testAttempt,
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
          testDetails={mockTestDetails}
          testAttempt={mockTestAttempt}
          onSelectOption={vi.fn()}
          onNavigateQuestion={vi.fn()}
          isAnswered={vi.fn(() => false)}
        />} />
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
          testDetails={mockTestDetails}
          testAttempt={mockTestAttempt}
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

  it('selects only one option and updates the rendered question grid state', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTestDetails,
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
      json: async () => mockTestDetails,
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

  it('shows loading state and requests details for the route test ID', async () => {
    setAccessToken('test-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTestDetails,
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

  it('navigates to the dashboard when test details cannot be loaded', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => undefined,
    } as Response)

    renderTestWithRoutes('/test/1')

    await waitFor(() => {
      expect(screen.getByText('Student Dashboard')).toBeDefined()
    })
  })

  it('navigates to the dashboard when a test attempt cannot be created', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/test/attempt/1')) {
        return new Response(null, { status: 204 })
      }
      return new Response(JSON.stringify(mockTestDetails), { status: 200 })
    })

    renderTestWithRoutes('/test/1')

    await waitFor(() => {
      expect(screen.getByText('Student Dashboard')).toBeDefined()
    })
  })

  it('completes and submits the test successfully', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/time')) {
        return new Response(JSON.stringify({ server_time: new Date().toISOString() }), { status: 200 })
      }
      if (url.endsWith('/test/attempt/1')) {
        return new Response(JSON.stringify(mockTestAttempt), { status: 200 })
      }
      if (url.endsWith('/test/complete')) {
        return new Response(JSON.stringify({
          ...mockTestAttempt,
          completed_at: '2026-11-24T20:30:00Z',
          score: 80,
        }), { status: 200 })
      }
      return new Response(JSON.stringify(mockTestDetails), { status: 200 })
    })

    renderTestWithRoutes('/test/1')
    await screen.findByRole('heading', { name: 'Beginner Software Quiz' })

    fireEvent.click(screen.getByTestId('submit-test'))

    await waitFor(() => {
      expect(screen.getByText('Student Dashboard')).toBeDefined()
    })
  })

  it('shows an error when the completed attempt response is empty', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/time')) {
        return new Response(JSON.stringify({ server_time: new Date().toISOString() }), { status: 200 })
      }
      if (url.endsWith('/test/attempt/1')) {
        return new Response(JSON.stringify(mockTestAttempt), { status: 200 })
      }
      if (url.endsWith('/test/complete')) {
        return new Response(null, { status: 204 })
      }
      return new Response(JSON.stringify(mockTestDetails), { status: 200 })
    })

    renderTestWithRoutes('/test/1')
    await screen.findByRole('heading', { name: 'Beginner Software Quiz' })

    fireEvent.click(screen.getByTestId('submit-test'))
    fireEvent.click(screen.getByTestId('continue-submit-test'))

    await waitFor(() => {
      expect(screen.getByText('Test attempt was not submitted. Please try again.')).toBeDefined()
    })
  })
})

function ExampleTimerDisplay({
  startedAt,
  durationSeconds,
  onExpire,
}: {
  startedAt: string | null
  durationSeconds: number
  onExpire?: () => void
}) {
  const secondsLeft = useServerTimer({ startedAt, durationSeconds, onExpire })
  return <div data-testid="seconds-left">{secondsLeft}</div>
}

describe('Test Countdown Timer', () => {
  afterEach(() => {
    cleanup()
    clearAccessToken()
    vi.restoreAllMocks()
  })

  it('does not start a timer when no start time is provided', () => {
    render(
      <ExampleTimerDisplay startedAt={null} durationSeconds={600} />,
    )

    expect(screen.getByTestId('seconds-left').textContent).toBe('600')
  })

  it('falls back to the local clock and continues the timer when server time fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    await act(async () => {
      render(
        <MemoryRouter>
          <ExampleTimerDisplay
            startedAt={new Date().toISOString()}
            durationSeconds={60}
          />
        </MemoryRouter>,
      )
      await Promise.resolve()
    })

    const secondsLeft = Number(screen.getByTestId('seconds-left').textContent)
    expect(secondsLeft).toBeGreaterThanOrEqual(59)
    expect(secondsLeft).toBeLessThanOrEqual(60)
  })

  it('reports expiry and calls onExpire once when time has elapsed', async () => {
    const onExpire = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ server_time: new Date(Date.now() + 60_000).toISOString() }),
        { status: 200 },
      ),
    )

    await act(async () => {
      render(
        <MemoryRouter>
          <ExampleTimerDisplay
            startedAt="2000-01-01T00:00:00Z"
            durationSeconds={1}
            onExpire={onExpire}
          />
        </MemoryRouter>,
      )
      await Promise.resolve()
    })

    expect(screen.getByTestId('seconds-left').textContent).toBe('0')
    expect(onExpire).toHaveBeenCalledTimes(1)
  })
})

