import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AlertTriangle } from 'lucide-react'
import { logoutUser, subscribeAccountDisabled } from '@shared/api'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

/**
 * Global error dialog shown whenever an authenticated API request fails
 * because the user's account has been disabled, offering a direct path back to login.
 */
export function AccountDisabledDialog() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isReturning, setIsReturning] = useState(false)

  useEffect(() => {
    return subscribeAccountDisabled((message) => {
      setErrorMessage(message)
    })
  }, [])

  async function handleReturnToLogin() {
    if (isReturning) return
    setIsReturning(true)
    try {
      await logoutUser()
    } finally {
      setIsReturning(false)
      setErrorMessage(null)
      navigate('/login', { replace: true })
    }
  }

  return (
    <Dialog
      open={errorMessage !== null}
      onOpenChange={(open) => {
        if (!open) {
          setErrorMessage(null)
        }
      }}
    >
      <DialogContent showCloseButton={false} role="alertdialog">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            <DialogTitle>Account Disabled</DialogTitle>
          </div>
          <DialogDescription>
            {errorMessage ?? 'Account has been disabled.'} Please contact an
            administrator or return to the login page.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleReturnToLogin()}
            disabled={isReturning}
          >
            {isReturning ? 'Returning to Login...' : 'Return to Login'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
