export type SubjectStatus = 'active' | 'disabled'

export interface Subject {
  subject_id: number
  subject_name: string
  course_id: number
  course_title: string
  status: SubjectStatus
}

export interface QuestionOption {
  option_id: number
  option_text: string
  is_correct: boolean
}

export interface QuestionOptionInput {
  option_text: string
  is_correct: boolean
}

export interface Question {
  question_id: number
  question_code?: string | null
  subject_id: number | null
  test_id?: number | null
  question_text: string
  options: QuestionOption[]
}

export interface QuestionCreateRequest {
  subject_id: number
  question_text: string
  options: QuestionOptionInput[]
}

export interface QuestionUpdateRequest {
  subject_id?: number
  question_text?: string
  options?: QuestionOptionInput[]
}
