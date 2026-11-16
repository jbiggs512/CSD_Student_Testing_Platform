export type SubjectStatus = 'active' | 'disabled'

export interface Subject {
  subject_id: number
  subject_name: string
  course_id: number
  course_title: string
  status: SubjectStatus
}

export interface TestCreateRequest {
  subject_id: number
  test_name: string
  description?: string | null
  time_limit_minutes?: number | null
  questions_per_attempt?: number
}

export interface LecturerTest {
  test_id: number
  test_name: string
  description: string | null
  subject_id: number
  subject_name: string
  course_title: string
  time_limit_minutes: number | null
  questions_per_attempt: number
  pool_size: number
}
