// Shared API client and requests
export {
  clearAccessToken,
  getAccessToken,
  getCurrentUser,
  getDashboardPathForRole,
  logoutUser,
  restoreAuthSession,
  setAccessToken,
  setCurrentUser,
} from './authSession'
export type { AccountStatus, AuthUser, UserRole } from './authSession'
export { createApiClient, ApiError } from './client'
