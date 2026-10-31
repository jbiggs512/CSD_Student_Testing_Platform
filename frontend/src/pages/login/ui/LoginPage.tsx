import { useState, type SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  AuthSplitLayout,
  Button,
  Input,
  Label,
  PasswordInput,
} from '@shared/components'
import { LoginApiError, loginWithCredentials } from '../api'
import { getDashboardPathForRole } from '../model'

export function LoginPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedUsername = username.trim()
    if (!trimmedUsername || !password) {
      setErrorMessage('Please enter both your username and password.')
      return
    }

    if (trimmedUsername.includes('@')) {
      setErrorMessage(
        'Please sign in with your username, not your email address.',
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const session = await loginWithCredentials({
        username: trimmedUsername,
        password,
      })
      navigate(getDashboardPathForRole(session.user.role))
    } catch (error) {
      if (error instanceof LoginApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Unable to sign in right now. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout
      id="login-page"
      title="Login to Altius"
      subtitle="Welcome back!"
      headerPromptText="Don't have an account? Register now!"
      headerActionLabel="Register"
      headerActionTo="/register"
      errorMessage={errorMessage}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Enter your username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="mt-2 w-full bg-navy text-white hover:bg-navy/90"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>

        <div className="pt-1">
          <Button
            asChild
            variant="link"
            className="h-auto p-0 text-sm font-normal text-navy underline underline-offset-4 hover:text-plum"
          >
            <Link to="/forgot-password">Forgot password?</Link>
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  )
}
