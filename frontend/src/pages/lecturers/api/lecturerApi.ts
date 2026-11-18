import { getAccessToken } from '@shared/api'
import { API_BASE_URL } from '@shared/config'
import type {
  Lecturer,
  LecturerCreateRequest,
  LecturerPasswordRequest,
  LecturerUpdateRequest,
} from '../model'

const LECTURERS_URL = `${API_BASE_URL}/user/lecturer`

export class LecturerApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'LecturerApiError'
    this.status = status
  }
}

async function lecturerRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken()

  if (!token) {
    throw new LecturerApiError(
      'Your session has expired. Please sign in again.',
      401,
    )
  }

  let response: Response
  try {
    response = await fetch(`${LECTURERS_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new LecturerApiError(
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

    throw new LecturerApiError(
      detail ?? 'Something went wrong. Please try again.',
      response.status,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function getLecturers(): Promise<Lecturer[]> {
  return lecturerRequest<Lecturer[]>('')
}

export function createLecturer(
  request: LecturerCreateRequest,
): Promise<Lecturer> {
  return lecturerRequest<Lecturer>('', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function updateLecturer(
  username: string,
  request: LecturerUpdateRequest,
): Promise<Lecturer> {
  return patchLecturer(username, request)
}

function patchLecturer(
  username: string,
  request: LecturerUpdateRequest | LecturerPasswordRequest,
): Promise<Lecturer> {
  return lecturerRequest<Lecturer>(`/${encodeURIComponent(username)}`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  })
}

export function updateLecturerPassword(
  username: string,
  request: LecturerPasswordRequest,
): Promise<Lecturer> {
  return patchLecturer(username, request)
}

export function deleteLecturer(username: string): Promise<void> {
  return lecturerRequest<void>(`/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  })
}
