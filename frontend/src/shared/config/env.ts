const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1'

/**
 * Normalizes VITE_API_URL so both `http://.../api` (from frontend/.env.example)
 * and `http://.../api/v1` (from docker-compose.yml) resolve to the v1 API prefix.
 */
export function resolveApiBaseUrl(rawUrl?: string): string {
  let trimmed = rawUrl?.trim() ?? ''
  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1)
  }
  if (!trimmed) {
    return DEFAULT_API_BASE_URL
  }
  return trimmed.endsWith('/api') ? `${trimmed}/v1` : trimmed
}

export const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_URL as string | undefined,
)
