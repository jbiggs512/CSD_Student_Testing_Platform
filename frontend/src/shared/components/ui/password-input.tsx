import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from './button'
import { Input } from './input'

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'>

/**
 * Password input field with an integrated show/hide toggle button, shared
 * across authentication forms (Login, Register, etc.).
 */
export function PasswordInput({
  className,
  ...props
}: Readonly<PasswordInputProps>) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        className={cn('pr-10', className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-navy"
      >
        {showPassword ? (
          <Eye className="size-4" aria-hidden="true" />
        ) : (
          <EyeOff className="size-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  )
}

