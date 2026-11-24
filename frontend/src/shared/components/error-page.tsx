import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card'

export interface ErrorPageProps {
  readonly title: string
  readonly message: string
  readonly statusCode?: number | string
  readonly variant?: 'destructive' | 'default'
  readonly primaryActionLabel?: string
  readonly onPrimaryAction?: () => void
  readonly isPrimaryActionPending?: boolean
  readonly secondaryActionLabel?: string
  readonly onSecondaryAction?: () => void
}

/**
 * Shared full-screen error and protection page used for account blocks,
 * unexpected runtime errors, and missing routes.
 */
export function ErrorPage({
  title,
  message,
  statusCode,
  variant = 'destructive',
  primaryActionLabel,
  onPrimaryAction,
  isPrimaryActionPending = false,
  secondaryActionLabel,
  onSecondaryAction,
}: ErrorPageProps) {
  const isDestructive = variant === 'destructive'
  const Icon = isDestructive ? ShieldAlert : AlertTriangle

  return (
    <main
      role={isDestructive ? 'alert' : undefined}
      className="flex min-h-screen items-center justify-center bg-background px-4 py-12"
    >
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={
                isDestructive
                  ? 'flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive'
                  : 'flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-navy'
              }
            >
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <div>
              {statusCode !== undefined && (
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Error {statusCode}
                </p>
              )}
              <CardTitle className="font-heading text-xl text-navy">
                {title}
              </CardTitle>
            </div>
          </div>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent />
        {(primaryActionLabel || secondaryActionLabel) && (
          <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {secondaryActionLabel && onSecondaryAction && (
              <Button
                type="button"
                variant="outline"
                onClick={onSecondaryAction}
                disabled={isPrimaryActionPending}
              >
                {secondaryActionLabel}
              </Button>
            )}
            {primaryActionLabel && onPrimaryAction && (
              <Button
                type="button"
                variant={isDestructive ? 'destructive' : 'default'}
                onClick={onPrimaryAction}
                disabled={isPrimaryActionPending}
              >
                {primaryActionLabel}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </main>
  )
}
