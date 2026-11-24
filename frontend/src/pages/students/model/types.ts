import type { Course } from '@shared/api'

export type StudentStatus = 'active' | 'disabled' | 'pending'

export interface Student {
  user_id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: 'student'
  account_status: StudentStatus
  registration_date: string
  last_login: string | null
  courses: Course[]
  failed_login_attempts?: number
  locked_until?: string | null
}

export interface StudentCreateRequest {
  username: string
  first_name: string
  last_name: string
  email: string
  password: string
  courses?: number[]
}

export interface StudentUpdateRequest {
  first_name?: string
  last_name?: string
  email?: string
  password?: string
  account_status?: StudentStatus
  courses?: number[]
}
