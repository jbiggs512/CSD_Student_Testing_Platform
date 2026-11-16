import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@shared/api'
import { API_BASE_URL } from '@shared/config'
import {
  getGradesOverTime,
  getStatisticsOverview,
  StatisticsApiError,
} from '@/pages/statistics/api'

const mockStatistics = {
  total_points: 400,
  average_score: 75,
  best_score: {
    score: 140,
    test_name: 'First Test',
    completed_date: '2026-01-01',
  },
  worst_score: {
    score: 260,
    test_name: 'Second Test',
    completed_date: '2026-01-02',
  },
}

const mockGradesOverTime = {
  average: 75,
  points: [
    {
      completed_at: '2026-01-01T12:00:00.000Z',
      percentage: 60,
      test_name: 'First Test',
      is_best: false,
      is_worst: true,
    },
    {
      completed_at: '2026-01-02T12:00:00.000Z',
      percentage: 90,
      test_name: 'Second Test',
      is_best: true,
      is_worst: false,
    },
  ],
}

describe('statisticsApi', () => {
  beforeEach(() => {
    clearAccessToken()
  })

  afterEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  it('rejects requests when the session token is missing', async () => {
    await expect(getStatisticsOverview()).rejects.toEqual(
      new StatisticsApiError('Your session has expired. Please sign in again.', 401),
    )
  })

  it('requests the statistics overview and grade history with the access token', async () => {
    const token = 'statistics-test-token'
    setAccessToken(token)

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStatistics,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockGradesOverTime,
      } as Response)

    await expect(getStatisticsOverview()).resolves.toEqual(mockStatistics)
    await expect(getGradesOverTime()).resolves.toEqual(mockGradesOverTime)

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/student/statistics`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/student/gradesOverTime`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
  })

  it('returns forbidden when the user does not have student access', async () => {
    setAccessToken('statistics-test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Student access required.' }),
    } as Response)

    await expect(getStatisticsOverview()).rejects.toEqual(
      new StatisticsApiError('Student access required.', 403),
    )
  })
})
