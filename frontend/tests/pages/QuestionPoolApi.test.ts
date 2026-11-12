import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/shared/api'
import {
  createQuestion,
  deleteQuestion,
  getQuestions,
  getSubjects,
  QuestionPoolApiError,
  updateQuestion,
} from '@/pages/questionPool/api'

describe('questionPoolApi', () => {
  beforeEach(() => {
    setAccessToken('test-token')
  })

  afterEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  it('throws QuestionPoolApiError when no access token is present', async () => {
    clearAccessToken()

    await expect(getQuestions(1)).rejects.toThrow(QuestionPoolApiError)
  })

  it('fetches subjects and questions with Authorization header', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ subject_id: 1, subject_name: 'OOP' }]), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ question_id: 1, question_text: 'Q1' }]), {
          status: 200,
        }),
      )

    await getSubjects()
    await getQuestions(1)

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/subject'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/question?subject_id=1'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
  })

  it('creates, updates, and deletes questions', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ question_id: 1 }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ question_id: 1 }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await createQuestion({
      subject_id: 1,
      question_text: 'Sample?',
      options: [
        { option_text: 'A', is_correct: true },
        { option_text: 'B', is_correct: false },
        { option_text: 'C', is_correct: false },
        { option_text: 'D', is_correct: false },
      ],
    })
    await updateQuestion(1, { question_text: 'Updated?' })
    await deleteQuestion(1)

    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })
})
