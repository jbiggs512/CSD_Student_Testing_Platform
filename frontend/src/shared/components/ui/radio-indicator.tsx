import { cn } from '@/shared/lib/utils'

interface RadioIndicatorProps {
  selected: boolean
  className?: string
}

export function RadioIndicator({
  selected,
  className,
}: Readonly<RadioIndicatorProps>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
        selected ? 'border-navy' : 'border-slate-300',
        className,
      )}
    >
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-navy" />}
    </span>
  )
}
