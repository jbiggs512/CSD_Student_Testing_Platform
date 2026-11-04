export type SubjectStatus = 'active' | 'disabled'

export interface Subject {
  subject_id: number
  subject_name: string
  course_id: number
  status: SubjectStatus
}

export interface SubjectCreateRequest {
  subject_name: string
  course_id: number
}

export interface SubjectUpdateRequest {
  subject_name: string
  course_id: number
}