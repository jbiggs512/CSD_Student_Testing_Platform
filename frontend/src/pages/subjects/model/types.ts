export type SubjectStatus = 'active' | 'disabled'

export interface Subject {
  subject_id: number
  subject_name: string
  course_id: number
  course_title: string
  status: SubjectStatus
}

export interface Course {
  course_id: number
  course_title: string
}

export interface SubjectCreateRequest {
  subject_name: string
  course_id: number
}

export interface SubjectUpdateRequest {
  subject_name: string
  course_id: number
}