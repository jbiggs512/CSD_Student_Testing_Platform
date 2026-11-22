import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest' 
import {
  getCourseTitle as getCourseTitleRequest,
  getLeaderboard as getLeaderboardRequest,
  getSubjects as getSubjectsRequest,
  LeaderboardApiError,
} from '@/pages/leaderboard/api/leaderboardApi'
import { API_BASE_URL } from '@shared/config'
import { clearAccessToken, setAccessToken } from '@shared/api'

describe('Leaderboard API Client', () => {
  beforeEach(() => {
    clearAccessToken()
  })

  afterEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  it('rejects requests when the session token is missing', async () => {
    await expect(getCourseTitleRequest()).rejects.toEqual(
      new LeaderboardApiError(
        'Your session has expired. Please sign in again.',
        401,
      ),
    )
  })

  it('requests course title, subjects, and leaderboard with the access token', async () => {
    const token = 'leaderboard-test-token'
    setAccessToken(token)
    const subjectList = [{ label: 'Mathematics', value: 7 }]
    const leaderboardResponse = {
      top_students: [],
      current_user_entry: null,
      is_in_top_5: false,
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => 'BSc Software Engineering',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => subjectList,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => leaderboardResponse,
      } as Response)

    await expect(getCourseTitleRequest()).resolves.toBe(
      'BSc Software Engineering',
    )
    await expect(getSubjectsRequest()).resolves.toEqual(subjectList)
    await expect(getLeaderboardRequest(7)).resolves.toEqual(
      leaderboardResponse,
    )

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/student/courseTitle`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/student/subjects`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      `${API_BASE_URL}/student/leaderboard/7`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
  })

  it('returns forbidden when user does not have student access', async () => {
    setAccessToken('leaderboard-test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Student access required.' }),
    } as Response)

    await expect(getLeaderboardRequest(7)).rejects.toEqual(
      new LeaderboardApiError('Student access required.', 403),
    )
  })
})