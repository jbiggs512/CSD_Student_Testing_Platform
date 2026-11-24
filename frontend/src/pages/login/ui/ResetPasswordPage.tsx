import { useState, type ReactNode, type SubmitEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CheckCircle2Icon } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AuthSplitLayout,
  Button,
  Label,
  PasswordInput,
} from '@shared/components'
import { LoginApiError, resetPassword } from '../api'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const message = await resetPassword(token, newPassword)
      setSuccessMessage(message)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      if (error instanceof LoginApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Unable to reset your password. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const missingTokenError = !token
    ? 'This password reset link is missing or invalid. Please request a new one.'
    : null

  let content: ReactNode
  if (successMessage) {
    content = (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2Icon aria-hidden="true" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
        <Button
          asChild
          size="lg"
          className="w-full bg-navy text-white hover:bg-navy/90"
        >
          <Link to="/login">Sign In</Link>
        </Button>
      </div>
    )
  } else if (!token) {
    content = (
      <Button
        asChild
        size="lg"
        className="w-full bg-navy text-white hover:bg-navy/90"
      >
        <Link to="/forgot-password">Request New Reset Link</Link>
      </Button>
    )
  } else {
    content = (
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New Password</Label>
          <PasswordInput
            id="new-password"
            name="new_password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <PasswordInput
            id="confirm-password"
            name="confirm_password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="mt-2 w-full bg-navy text-white hover:bg-navy/90"
        >
          {isSubmitting ? 'Resetting password...' : 'Reset Password'}
        </Button>
      </form>
    )
  }

  return (
    <AuthSplitLayout
      id="reset-password-page"
      title="Reset Password"
      subtitle="Choose a new password for your account."
      headerPromptText="Back to sign in?"
      headerActionLabel="Login"
      headerActionTo="/login"
      errorMessage={errorMessage ?? missingTokenError}
    >
      {content}
    </AuthSplitLayout>
  )
}
