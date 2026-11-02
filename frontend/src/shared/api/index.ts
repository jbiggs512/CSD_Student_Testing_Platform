// Shared API client and requests
export {
  clearAccessToken,
  getAccessToken,
  getCurrentUser,
  getDashboardPathForRole,
  restoreAuthSession,
  setAccessToken,
  setCurrentUser,
} from './authSession'
export type { AccountStatus, AuthUser, UserRole } from './authSession'
