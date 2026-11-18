import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@shared/api'
import {
  createLecturer,
  deleteLecturer,
  getLecturers,
  LecturerApiError,
  updateLecturer,
  updateLecturerPassword,
} from '@/pages/lecturers/api/lecturerApi'

const lecturer = {
  user_id: 1,
  username: 'jane.lecturer',
  first_name: 'Jane',
  last_name: 'Lecturer',
  email: 'jane@example.com',
  role: 'lecturer' as const,
  account_status: 'active' as const,
  registration_date: '2026-01-01',
  last_login: null,
}

describe('Lecturer API client', () => {
  afterEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  it('rejects requests when the session token is missing', async () => {
    await expect(getLecturers()).rejects.toEqual(
      new LecturerApiError(
        'Your session has expired. Please sign in again.',
        401,
      ),
    )
  })

  it('runs lecturer CRUD requests with authorization and JSON headers', async () => {
    setAccessToken('test-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json([lecturer]))
      .mockResolvedValueOnce(Response.json(lecturer, { status: 201 }))
      .mockResolvedValueOnce(Response.json(lecturer))
      .mockResolvedValueOnce(Response.json(lecturer))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(getLecturers()).resolves.toEqual([lecturer])
    await expect(createLecturer({
      username: lecturer.username,
      first_name: lecturer.first_name,
      last_name: lecturer.last_name,
      email: lecturer.email,
      password: 'Password123!',
    })).resolves.toEqual(lecturer)
    await expect(updateLecturer(lecturer.username, {
      first_name: 'Janet',
      last_name: lecturer.last_name,
      email: lecturer.email,
    })).resolves.toEqual(lecturer)
    await expect(updateLecturerPassword(lecturer.username, {
      password: 'NewPassword123!',
    })).resolves.toEqual(lecturer)
    await expect(deleteLecturer(lecturer.username)).resolves.toBeUndefined()

    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/user\/lecturer$/),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/jane.lecturer'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('surfaces API details, generic errors, and network failures', async () => {
    setAccessToken('test-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Username already exists.' }), {
        status: 400,
      }),
    )
    await expect(getLecturers()).rejects.toEqual(
      new LecturerApiError('Username already exists.', 400),
    )

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 500 }),
    )
    await expect(getLecturers()).rejects.toEqual(
      new LecturerApiError('Something went wrong. Please try again.', 500),
    )

    fetchSpy.mockResolvedValueOnce(new Response('not json', { status: 500 }))
    await expect(getLecturers()).rejects.toThrow(
      'Something went wrong. Please try again.',
    )

    fetchSpy.mockRejectedValueOnce(new TypeError('Network failure'))
    await expect(getLecturers()).rejects.toEqual(
      new LecturerApiError(
        'Unable to connect to the server. Please try again.',
        0,
      ),
    )
  })
})
