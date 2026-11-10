import { getAccessToken } from '@shared/api'
import { API_BASE_URL } from '@shared/config'
import type { Student, StudentCreateRequest, StudentUpdateRequest } from '../model'

const STUDENTS_URL = `${API_BASE_URL}/user/student`

export class StudentApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'StudentApiError'
    this.status = status
  }
}

async function studentRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken()
  if (!token) {
    throw new StudentApiError(
      'Your session has expired. Please sign in again.',
      401,
    )
  }

  let response: Response
  try {
    response = await fetch(`${STUDENTS_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new StudentApiError(
      'Unable to connect to the server. Please try again.',
      0,
    )
  }

  if (!response.ok) {
    let detail: string | undefined
    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === 'string' && body.detail.trim()) {
        detail = body.detail
      }
    } catch {
      // Use the generic error when the server does not return JSON.
    }
    throw new StudentApiError(
      detail ?? 'Something went wrong. Please try again.',
      response.status,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function getStudents(): Promise<Student[]> {
  return studentRequest<Student[]>('')
}

export function createStudent(request: StudentCreateRequest): Promise<Student> {
  return studentRequest<Student>('', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function updateStudent(
  username: string,
  request: StudentUpdateRequest,
): Promise<Student> {
  return studentRequest<Student>(`/${encodeURIComponent(username)}`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  })
}

export function approveStudent(username: string): Promise<Student> {
  return studentRequest<Student>(
    `/${encodeURIComponent(username)}/approve`,
    { method: 'PATCH' },
  )
}

export function deleteStudent(username: string): Promise<void> {
  return studentRequest<void>(`/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  })
}
