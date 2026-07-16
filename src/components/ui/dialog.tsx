"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

type DialogContextValue = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

export function useDialogContext() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("Dialog components must be used inside a <Dialog />")
  }
  return context
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

// Solo lo que se puede ver y enfocar: un elemento oculto no debe recibir el
// foco al tabular.
function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
  )
}

/**
 * Lo que un modal necesita y el navegador no da gratis: Escape, foco atrapado
 * dentro del panel, foco devuelto al cerrar y scroll de fondo bloqueado.
 *
 * Vive suelto y exportado —y no dentro de DialogContent— para que los modales
 * con caparazón propio (los que no pueden usar este primitivo por su layout)
 * compartan esta implementación en vez de escribir la suya.
 */
export function useModalBehavior({
  open,
  onClose,
  panelRef,
}: {
  open: boolean
  onClose: () => void
  panelRef: React.RefObject<HTMLElement | null>
}) {
  // Por referencia: si `onClose` entrara en las dependencias, un callback
  // recreado en cada render (el caso normal: onClose={() => setX(false)})
  // reejecutaría el efecto entero y devolvería el foco al panel mientras el
  // usuario tipea.
  const onCloseRef = React.useRef(onClose)
  React.useEffect(() => {
    onCloseRef.current = onClose
  })

  React.useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    // A quién le devolvemos el foco cuando esto se cierre.
    const abridor = document.activeElement as HTMLElement | null

    panel?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current()
        return
      }
      if (e.key !== "Tab" || !panel) return
      // Sin trampa, tabular se va a la página de atrás —que el overlay tapa— y
      // se termina navegando a ciegas.
      const items = focusables(panel)
      if (!items.length) {
        e.preventDefault()
        panel.focus()
        return
      }
      const primero = items[0]
      const ultimo = items[items.length - 1]
      const activo = document.activeElement
      const fuera = !panel.contains(activo)
      if (e.shiftKey && (activo === primero || fuera)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (activo === ultimo || fuera)) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)

    // Scroll bloqueado, compensando el ancho de la barra para que la página de
    // atrás no pegue un salto lateral al abrir.
    const { overflow, paddingRight } = document.body.style
    const barra = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (barra > 0) document.body.style.paddingRight = `${barra}px`

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      // Solo si sigue vivo: al desmontar por navegación el abridor ya no está
      // en el documento y enfocarlo le robaría el foco a la página nueva.
      if (abridor && document.contains(abridor)) abridor.focus()
    }
  }, [open, panelRef])
}

export function Dialog({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen: React.Dispatch<React.SetStateAction<boolean>> = React.useCallback(
    (val) => {
      const next = typeof val === "function" ? (val as (p: boolean) => boolean)(open) : val
      if (isControlled) onOpenChange?.(next)
      else setInternalOpen(next)
    },
    [isControlled, open, onOpenChange],
  )

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({
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

export function DialogClose({
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

export function DialogContent({
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = useDialogContext()
  const panelRef = React.useRef<HTMLDivElement>(null)

  useModalBehavior({ open, onClose: () => setOpen(false), panelRef })

  if (!open) return null

  return createPortal(
    // z-100: capa propia del modal, por encima del tier z-50 que comparten
    // header, toasts y prompts. Con z-50 el ganador lo decidía el orden de
    // montaje en el DOM y el toast de push llegaba a tapar el diálogo.
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        // tabIndex -1: el panel no entra en el orden de tabulación, pero puede
        // recibir el foco al abrir. outline-none porque el anillo va en los
        // controles de adentro, no en el contenedor.
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-background p-6 shadow-xl shadow-slate-950/10 outline-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export function DialogHeader({
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

export function DialogTitle({
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

export function DialogDescription({
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

export function DialogFooter({
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
