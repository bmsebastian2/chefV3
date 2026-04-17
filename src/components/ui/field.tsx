import * as React from "react"

import { cn } from "@/lib/utils"

type FieldProps = {
  children: React.ReactNode
  className?: string
}

function Field({ children, className, ...props }: FieldProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  )
}

function FieldGroup({
  children,
  className,
  ...props
}: FieldProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)} {...props}>
      {children}
    </div>
  )
}

export { Field, FieldGroup }
