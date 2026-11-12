import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LeaderboardPage } from '@/pages/leaderboard'
import {
  getCourseTitle as getCourseTitleRequest,
  getLeaderboard as getLeaderboardRequest,
  getSubjects as getSubjectsRequest,
  LeaderboardApiError,
} from '@/pages/leaderboard/api/leaderboardApi'
import { API_BASE_URL } from '@shared/config'
import { clearAccessToken, setAccessToken } from '@shared/api'

const { getCourseTitle, getSubjects, getLeaderboard } = vi.hoisted(() => ({
  getCourseTitle: vi.fn(),
  getSubjects: vi.fn(),
  getLeaderboard: vi.fn(),
}))

vi.mock('@/pages/leaderboard/api', () => ({
  getCourseTitle,
  getSubjects,
  getLeaderboard,
}))

const subjects = [
  { label: 'Mathematics', value: 7 },
  { label: 'Science', value: 8 },
]

const leaderboard = {
  top_students: [
    { user_id: 2, rank: 1, name: 'John D.', avg_score: 96, points: 1860 },
    { user_id: 3, rank: 2, name: 'Jane D.', avg_score: 93, points: 1820 },
  ],
  current_user_entry: undefined,
  is_in_top_5: true,
}

function renderLeaderboardPage() {
  return render(<LeaderboardPage />)
}

describe('LeaderboardPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('shows a loading message while the course data is pending', () => {
    getCourseTitle.mockReturnValue(new Promise(() => undefined))

    renderLeaderboardPage()

    expect(screen.getByText('Loading leaderboard...')).toBeDefined()
  })

  it('loads the first subject leaderboard and renders its results', async () => {
    getCourseTitle.mockResolvedValue('BSc Software Engineering')
    getSubjects.mockResolvedValue(subjects)
    getLeaderboard.mockResolvedValue(leaderboard)

    renderLeaderboardPage()

    expect(await screen.findByRole('heading', { name: 'Leaderboards' })).toBeDefined()
    expect(screen.getByText('BSc Software Engineering')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Top 5 Students' })).toBeDefined()
    expect(screen.getByText('John D.')).toBeDefined()
    expect(screen.getByText('96%')).toBeDefined()
    expect(screen.getByText('1860')).toBeDefined()

    expect(getCourseTitle).toHaveBeenCalledTimes(1)
    expect(getSubjects).toHaveBeenCalledTimes(1)
    expect(getLeaderboard).toHaveBeenCalledOnce()
    expect(getLeaderboard).toHaveBeenCalledWith(subjects[0].value)
  })

  it('renders the current student separately when outside the top five', async () => {
    getCourseTitle.mockResolvedValue('BSc Software Engineering')
    getSubjects.mockResolvedValue(subjects)
    getLeaderboard.mockResolvedValue({
      ...leaderboard,
      current_user_entry: {
        user_id: 11,
        rank: 12,
        name: 'Test S.',
        avg_score: 75.5,
        points: 400,
      },
      is_in_top_5: false,
    })

    renderLeaderboardPage()

    expect(await screen.findByText('Test S.')).toBeDefined()
    expect(screen.getByText('75.5%')).toBeDefined()
    expect(screen.getByText('400')).toBeDefined()
    expect(screen.getByText('Your position')).toBeDefined()
  })

  it('skips the leaderboard request when the student has no subjects', async () => {
    getCourseTitle.mockResolvedValue('BSc Software Engineering')
    getSubjects.mockResolvedValue([])

    renderLeaderboardPage()

    expect(await screen.findByText('You')).toBeDefined()
    expect(getLeaderboard).not.toHaveBeenCalled()
  })
})

describe('leaderboardApi', () => {
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