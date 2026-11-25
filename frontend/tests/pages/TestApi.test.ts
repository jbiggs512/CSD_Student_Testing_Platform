import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@shared/api'
import { API_BASE_URL } from '@shared/config'
import {
  completeTestAttempt,
  createTestAttempt,
  getServerTime,
  getTestDetails,
  TestApiError,
} from '@/pages/test/api/testApi'

const mockTestDetails = {
  test_id: 1,
  course: 'Software Development',
  subject: 'Programming',
  test_name: 'Unit Test Quiz',
  description: 'Test description',
  timed: true,
  time_limit_minutes: 30,
  current_question: 1,
  questions_per_attempt: 1,
  questions: [],
}

const mockTestAttempt = {
  attempt_id: 10,
  test_id: 1,
  started_at: '2026-11-24T20:12:00Z',
  completed_at: null,
  score: null,
  total_questions: 1,
  correct_questions: null,
}

describe('Test API Client', () => {
  beforeEach(() => {
    setAccessToken('test-token')
  })

  afterEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  it('rejects requests when the session token is missing', async () => {
    clearAccessToken()

    await expect(getTestDetails(1)).rejects.toEqual(
      new TestApiError(
        'Your session has expired. Please sign in again.',
        401,
      ),
    )
  })

  it('fetches test details with the access token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockTestDetails), { status: 200 }),
    )

    await expect(getTestDetails(1)).resolves.toEqual(mockTestDetails)
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_BASE_URL}/test/1`,
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      },
    )
  })

  it('creates a test attempt with POST', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockTestAttempt), { status: 200 }),
    )

    await expect(createTestAttempt(1)).resolves.toEqual(mockTestAttempt)
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_BASE_URL}/test/attempt/1`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
        },
      },
    )
  })

  it('completes a test attempt with PATCH and a JSON payload', async () => {
    const payload = {
      attempt_id: 10,
      test_id: 1,
      answers: [
        { question_id: 5, selected_option_id: 12 },
        { question_id: 6, selected_option_id: null },
      ],
    }
    const completedAttempt = {
      ...mockTestAttempt,
      completed_at: '2026-11-24T20:30:00Z',
      score: 80,
      correct_questions: 1,
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(completedAttempt), { status: 200 }),
    )

    await expect(completeTestAttempt(payload)).resolves.toEqual(completedAttempt)
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_BASE_URL}/test/complete`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      },
    )
  })

  it('returns undefined for a 204 no-content attempt response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    )

    await expect(createTestAttempt(1)).resolves.toBeUndefined()
  })

  it('fetches the server time from /time', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ server_time: '2026-11-24T20:30:27.511Z' }),
        { status: 200 },
      ),
    )

    await expect(getServerTime()).resolves.toBe('2026-11-24T20:30:27.511Z')
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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 }),
    )

    await expect(getTestDetails(1)).rejects.toEqual(
      new TestApiError('Incorrect Credentials. Please try again.', 401),
    )
  })

  it('uses the server detail message for error responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ detail: 'The test is no longer available.' }),
        { status: 410 },
      ),
    )

    await expect(getTestDetails(1)).rejects.toEqual(
      new TestApiError('The test is no longer available.', 410),
    )
  })

  it('uses the default forbidden message for missing detail text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: ' ' }), { status: 403 }),
    )

    await expect(getTestDetails(1)).rejects.toEqual(
      new TestApiError(
        'Your account is not permitted to access this resource.',
        403,
      ),
    )
  })
})