import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/utils"

const alertVariants = cva(
  "relative flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium shadow-xs [&>svg]:size-5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border border-border",
        destructive: "bg-orange text-navy [&>svg]:text-navy",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm leading-snug", className)}
      {...props}
    />
  )
}

export { Alert, AlertDescription }

