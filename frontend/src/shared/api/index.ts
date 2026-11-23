// Shared API client and requests
export {
  ACCOUNT_DISABLED_DETAIL,
  clearAccessToken,
  fetchWithAuthRetry,
  getAccessToken,
  getCurrentUser,
  getDashboardPathForRole,
  logoutUser,
  notifyAccountDisabled,
  notifyIfAccountDisabled,
  refreshAccessToken,
  restoreAuthSession,
  setAccessToken,
  setCurrentUser,
  subscribeAccountDisabled,
} from './authSession'
export type { AccountStatus, AuthUser, UserRole } from './authSession'
export { createApiClient, ApiError } from './client'
