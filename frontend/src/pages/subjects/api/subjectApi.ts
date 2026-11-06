import { getAccessToken } from '@shared/api'
import { API_BASE_URL } from '@shared/config'
import type {
  Subject,
  SubjectCreateRequest,
  SubjectUpdateRequest,
} from '../model'

const SUBJECTS_URL = `${API_BASE_URL}/subject`

export class SubjectApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SubjectApiError'
    this.status = status
  }
}

async function subjectRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken()

  if (!token) {
    throw new SubjectApiError(
      'Your session has expired. Please sign in again.',
      401,
    )
  }

  let response: Response

  try {
    response = await fetch(`${SUBJECTS_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: 'Bearer ' + token,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new SubjectApiError(
      'Unable to connect to the server. Please try again.',
      0,
    )
  }

  if (!response.ok) {
    let detailMessage: string | undefined

    try {
      const errorBody = (await response.json()) as { detail?: unknown }
      if (typeof errorBody.detail === 'string' && errorBody.detail.trim()) {
        detailMessage = errorBody.detail
      }
    } catch {
      // Use the generic message when the server does not return JSON.
    }

    throw new SubjectApiError(
      detailMessage ?? 'Something went wrong. Please try again.',
      response.status,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function getSubjects(): Promise<Subject[]> {
  return subjectRequest<Subject[]>('')
}

export function getSubject(subjectId: number): Promise<Subject> {
  return subjectRequest<Subject>(`/${subjectId}`)
}

export function createSubject(
  request: SubjectCreateRequest,
): Promise<Subject> {
  return subjectRequest<Subject>('', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function updateSubject(
  subjectId: number,
  request: SubjectUpdateRequest,
): Promise<Subject> {
  return subjectRequest<Subject>(`/${subjectId}`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  })
}

export function deleteSubject(subjectId: number): Promise<void> {
  return subjectRequest<void>(`/${subjectId}`, {
    method: 'DELETE',
  })
}
