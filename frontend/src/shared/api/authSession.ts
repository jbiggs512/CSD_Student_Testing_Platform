/**
 * Holds the short-lived JWT access token in memory rather than localStorage
 * to avoid XSS exposure. Session persistence across page reloads relies on the
 * backend's HttpOnly refresh_token cookie.
 */
let currentAccessToken: string | null = null

export function getAccessToken(): string | null {
  return currentAccessToken
}

export function setAccessToken(token: string | null): void {
  currentAccessToken = token
}

export function clearAccessToken(): void {
  currentAccessToken = null
}
