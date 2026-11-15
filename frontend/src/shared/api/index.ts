// Shared API client and requests
export {
  clearAccessToken,
  fetchWithAuthRetry,
  getAccessToken,
  getCurrentUser,
  getDashboardPathForRole,
  logoutUser,
  refreshAccessToken,
  restoreAuthSession,
  setAccessToken,
  setCurrentUser,
} from './authSession'
export type { AccountStatus, AuthUser, UserRole } from './authSession'
export { createApiClient, ApiError } from './client'
