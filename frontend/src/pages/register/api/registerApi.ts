import { API_BASE_URL } from '@shared/config'
import type {
  CourseOption,
  RegisteredStudentResponse,
  StudentRegistrationRequest,
} from '../model'

export class RegisterApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'RegisterApiError'
    this.status = status
  }
}

async function extractErrorDetail(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as { detail?: unknown }
    return typeof payload.detail === 'string' && payload.detail.trim()
      ? payload.detail
      : null
  } catch {
    return null
  }
}

export async function getAvailableCourses(): Promise<CourseOption[]> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/course`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new RegisterApiError(
      'Unable to load courses right now. Please try again.',
      0,
    )
  }

  if (!response.ok) {
    throw new RegisterApiError(
      'Unable to load courses right now. Please try again.',
      response.status,
    )
  }

  return (await response.json()) as CourseOption[]
}

export async function registerStudent(
  payload: StudentRegistrationRequest,
): Promise<RegisteredStudentResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/user/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new RegisterApiError(
      'Unable to connect to the server. Please try again.',
      0,
    )
  }

  if (!response.ok) {
    const detail = await extractErrorDetail(response)
    throw new RegisterApiError(
      detail ?? 'Incorrect Input, Please try again.',
      response.status,
    )
  }

  return (await response.json()) as RegisteredStudentResponse
}
