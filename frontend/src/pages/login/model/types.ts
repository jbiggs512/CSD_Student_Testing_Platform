import type { AuthUser } from '@shared/api'

export {
  getDashboardPathForRole,
  type AccountStatus,
  type AuthUser,
  type UserRole,
} from '@shared/api'

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: AuthUser
}
