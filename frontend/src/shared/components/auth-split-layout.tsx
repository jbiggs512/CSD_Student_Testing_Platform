import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { TriangleAlert } from 'lucide-react'
import { AuthHeroPanel } from './auth-hero-panel'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

interface AuthSplitLayoutProps {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly headerPromptText: string
  readonly headerActionLabel: string
  readonly headerActionTo: string
  readonly errorMessage?: string | null
  readonly children: ReactNode
}

/**
 * Shared full-screen split layout for authentication pages (Login & Register),
 * pairing the left branding artwork panel with a slide-in form card on the right.
 */
export function AuthSplitLayout({
  id,
  title,
  subtitle,
  headerPromptText,
  headerActionLabel,
  headerActionTo,
  errorMessage,
  children,
}: Readonly<AuthSplitLayoutProps>) {
  return (
    <main
      id={id}
      className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden"
    >
      <section className="relative flex w-full p-3 sm:p-4 lg:h-screen lg:p-5">
        <AuthHeroPanel />
      </section>

      <section className="relative z-10 flex flex-1 flex-col justify-between bg-background px-6 py-6 sm:px-10 lg:h-screen lg:animate-[slide-in-from-right_0.7s_cubic-bezier(0.22,1,0.36,1)_both] lg:overflow-y-auto motion-reduce:animate-none">
        <header className="flex items-center justify-end gap-4">
          <p className="max-w-44 text-xs leading-snug text-navy sm:text-sm">
            {headerPromptText}
          </p>
          <Button asChild className="px-5 font-semibold shadow-sm">
            <Link to={headerActionTo}>{headerActionLabel}</Link>
          </Button>
        </header>

        <div className="mx-auto my-auto w-full max-w-md py-8">
          <h1 className="text-center font-heading text-4xl font-bold tracking-tight text-navy sm:text-5xl">
            {title}
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground sm:text-base">
            {subtitle}
          </p>

          {errorMessage && (
            <Alert variant="destructive" aria-live="polite" className="mt-6">
              <TriangleAlert aria-hidden="true" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Card className="mt-6 rounded-xl border-border bg-card py-6 shadow-xs">
            <CardContent>{children}</CardContent>
          </Card>
        </div>

        {/* Balances the top header in flex-col justify-between so the form card stays vertically centered on desktop. */}
        <div aria-hidden="true" className="hidden lg:block" />
      </section>
    </main>
  )
}

