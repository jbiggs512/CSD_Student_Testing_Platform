import { useState, type SubmitEvent } from 'react'
import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-react'
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

const INITIAL_VALUES = { current: '', next: '', confirm: '' }

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: Readonly<ChangePasswordDialogProps>) {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setValues(INITIAL_VALUES)
      setError(null)
      setSuccess(null)
    }
    onOpenChange(nextOpen)
  }

  function validate(): string | null {
    if (!values.current) return 'Current password is required.'
    if (values.next.length < 8) return 'New password must be at least 8 characters long.'
    if (values.next !== values.confirm) return 'New passwords do not match.'
    return null
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const validationError = validate()
    if (validationError) return setError(validationError)

    const token = getAccessToken()
    if (!token) return setError('Your session has expired. Please sign in again.')

    setIsSaving(true)
    try {
      const response = await fetchWithAuthRetry(`${API_BASE_URL}/auth/change-password`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: values.current, new_password: values.next }),
      })
      const body = (await response.json().catch(() => ({}))) as { message?: string; detail?: string }
      if (!response.ok) return setError(body.detail?.trim() || 'Unable to update password.')

      setSuccess(body.message?.trim() || 'Password updated successfully.')
      setValues(INITIAL_VALUES)
    } catch {
      setError('Unable to connect to the server. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-navy">
            Change Password
          </DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2Icon aria-hidden="true" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)} className="bg-navy text-white hover:bg-navy/90">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertCircleIcon aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current Password</Label>
              <PasswordInput id="current-password" autoComplete="current-password" value={values.current} onChange={(e) => setValues({ ...values, current: e.target.value })} disabled={isSaving} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="change-new-password">New Password</Label>
                <PasswordInput id="change-new-password" autoComplete="new-password" placeholder="At least 8 characters" value={values.next} onChange={(e) => setValues({ ...values, next: e.target.value })} disabled={isSaving} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="change-confirm-password">Confirm New Password</Label>
                <PasswordInput id="change-confirm-password" autoComplete="new-password" placeholder="Re-enter password" value={values.confirm} onChange={(e) => setValues({ ...values, confirm: e.target.value })} disabled={isSaving} />
              </div>
            </div>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-navy text-white hover:bg-navy/90">
                {isSaving ? 'Updating...' : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
