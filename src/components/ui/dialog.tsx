"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type DialogContextValue = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("Dialog components must be used inside a <Dialog />")
  }
  return context
}

function Dialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

function DialogTrigger({
  children,
  asChild = false,
  className,
  ...props
}: {
  children: React.ReactNode
  asChild?: boolean
  className?: string
} & React.HTMLAttributes<HTMLElement>) {
  const { setOpen } = useDialogContext()

  const handleClick = () => setOpen(true)

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>
    const existingOnClick = child.props.onClick

    return React.cloneElement(child, {
      ...props,
      className: cn(child.props.className, className),
      onClick: (event) => {
        existingOnClick?.(event)
        handleClick()
      },
    })
  }

  return (
    <button
      type="button"
      className={cn("inline-flex items-center", className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}

function DialogClose({
  children,
  asChild = false,
  className,
  ...props
}: {
  children: React.ReactNode
  asChild?: boolean
  className?: string
} & React.HTMLAttributes<HTMLElement>) {
  const { setOpen } = useDialogContext()

  const handleClose = () => setOpen(false)

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>
    const existingOnClick = child.props.onClick

    return React.cloneElement(child, {
      ...props,
      className: cn(child.props.className, className),
      onClick: (event) => {
        existingOnClick?.(event)
        handleClose()
      },
    })
  }

  return (
    <button
      type="button"
      className={cn("inline-flex items-center", className)}
      onClick={handleClose}
      {...props}
    >
      {children}
    </button>
  )
}

function DialogContent({
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = useDialogContext()

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-background p-6 shadow-xl shadow-slate-950/10",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

function DialogHeader({
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2 text-center sm:text-left", className)} {...props}>
      {children}
    </div>
  )
}

function DialogTitle({
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props}>
      {children}
    </h2>
  )
}

function DialogDescription({
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  )
}

function DialogFooter({
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)} {...props}>
      {children}
    </div>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
