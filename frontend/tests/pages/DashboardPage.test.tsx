import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { DashboardPage, DashboardContent } from '@/pages/dashboard'

// Mock data for testing
const mockCompletedTests = [
  { id: 1, testName: 'Test 1', scorePercentage: 80, questionsCorrect: 8, questionsTotal: 10, completedDate: '2026-10-01', scorePoints: 280 },
  { id: 2, testName: 'Test 2', scorePercentage: 90, questionsCorrect: 9, questionsTotal: 10, completedDate: '2026-10-05', scorePoints: 300 },
  { id: 3, testName: 'Test 3', scorePercentage: 84, questionsCorrect: 42, questionsTotal: 50, completedDate: '2026-10-10', scorePoints: 400 },
]

const mockOutstandingTests = [
  { id: 4, testName: 'Test 4' },
  { id: 5, testName: 'Test 5' },
]

// Helper function to render the dashboard page with routing context
function renderDashboardWithRoutes() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

// Helper function to render the dashboard content with test data and routing context
function renderDashboardContentWithRoutes(props: { outstandingTests?: any[], completedTests?: any[], cohortRank?: any } = {}) {
  return render(
    <MemoryRouter>
      <DashboardContent {...props} />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the dashboard page with the correct heading', async () => {
    renderDashboardWithRoutes()
    // Check for the loading state first
    expect(screen.getByText('Loading dashboard...')).toBeDefined()

    // Wait for the dashboard heading to appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Welcome back, Student!' })).toBeDefined()
    })
  })

  it('renders empty state messaging when no tests are available', () => {
    renderDashboardContentWithRoutes({ outstandingTests: [], completedTests: [] })

    // Hero section empty states
    expect(screen.getByText("You have no outstanding tests!")).toBeDefined()
    expect(screen.getByText("0")).toBeDefined() // 0 tests completed

    // Both the cohort rank and average score are displayed as '-' when no tests are available
    expect(screen.getAllByText('-').length).toBe(2)

    // Empty state messages for both outstanding and completed tests
    expect(screen.getByText("No Outstanding Tests")).toBeDefined()
    expect(screen.getByText("You're up to date on all your tests!")).toBeDefined()
    expect(screen.getByText("No Completed Tests")).toBeDefined()
    expect(screen.getByText("You've not yet completed any tests.")).toBeDefined()
  })

  it('calculates and displays the correct rounded average score', () => {
    renderDashboardContentWithRoutes({ completedTests: mockCompletedTests })

    // Average score calculation: (80 + 90 + 84) / 3 = 84.666 = 85
    expect(screen.getByText("85%")).toBeDefined()
  })

  it('hides the sort and filter dropdowns when test arrays are empty', () => {
    renderDashboardContentWithRoutes({ outstandingTests: [], completedTests: [] })

    const sortLabels = screen.queryAllByText("Sort by")
    const filterLabels = screen.queryAllByText("Filter by")

    expect(sortLabels.length).toBe(0)
    expect(filterLabels.length).toBe(0)
  })

  it('shows the sort and filter dropdowns when test arrays are not empty', () => {
    renderDashboardContentWithRoutes({ outstandingTests: mockOutstandingTests, completedTests: mockCompletedTests })

    const sortLabels = screen.queryAllByText("Sort by")
    const filterLabels = screen.queryAllByText("Filter by")

    expect(sortLabels.length).toBe(2)
    expect(filterLabels.length).toBe(2)
  })

  it('opens the sort dropdown and selects an option', async () => {
    renderDashboardContentWithRoutes({ outstandingTests: mockOutstandingTests })

    // Open the sort dropdown
    const sortDropdown = screen.getByText("Sort by...")
    fireEvent.click(sortDropdown)

    // Wait for the dropdown options to appear
    await waitFor(() => {
      expect(screen.getByText("Created Date Desc")).toBeDefined()
    })
  })
})

it('renders the correct number of test cards', () => {
  renderDashboardContentWithRoutes({
    outstandingTests: mockOutstandingTests,
    completedTests: mockCompletedTests
  })

  // Hero section dynamic text
  expect(screen.getByText("You have 2 outstanding tests to complete.")).toBeDefined()

  // Outstanding cards - check by counting the number of "Start Test" buttons rendered
  const startButtons = screen.getAllByRole('button', { name: 'Start Test' })
  expect(startButtons.length).toBe(2)
})



