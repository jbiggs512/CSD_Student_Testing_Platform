import type { AccountStatus, AuthUser, UserRole } from '@shared/api'
import { getDashboardPathForRole } from '@shared/api'

export type { AccountStatus, AuthUser, UserRole }
export { getDashboardPathForRole }

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: AuthUser
}
