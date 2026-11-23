import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage, DashboardContent } from '@/pages/dashboard'
import {
  type DashboardContentProps,
  buildFilterOptions,
  sortAndFilterCompleted,
  sortAndFilterOutstanding
} from '@/pages/dashboard/model'
import { DashboardApiError } from '@/pages/dashboard/api/dashboardApi'

const {
  getCourseTitle,
  getOutstandingTests,
  getCompletedTests,
  getCohortRank
} = vi.hoisted(() => ({
  getCourseTitle: vi.fn(),
  getOutstandingTests: vi.fn(),
  getCompletedTests: vi.fn(),
  getCohortRank: vi.fn(),
}))

vi.mock('@/pages/dashboard/api', () => ({
  getCourseTitle,
  getOutstandingTests,
  getCompletedTests,
  getCohortRank,
  DashboardApiError: class DashboardApiError extends Error { },
}))

// Mock data for testing
const mockCompletedTests = [
  { id: 1, test_id: 1, test_name: 'Test 1', subject_name: 'Software', score_percentage: 80, questions_correct: 8, questions_total: 10, completed_date: '2026-10-01', score_points: 280 },
  { id: 2, test_id: 2, test_name: 'Test 2', subject_name: 'Software 2', score_percentage: 90, questions_correct: 9, questions_total: 10, completed_date: '2026-10-05', score_points: 300 },
  { id: 3, test_id: 3, test_name: 'Test 3', subject_name: 'Software', score_percentage: 84, questions_correct: 42, questions_total: 50, completed_date: '2026-10-10', score_points: 400 },
]

const mockOutstandingTests = [
  { id: 4, test_name: 'Test 4', subject_name: 'Software', description: 'Intro to Software', questions_per_attempt: 10 },
  { id: 5, test_name: 'Test 5', subject_name: 'Software 2', description: 'OOP', questions_per_attempt: 20 },
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

describe('Dashboard Page', () => {
  function pressAndRelease(el: HTMLElement) {
    fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' })
    fireEvent.mouseDown(el, { button: 0 })
    fireEvent.pointerUp(el, { button: 0, pointerType: 'mouse' })
    fireEvent.mouseUp(el, { button: 0 })
    fireEvent.click(el, { button: 0 })
  }

  it('renders the dashboard page with the correct heading', async () => {
    getOutstandingTests.mockResolvedValue(mockOutstandingTests)
    getCompletedTests.mockResolvedValue(mockCompletedTests)
    getCohortRank.mockResolvedValue(mockCohortRank)

    renderDashboardWithRoutes()

    // Wait for the dashboard heading to appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Welcome back, Student!' })).toBeDefined()
    })
  })

  it('loads the authenticated user dashboard data and finishes loading', async () => {
    getOutstandingTests.mockResolvedValue(mockOutstandingTests)
    getCompletedTests.mockResolvedValue(mockCompletedTests)
    getCohortRank.mockResolvedValue(mockCohortRank)

    renderDashboardWithRoutes()

    // Check that the loading text is displayed
    expect(screen.getByText('Dashboard data is loading...')).toBeDefined()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Welcome back, Student!' })).toBeDefined()
    })

    expect(screen.getByText('You have 2 outstanding tests to complete.')).toBeDefined()
    expect(screen.getByText('12')).toBeDefined()
    expect(screen.getByText('of 48')).toBeDefined()
  })

  it('logs dashboard loading failures and still finishes loading', async () => {
    const error = new DashboardApiError("Your session has expired. Please sign in again.", 401)
    getOutstandingTests.mockRejectedValue(error)
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
      expect(screen.getByText("Test Name (A - Z)")).toBeDefined()
    })
  })

  it('sorts outstanding test cards by test name', async () => {
    renderDashboardContentWithRoutes({ outstandingTests: mockOutstandingTests, courseTitle: "" })

    const sortTrigger = document.querySelector('#outstandingSort') as HTMLElement
    fireEvent.click(sortTrigger)
    pressAndRelease(await screen.findByText('Test Name (A - Z)'))

    await waitFor(() => {
      expect(screen.queryByText('Test 4')).toBeDefined()
      expect(screen.getByText('Test 5')).toBeDefined()
    })
  })

  it('filters outstanding test cards by subject', async () => {
    renderDashboardContentWithRoutes({ outstandingTests: mockOutstandingTests, courseTitle: "" })

    const filterTrigger = document.querySelector('#outstandingFilter') as HTMLElement
    fireEvent.click(filterTrigger)
    pressAndRelease(await screen.findByTestId('outstanding-filter-Software 2'))

    await waitFor(() => {
      expect(screen.getByText('Test 5')).toBeDefined()
      expect(screen.queryByText('Test 4')).toBeNull()
    })
  })

  it('filters completed test cards by subject', async () => {
    renderDashboardContentWithRoutes({ completedTests: mockCompletedTests, courseTitle: "" })

    const filterTrigger = document.querySelector('#completedFilter') as HTMLElement
    fireEvent.click(filterTrigger)
    pressAndRelease(await screen.findByTestId('completed-filter-Software 2'))

    await waitFor(() => {
      expect(screen.getByText('Test 2')).toBeDefined()
      expect(screen.queryByText('Test 1')).toBeNull()
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

})

describe('Dashboard sort and filter options', () => {
  it('orders subjects alpahbetically and only includes them once', () => {
    expect(buildFilterOptions(['Software', 'Algorithms', 'Software'])).toEqual([
      { label: 'Filter by...', value: null },
      { label: 'All', value: 'all' },
      { label: 'Algorithms', value: 'Algorithms' },
      { label: 'Software', value: 'Software' },
    ])
  })

  it('returns no subject options for an empty list', () => {
    expect(buildFilterOptions([])).toEqual([
      { label: 'Filter by...', value: null },
      { label: 'All', value: 'all' },
    ])
  })

  it('filters by subject and supports the all filter for outstanding tests', () => {
    expect(
      sortAndFilterOutstanding(mockOutstandingTests, null, 'Software').map((test) => test.test_name),
    ).toEqual(['Test 4'])
    expect(
      sortAndFilterOutstanding(mockOutstandingTests, null, 'all').map((test) => test.test_name),
    ).toEqual(['Test 4', 'Test 5'])
  })

  it.each([
    [1, ['Test 4', 'Test 5']],
    [2, ['Test 5', 'Test 4']],
    [3, ['Test 4', 'Test 5']],
    [4, ['Test 5', 'Test 4']],
    [5, ['Test 4', 'Test 5']],
    [6, ['Test 5', 'Test 4']],
  ])('applies outstanding sort option %i', (sort, expectedNames) => {
    expect(
      sortAndFilterOutstanding(mockOutstandingTests, sort as number, null).map((test) => test.test_name),
    ).toEqual(expectedNames)
  })

  it('filters by subject and supports the all filter for completed tests', () => {
    expect(
      sortAndFilterCompleted(mockCompletedTests, null, 'Software').map((test) => test.test_name),
    ).toEqual(['Test 1', 'Test 3'])
    expect(
      sortAndFilterCompleted(mockCompletedTests, null, 'all').map((test) => test.test_name),
    ).toEqual(['Test 1', 'Test 2', 'Test 3'])
  })

  it.each([
    [1, ['Test 1', 'Test 2', 'Test 3']],
    [2, ['Test 3', 'Test 2', 'Test 1']],
    [3, ['Test 1', 'Test 3', 'Test 2']],
    [4, ['Test 2', 'Test 1', 'Test 3']],
    [5, ['Test 1', 'Test 2', 'Test 3']],
    [6, ['Test 3', 'Test 2', 'Test 1']],
  ])('applies completed sort option %i', (sort, expectedNames) => {
    expect(
      sortAndFilterCompleted(mockCompletedTests, sort as number, null).map((test) => test.test_name),
    ).toEqual(expectedNames)
  })
})

