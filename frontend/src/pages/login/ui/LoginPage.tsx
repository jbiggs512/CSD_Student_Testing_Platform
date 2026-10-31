import { useState, type SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Eye, EyeOff, TriangleAlert } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from '@shared/components'
import { LoginApiError, loginWithCredentials } from '../api'
import { getDashboardPathForRole } from '../model'
import { LoginHeroPanel } from './LoginHeroPanel'

export function LoginPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <main
      id="login-page"
      className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden"
    >
      <section className="relative flex w-full p-3 sm:p-4 lg:h-screen lg:p-5">
        <LoginHeroPanel />
      </section>

      <section className="relative z-10 flex flex-1 flex-col justify-between bg-background px-6 py-6 sm:px-10 lg:h-screen lg:animate-[slide-in-from-right_0.7s_cubic-bezier(0.22,1,0.36,1)_both] lg:overflow-y-auto motion-reduce:animate-none">
        <header className="flex items-center justify-end gap-4">
          <p className="max-w-44 text-xs leading-snug text-navy sm:text-sm">
            Don&apos;t have an account? Register now!
          </p>
          <Button asChild className="px-5 font-semibold shadow-sm">
            <Link to="/register">Register</Link>
          </Button>
        </header>

        <div className="mx-auto my-auto w-full max-w-md py-8">
          <h1 className="text-center font-heading text-4xl font-bold tracking-tight text-navy sm:text-5xl">
            Login to Altius
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground sm:text-base">
            Welcome back!
          </p>

          {errorMessage && (
            <Alert variant="destructive" aria-live="polite" className="mt-6">
              <TriangleAlert aria-hidden="true" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Card className="mt-6 rounded-xl border-border bg-card py-6 shadow-xs">
            <CardContent>
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
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isSubmitting}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-navy"
                    >
                      {showPassword ? (
                        <Eye className="size-4" aria-hidden="true" />
                      ) : (
                        <EyeOff className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
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
            </CardContent>
          </Card>
        </div>

        {/* Balances the top header in flex-col justify-between so the login card stays vertically centered on desktop. */}
        <div aria-hidden="true" className="hidden lg:block" />
      </section>
    </main>
  )
}
