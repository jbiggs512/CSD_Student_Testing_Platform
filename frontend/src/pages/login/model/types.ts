export type UserRole = 'student' | 'lecturer' | 'admin'
export type AccountStatus = 'pending' | 'active' | 'disabled'

export interface AuthUser {
  user_id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: UserRole
  account_status: AccountStatus
  registration_date: string
  last_login: string | null
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

/**
 * Maps a backend UserRole to its corresponding role-specific dashboard route in NavBar.
 */
export function getDashboardPathForRole(role: UserRole): string {
  switch (role) {
    case 'lecturer':
      return '/lecturerDashboard'
    case 'admin':
      return '/adminDashboard'
    case 'student':
    default:
      return '/dashboard'
  }
}
