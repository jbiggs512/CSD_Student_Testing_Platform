import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearAccessToken,
  setAccessToken,
} from '@shared/api'
import {
  createSubject,
  deleteSubject,
  getSubject,
  getSubjects,
  SubjectApiError,
  updateSubject,
} from '@/pages/subjects/api/subjectApi'
import { getCourses } from '@/pages/subjects/api/courseApi'

const subject = {
  subject_id: 1,
  subject_name: 'Software Testing',
  course_id: 2,
  course_title: 'BSc Software Engineering',
  status: 'active' as const,
}

describe('Subjects API clients', () => {
  afterEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  it('rejects requests when the session token is missing', async () => {
    await expect(getSubjects()).rejects.toMatchObject({
      message: 'Your session has expired. Please sign in again.',
      status: 401,
    })
    await expect(getCourses()).rejects.toThrow(
      'Your session has expired. Please sign in again.',
    )
  })

  it('loads courses with the bearer token', async () => {
    setAccessToken('test-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ course_id: 2, course_title: 'Computing' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(getCourses()).resolves.toEqual([
      { course_id: 2, course_title: 'Computing' },
    ])
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/course'),
      { headers: { Authorization: 'Bearer test-token' } },
    )
  })

  it('reports course loading failures', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 }),
    )

    await expect(getCourses()).rejects.toThrow(
      'Unable to load courses. Please try again.',
    )
  })

  it('runs subject CRUD requests with JSON and authorization headers', async () => {
    setAccessToken('test-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json([subject]))
      .mockResolvedValueOnce(Response.json(subject))
      .mockResolvedValueOnce(Response.json(subject, { status: 201 }))
      .mockResolvedValueOnce(Response.json(subject))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(getSubjects()).resolves.toEqual([subject])
    await expect(getSubject(1)).resolves.toEqual(subject)
    await expect(
      createSubject({ subject_name: subject.subject_name, course_id: 2 }),
    ).resolves.toEqual(subject)
    await expect(
      updateSubject(1, { status: 'disabled' }),
    ).resolves.toEqual(subject)
    await expect(deleteSubject(1)).resolves.toBeUndefined()

    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/\/subject$/),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('/subject/1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'disabled' }),
      }),
    )
  })

  it('surfaces API details, generic errors, and network failures', async () => {
    setAccessToken('test-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Duplicate subject.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(getSubjects()).rejects.toEqual(
      new SubjectApiError('Duplicate subject.', 400),
    )

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(getSubjects()).rejects.toEqual(
      new SubjectApiError('Something went wrong. Please try again.', 500),
    )

    fetchSpy.mockResolvedValueOnce(
      new Response('not json', { status: 500 }),
    )
    await expect(getSubjects()).rejects.toThrow(
      'Something went wrong. Please try again.',
    )

    fetchSpy.mockRejectedValueOnce(new TypeError('Network failure'))
    await expect(getSubjects()).rejects.toEqual(
      new SubjectApiError(
        'Unable to connect to the server. Please try again.',
        0,
      ),
    )
  })
})
