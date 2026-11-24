export type LecturerStatus = 'active' | 'disabled' | 'pending'
export type AccountRole = 'lecturer' | 'admin'

export interface Lecturer {
  user_id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: AccountRole
  account_status: LecturerStatus
  registration_date: string
  last_login: string | null
  failed_login_attempts?: number
  locked_until?: string | null
}

export interface LecturerCreateRequest {
  username: string
  first_name: string
  last_name: string
  email: string
  password: string
  role: AccountRole
}

export interface LecturerUpdateRequest {
  first_name?: string
  last_name?: string
  email?: string
  account_status?: LecturerStatus
}

export interface LecturerPasswordRequest {
  password: string
}
