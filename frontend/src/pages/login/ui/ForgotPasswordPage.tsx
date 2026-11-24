import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import { CheckCircle2Icon } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AuthSplitLayout,
  Button,
  Input,
  Label,
} from '@shared/components'
import { LoginApiError, requestPasswordReset } from '../api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedEmail = email.trim()
    if (!trimmedEmail?.includes('@')) {
      setErrorMessage('Please enter a valid email address.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const message = await requestPasswordReset(trimmedEmail)
      setSuccessMessage(message)
      setEmail('')
    } catch (error) {
      if (error instanceof LoginApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Unable to send password reset email. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout
      id="forgot-password-page"
      title="Forgot Password"
      subtitle="Enter your email and we'll send you a reset link."
      headerPromptText="Remembered your password?"
      headerActionLabel="Login"
      headerActionTo="/login"
      errorMessage={errorMessage}
    >
      {successMessage ? (
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
            <Link to="/login">Back to Login</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="mt-2 w-full bg-navy text-white hover:bg-navy/90"
          >
            {isSubmitting ? 'Sending reset link...' : 'Send Reset Link'}
          </Button>
        </form>
      )}
    </AuthSplitLayout>
  )
}
