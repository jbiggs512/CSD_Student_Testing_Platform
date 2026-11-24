import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@shared/api'
import {
  approveStudent,
  createStudent,
  deleteStudent,
  getStudents,
  StudentApiError,
  unlockStudent,
  updateStudent,
} from '@/pages/students/api/studentApi'

const student = {
  user_id: 1,
  username: 'ws100001',
  first_name: 'Alex',
  last_name: 'Student',
  email: 'alex@example.com',
  role: 'student' as const,
  account_status: 'active' as const,
  registration_date: '2026-01-01',
  last_login: null,
  courses: [{ course_id: 1, course_title: 'BSc Software Engineering' }],
}

describe('Students API clients', () => {
  afterEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  it('rejects requests without a session token', async () => {
    await expect(getStudents()).rejects.toEqual(
      new StudentApiError('Your session has expired. Please sign in again.', 401),
    )
  })

  it('runs student CRUD requests with authorization and JSON', async () => {
    setAccessToken('test-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json([student]))
      .mockResolvedValueOnce(Response.json([student]))
      .mockResolvedValueOnce(Response.json(student, { status: 201 }))
      .mockResolvedValueOnce(Response.json(student))
      .mockResolvedValueOnce(Response.json(student))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(getStudents()).resolves.toEqual([student])
    await expect(getStudents(1)).resolves.toEqual([student])
    await expect(createStudent({
      username: student.username,
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      password: 'Password123!',
      courses: [1],
    })).resolves.toEqual(student)
    await expect(updateStudent(student.username, { account_status: 'disabled', courses: [2] })).resolves.toEqual(student)
    await expect(approveStudent(student.username)).resolves.toEqual(student)
    await expect(deleteStudent(student.username)).resolves.toBeUndefined()

    fetchSpy.mockResolvedValueOnce(Response.json(student))
    await expect(unlockStudent(student.username)).resolves.toEqual(student)
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.stringContaining('/student/ws100001/unlock'),
      expect.objectContaining({ method: 'PATCH' }),
    )

    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/student\?course_id=1$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/\/student$/),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('/student/ws100001'),
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('/student/ws100001/approve'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('surfaces API details, generic errors, and network failures', async () => {
    setAccessToken('test-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Duplicate student.' }), { status: 409 }),
    )
    await expect(getStudents()).rejects.toEqual(new StudentApiError('Duplicate student.', 409))

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }))
    await expect(getStudents()).rejects.toEqual(
      new StudentApiError('Something went wrong. Please try again.', 500),
    )

    fetchSpy.mockRejectedValueOnce(new TypeError('Network failure'))
    await expect(getStudents()).rejects.toEqual(
      new StudentApiError('Unable to connect to the server. Please try again.', 0),
    )
  })

  it('refreshes the access token and retries once when an API call returns 401', async () => {
    setAccessToken('expired-token')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Could not validate credentials.' }), {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ access_token: 'fresh-token', token_type: 'bearer' }),
      )
      .mockResolvedValueOnce(Response.json(student))

    await expect(
      updateStudent(student.username, { account_status: 'disabled' }),
    ).resolves.toEqual(student)

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/student/ws100001'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })
})
