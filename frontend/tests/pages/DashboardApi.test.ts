import { afterEach, describe, expect, it, vi } from 'vitest' 
import { getOutstandingTests, DashboardApiError, getCompletedTests, getCohortRank } from '@/pages/dashboard/api/dashboardApi'
import { clearAccessToken, setAccessToken } from '@/shared/api'

// Mock data for testing
const mockCompletedTests = [
  { id: 1, test_id: 1, test_name: 'Test 1', score_percentage: 80, questions_correct: 8, questions_total: 10, completed_date: '2026-10-01', score_points: 280 },
  { id: 2, test_id: 2, test_name: 'Test 2', score_percentage: 90, questions_correct: 9, questions_total: 10, completed_date: '2026-10-05', score_points: 300 },
  { id: 3, test_id: 3, test_name: 'Test 3', score_percentage: 84, questions_correct: 42, questions_total: 50, completed_date: '2026-10-10', score_points: 400 },
]

const mockOutstandingTests = [
  { id: 4, test_name: 'Test 4', subject_name: 'Software', description: 'Intro to Software', questions_per_attempt: 10 },
  { id: 5, test_name: 'Test 5', subject_name: 'Software', description: 'OOP', questions_per_attempt: 20 },
]

const mockCohortRank = { rank: 12, size: 48 }

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