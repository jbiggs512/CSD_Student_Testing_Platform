export type LecturerStatus = 'active' | 'disabled' | 'pending'

export interface Lecturer {
  user_id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: 'lecturer'
  account_status: LecturerStatus
  registration_date: string
  last_login: string | null
}

export interface LecturerCreateRequest {
  username: string
  first_name: string
  last_name: string
  email: string
  password: string
}

export interface LecturerUpdateRequest {
  first_name?: string
  last_name?: string
  email?: string
}

export interface LecturerPasswordRequest {
  password: string
}
