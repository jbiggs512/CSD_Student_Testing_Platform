import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { logoutUser, subscribeAccountDisabled } from '@shared/api'
import { ErrorBoundary } from './error-boundary'
import { ErrorPage } from './error-page'

interface AppProtectionProps {
  readonly children: ReactNode
}

const PUBLIC_PATHS = new Set(['/', '/login', '/register'])

/**
 * Shared protection boundary that wraps application routes to catch:
 * - Account-level auth errors (e.g., disabled accounts) and offer return to login
 * - Unexpected React rendering errors via ErrorBoundary
 */
export function AppProtection({ children }: AppProtectionProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [disabledMessage, setDisabledMessage] = useState<string | null>(null)
  const [isReturning, setIsReturning] = useState(false)

  useEffect(() => {
    return subscribeAccountDisabled((message) => {
      setDisabledMessage(message)
    })
  }, [])

  // Clear any stale disabled-account block once the user is on a public route.
  useEffect(() => {
    if (PUBLIC_PATHS.has(location.pathname)) {
      setDisabledMessage(null)
    }
  }, [location.pathname])

  async function handleReturnToLogin() {
    if (isReturning) return
    setIsReturning(true)
    try {
      await logoutUser()
    } finally {
      setIsReturning(false)
      setDisabledMessage(null)
      navigate('/login', { replace: true })
    }
  }

  return (
    <ErrorBoundary
      resetKey={location.pathname}
      onReturnToLogin={handleReturnToLogin}
    >
      {disabledMessage !== null ? (
        <ErrorPage
          statusCode={403}
          title="Account Disabled"
          message={`${disabledMessage} Please contact an administrator or return to the login page.`}
          primaryActionLabel={
            isReturning ? 'Returning to Login...' : 'Return to Login'
          }
          onPrimaryAction={() => void handleReturnToLogin()}
          isPrimaryActionPending={isReturning}
        />
      ) : (
        children
      )}
    </ErrorBoundary>
  )
}
