import { useState, type ReactNode, type SubmitEvent } from 'react'
import { AlertCircleIcon, CheckCircle2Icon, LoaderCircleIcon } from 'lucide-react'
import { fetchWithAuthRetry, getAccessToken } from '@/shared/api'
import { API_BASE_URL } from '@/shared/config'
import { Alert, AlertDescription } from './alert'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Label } from './label'
import { PasswordInput } from './password-input'

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: Readonly<ChangePasswordDialogProps>) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setErrorMessage(null)
      setSuccessMessage(null)
    }
    onOpenChange(nextOpen)
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!currentPassword) {
      setErrorMessage('Current password is required.')
      return
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.')
      return
    }

    const token = getAccessToken()
    if (!token) {
      setErrorMessage('Your session has expired. Please sign in again.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetchWithAuthRetry(
        `${API_BASE_URL}/auth/change-password`,
        token,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        },
      )

      let body: { message?: unknown; detail?: unknown } = {}
      try {
        body = (await response.json()) as { message?: unknown; detail?: unknown }
      } catch {
        // Non-JSON responses fall back to the default messages below.
      }

      if (!response.ok) {
        const detail =
          typeof body.detail === 'string' && body.detail.trim()
            ? body.detail
            : 'Unable to update password.'
        setErrorMessage(detail)
        return
      }

      setSuccessMessage(
        typeof body.message === 'string' && body.message.trim()
          ? body.message
          : 'Password updated successfully.',
      )
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setErrorMessage('Unable to connect to the server. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  let bodyContent: ReactNode
  if (successMessage) {
    bodyContent = (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2Icon aria-hidden="true" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="bg-navy text-white hover:bg-navy/90"
          >
            Done
          </Button>
        </DialogFooter>
      </div>
    )
  } else {
    bodyContent = (
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircleIcon aria-hidden="true" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current Password</Label>
          <PasswordInput
            id="current-password"
            name="current_password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="change-new-password">New Password</Label>
          <PasswordInput
            id="change-new-password"
            name="new_password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="change-confirm-password">Confirm New Password</Label>
          <PasswordInput
            id="change-confirm-password"
            name="confirm_password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSaving}
          />
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-navy text-white hover:bg-navy/90"
          >
            {isSaving && (
              <LoaderCircleIcon
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            )}
            {isSaving ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogFooter>
      </form>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-bold text-navy">
            Change Password
          </DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>
        {bodyContent}
      </DialogContent>
    </Dialog>
  )
}
