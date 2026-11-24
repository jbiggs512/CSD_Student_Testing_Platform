import { getAccessToken } from '@shared/api'
import { API_BASE_URL } from '@shared/config'
import type {
  Course,
  CourseCreateRequest,
  CourseUpdateRequest,
} from '../model'

const COURSES_URL = `${API_BASE_URL}/course`

export class CourseApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CourseApiError'
    this.status = status
  }
}

async function courseRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken()

  if (!token) {
    throw new CourseApiError(
      'Your session has expired. Please sign in again.',
      401,
    )
  }

  let response: Response

  try {
    response = await fetch(`${COURSES_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: 'Bearer ' + token,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new CourseApiError(
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

    throw new CourseApiError(
      detailMessage ?? 'Unable to load courses. Please try again.',
      response.status,
    )
  }

  return (await response.json()) as T
}

export function getCourses(): Promise<Course[]> {
  return courseRequest<Course[]>('')
}

export function createCourse(
  request: CourseCreateRequest,
): Promise<Course> {
  return courseRequest<Course>('', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function updateCourse(
  courseId: number,
  request: CourseUpdateRequest,
): Promise<Course> {
  return courseRequest<Course>(`/${courseId}`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  })
}
