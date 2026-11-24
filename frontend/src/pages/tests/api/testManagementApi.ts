import { getAccessToken, notifyIfAccountDisabled } from '@shared/api'
import { API_BASE_URL } from '@shared/config'
import type {
  LecturerTest,
  Subject,
  TestCreateRequest,
  TestManagementStats,
  TestResultsDetail,
} from '../model'

const TESTS_URL = `${API_BASE_URL}/test`
const SUBJECTS_URL = `${API_BASE_URL}/subject`

export class TestManagementApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'TestManagementApiError'
    this.status = status
  }
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken()
  if (!token) {
    throw new TestManagementApiError(
      'Your session has expired. Please sign in again.',
      401,
    )
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new TestManagementApiError(
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
      // Fallback to generic error message if response is not JSON
    }

    notifyIfAccountDisabled(response.status, detailMessage)

    throw new TestManagementApiError(
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
  return apiRequest<Subject[]>(SUBJECTS_URL)
}

export function getTests(): Promise<LecturerTest[]> {
  return apiRequest<LecturerTest[]>(TESTS_URL)
}

export function getTestManagementStats(): Promise<TestManagementStats> {
  return apiRequest<TestManagementStats>(`${TESTS_URL}/stats`)
}

export function getTestResults(testId: number): Promise<TestResultsDetail> {
  return apiRequest<TestResultsDetail>(`${TESTS_URL}/${testId}/results`)
}

export function createTest(request: TestCreateRequest): Promise<LecturerTest> {
  return apiRequest<LecturerTest>(TESTS_URL, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function deleteTest(testId: number): Promise<void> {
  return apiRequest<void>(`${TESTS_URL}/${testId}`, {
    method: 'DELETE',
  })
}
