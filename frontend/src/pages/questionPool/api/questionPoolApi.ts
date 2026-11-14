import { getAccessToken } from '@shared/api'
import { API_BASE_URL } from '@shared/config'
import type {
  Question,
  QuestionBulkCreateRequest,
  QuestionBulkCreateResponse,
  QuestionCreateRequest,
  QuestionUpdateRequest,
  Subject,
} from '../model'

const QUESTIONS_URL = `${API_BASE_URL}/question`
const SUBJECTS_URL = `${API_BASE_URL}/subject`

export class QuestionPoolApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'QuestionPoolApiError'
    this.status = status
  }
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken()

  if (!token) {
    throw new QuestionPoolApiError(
      'Your session has expired. Please sign in again.',
      401,
    )
  }

  let response: Response

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: 'Bearer ' + token,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new QuestionPoolApiError(
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

    throw new QuestionPoolApiError(
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

export function getQuestions(subjectId?: number): Promise<Question[]> {
  const query = subjectId !== undefined ? `?subject_id=${subjectId}` : ''
  return apiRequest<Question[]>(`${QUESTIONS_URL}${query}`)
}

export function createQuestion(
  request: QuestionCreateRequest,
): Promise<Question> {
  return apiRequest<Question>(QUESTIONS_URL, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function bulkCreateQuestions(
  request: QuestionBulkCreateRequest,
): Promise<QuestionBulkCreateResponse> {
  return apiRequest<QuestionBulkCreateResponse>(`${QUESTIONS_URL}/bulk`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function updateQuestion(
  questionId: number,
  request: QuestionUpdateRequest,
): Promise<Question> {
  return apiRequest<Question>(`${QUESTIONS_URL}/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  })
}

export function deleteQuestion(questionId: number): Promise<void> {
  return apiRequest<void>(`${QUESTIONS_URL}/${questionId}`, {
    method: 'DELETE',
  })
}
