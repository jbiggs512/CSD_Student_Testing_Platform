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
  attempt_count?: number
  attempted_student_count?: number
  average_percentage?: number | null
}

export interface TestManagementStats {
  student_total: number
  student_average_last_7_days: number | null
  weakest_test_last_7_days: string | null
}

export interface StudentTestAttemptItem {
  attempt_id: number
  user_id: number
  username: string
  student_name: string
  score: number
  correct_questions: number
  total_questions: number
  percentage: number
  completed_at: string
}

export interface TestResultsDetail {
  test_id: number
  test_name: string
  subject_name: string
  course_title: string
  attempt_count: number
  average_percentage: number | null
  highest_score: number | null
  lowest_score: number | null
  attempts: StudentTestAttemptItem[]
}
