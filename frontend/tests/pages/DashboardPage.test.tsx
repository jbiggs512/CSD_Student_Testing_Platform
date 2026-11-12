import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage, DashboardContent } from '@/pages/dashboard'
import { getOutstandingTests, DashboardApiError, getCompletedTests, getCohortRank } from '@/pages/dashboard/api/dashboardApi'
import {
  getOutstandingTests as getDashboardOutstandingTests,
  getCompletedTests as getDashboardCompletedTests,
  getCohortRank as getDashboardCohortRank,
} from '@/pages/dashboard/api'
import { clearAccessToken, setAccessToken } from '@/shared/api'
import type { DashboardContentProps } from '@/pages/dashboard/model'

vi.mock('@/pages/dashboard/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/pages/dashboard/api')>()
  return {
    ...actual,
    getOutstandingTests: vi.fn(),
    getCompletedTests: vi.fn(),
    getCohortRank: vi.fn(),
  }
})

// Mock data for testing
const mockCompletedTests = [
  { id: 1, test_name: 'Test 1', score_percentage: 80, questions_correct: 8, questions_total: 10, completed_date: '2026-10-01', score_points: 280 },
  { id: 2, test_name: 'Test 2', score_percentage: 90, questions_correct: 9, questions_total: 10, completed_date: '2026-10-05', score_points: 300 },
  { id: 3, test_name: 'Test 3', score_percentage: 84, questions_correct: 42, questions_total: 50, completed_date: '2026-10-10', score_points: 400 },
]

const mockOutstandingTests = [
  { id: 4, test_name: 'Test 4', subject_name: 'Software', description: 'Intro to Software', questions_per_attempt: 10 },
  { id: 5, test_name: 'Test 5', subject_name: 'Software', description: 'OOP', questions_per_attempt: 20 },
]

const mockCohortRank = { rank: 12, size: 48 }

// Helper function to render the dashboard page with routing context
function renderDashboardWithRoutes() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

// Helper function to render the dashboard content with test data and routing context
function renderDashboardContentWithRoutes(props: DashboardContentProps = { courseTitle: "" }) {
  return render(
    <MemoryRouter>
      <DashboardContent {...props} />
    </MemoryRouter>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.mocked(getDashboardCompletedTests).mockResolvedValue([])
  vi.mocked(getDashboardOutstandingTests).mockResolvedValue([])
  vi.mocked(getDashboardCohortRank).mockResolvedValue({ rank: 0, size: 0 })
})

describe('Dashboard Page', () => {
  it('renders the dashboard page with the correct heading', async () => {
    renderDashboardWithRoutes()

    // Wait for the dashboard heading to appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Welcome back, Student!' })).toBeDefined()
    })
  })

  it('loads the authenticated user dashboard data and finishes loading', async () => {
    vi.mocked(getDashboardCompletedTests).mockResolvedValue(mockCompletedTests)
    vi.mocked(getDashboardOutstandingTests).mockResolvedValue(mockOutstandingTests)
    vi.mocked(getDashboardCohortRank).mockResolvedValue(mockCohortRank)

    renderDashboardWithRoutes()

    // Check that the loading text is displayed
    expect(screen.getByText('Loading dashboard...')).toBeDefined()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Welcome back, Student!' })).toBeDefined()
    })

    // Check that api calls were sent with expected data and the correct number of times
    expect(getDashboardCompletedTests).toHaveBeenCalledTimes(1)
    expect(getDashboardOutstandingTests).toHaveBeenCalledTimes(1)
    expect(getDashboardCohortRank).toHaveBeenCalledTimes(1)
    expect(screen.getByText('You have 2 outstanding tests to complete.')).toBeDefined()
    expect(screen.getByText('12')).toBeDefined()
    expect(screen.getByText('of 48')).toBeDefined()
  })

  it('logs dashboard loading failures and still finishes loading', async () => {
    const error = new Error('dashboard unavailable')
    vi.mocked(getDashboardOutstandingTests).mockRejectedValue(error)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    renderDashboardWithRoutes()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Welcome back, Student!' })).toBeDefined()
    })

    expect(consoleError).toHaveBeenCalledWith('Error loading dashboard data:', error)
    expect(screen.queryByText('Loading dashboard...')).toBeNull()
  })

  it('renders empty state messaging when no tests are available', () => {
    renderDashboardContentWithRoutes({ outstandingTests: [], completedTests: [], courseTitle: "" })

    // Hero section empty states
    expect(screen.getByText("You have no outstanding tests!")).toBeDefined()
    expect(screen.getByText("0")).toBeDefined() // 0 tests completed

    // Both the cohort rank and average score are displayed as '-' when no tests are available
    expect(screen.getAllByText('-')).toHaveLength(2)

    // Empty state messages for both outstanding and completed tests
    expect(screen.getByText("No Outstanding Tests")).toBeDefined()
    expect(screen.getByText("You're up to date on all your tests!")).toBeDefined()
    expect(screen.getByText("No Completed Tests")).toBeDefined()
    expect(screen.getByText("You've not yet completed any tests.")).toBeDefined()
  })

  it('calculates and displays the correct rounded average score', () => {
    renderDashboardContentWithRoutes({ completedTests: mockCompletedTests, courseTitle: "" })

    // Average score calculation: (80 + 90 + 84) / 3 = 84.666 = 85
    expect(screen.getByText("85%")).toBeDefined()
  })

  it('hides the sort and filter dropdowns when test arrays are empty', () => {
    renderDashboardContentWithRoutes({ outstandingTests: [], completedTests: [], courseTitle: "" })

    const sortLabels = screen.queryAllByText("Sort by")
    const filterLabels = screen.queryAllByText("Filter by")

    expect(sortLabels).toHaveLength(0)
    expect(filterLabels).toHaveLength(0)
  })

  it('shows the sort and filter dropdowns when test arrays are not empty', () => {
    renderDashboardContentWithRoutes({ outstandingTests: mockOutstandingTests, completedTests: mockCompletedTests, courseTitle: "" })

    const sortLabels = screen.queryAllByText("Sort by")
    const filterLabels = screen.queryAllByText("Filter by")

    expect(sortLabels).toHaveLength(2)
    expect(filterLabels).toHaveLength(2)
  })

  it('opens the sort dropdown and selects an option', async () => {
    renderDashboardContentWithRoutes({ outstandingTests: mockOutstandingTests, courseTitle: "" })

    // Open the sort dropdown
    const sortDropdown = screen.getByText("Sort by...")
    fireEvent.click(sortDropdown)

    // Wait for the dropdown options to appear
    await waitFor(() => {
      expect(screen.getByText("Created Date Desc")).toBeDefined()
    })
  })

  it('displays the cohort rank when completed tests are available', () => {
    renderDashboardContentWithRoutes({
      completedTests: mockCompletedTests,
      cohortRank: mockCohortRank,
      courseTitle: ""
    })

    expect(screen.getByText("Cohort Rank")).toBeDefined()
    expect(screen.getByText("12")).toBeDefined()
    expect(screen.getByText("of 48")).toBeDefined()
  })
})

it('renders the correct number of test cards', () => {
  renderDashboardContentWithRoutes({
    outstandingTests: mockOutstandingTests,
    completedTests: mockCompletedTests,
    courseTitle: ""
  })

  // Hero section dynamic text
  expect(screen.getByText("You have 2 outstanding tests to complete.")).toBeDefined()

  // Outstanding cards - check by counting the number of "Start Test" buttons rendered
  const startButtons = screen.getAllByRole('button', { name: 'Start Test' })
  expect(startButtons).toHaveLength(2)
})

it('renders the completed tests dialog', async () => {
  renderDashboardContentWithRoutes({ completedTests: mockCompletedTests, courseTitle: "" })

  fireEvent.click(screen.getByRole('button', { name: 'View All Completed Tests...' }))

  expect(await screen.findByRole('dialog')).toBeDefined()
  expect(screen.getByText('3 tests completed')).toBeDefined()
})


describe('Dashboard API Client', () => {
  afterEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  it('rejects requests when the session token is missing', async () => {
    await expect(getOutstandingTests()).rejects.toEqual(
      new DashboardApiError(
        'Your session has expired. Please sign in again.',
        401,
      ),
    )
  })

  it('reports connection failures with a zero status', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    await expect(getOutstandingTests()).rejects.toMatchObject({
      name: 'DashboardApiError',
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

    await expect(getOutstandingTests()).rejects.toEqual(
      new DashboardApiError('Incorrect Credentials. Please try again.', 401),
    )
  })

  it('returns outstanding tests from a successful response', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockOutstandingTests,
    } as Response)

    await expect(getOutstandingTests()).resolves.toEqual(mockOutstandingTests)
  })

  it('returns completed tests from a successful response', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockCompletedTests,
    } as Response)

    await expect(getCompletedTests()).resolves.toEqual(mockCompletedTests)
  })

  it('returns cohort rank from a successful response', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockCohortRank,
    } as Response)

    await expect(getCohortRank()).resolves.toEqual(mockCohortRank)
  })

  it('uses the default forbidden message for missing detail text', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ detail: ' ' }),
    } as Response)

    await expect(getOutstandingTests()).rejects.toEqual(
      new DashboardApiError(
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
      json: async () => ({ detail: 'The test service is unavailable.' }),
    } as Response)

    await expect(getOutstandingTests()).rejects.toEqual(
      new DashboardApiError(
        'The test service is unavailable.',
        500,
      ),
    )
  })
})