import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearAccessToken,
  getCourses,
  setAccessToken,
} from '@shared/api'
import {
  createSubject,
  getSubject,
  getSubjects,
  SubjectApiError,
  updateSubject,
} from '@/pages/subjects/api/subjectApi'
import {
  createCourse,
  CourseApiError,
  updateCourse,
} from '@/shared/api/coursesApi'

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

  it('creates and updates courses with JSON and authorization headers', async () => {
    setAccessToken('test-token')
    const course = { course_id: 2, course_title: 'Computing' }
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(course, { status: 201 }))
      .mockResolvedValueOnce(Response.json(course))

    await expect(
      createCourse({ course_title: course.course_title }),
    ).resolves.toEqual(course)
    await expect(
      updateCourse(2, { course_title: course.course_title }),
    ).resolves.toEqual(course)

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    const [createUrl, createOptions] = fetchSpy.mock.calls[0]
    expect(String(createUrl)).toContain('/course')
    expect(createOptions?.method).toBe('POST')
    expect(createOptions?.headers).toHaveProperty('Authorization')
    expect(createOptions?.headers).toMatchObject({
      'Content-Type': 'application/json',
    })
    expect(createOptions?.body).toBe(
      JSON.stringify({ course_title: 'Computing' }),
    )

    const [updateUrl, updateOptions] = fetchSpy.mock.calls[1]
    expect(String(updateUrl)).toContain('/course/2')
    expect(updateOptions).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ course_title: 'Computing' }),
    })
  })

  it('surfaces course API error details', async () => {
    setAccessToken('test-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ detail: 'A course with this title already exists.' }, {
        status: 400,
      }),
    )

    await expect(
      createCourse({ course_title: 'Computing' }),
    ).rejects.toEqual(
      new CourseApiError('A course with this title already exists.', 400),
    )
  })

  it('runs subject read and write requests with JSON and authorization headers', async () => {
    setAccessToken('test-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json([subject]))
      .mockResolvedValueOnce(Response.json(subject))
      .mockResolvedValueOnce(Response.json(subject, { status: 201 }))
      .mockResolvedValueOnce(Response.json(subject))

    await expect(getSubjects()).resolves.toEqual([subject])
    await expect(getSubject(1)).resolves.toEqual(subject)
    await expect(
      createSubject({ subject_name: subject.subject_name, course_id: 2 }),
    ).resolves.toEqual(subject)
    await expect(
      updateSubject(1, { status: 'disabled' }),
    ).resolves.toEqual(subject)

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
