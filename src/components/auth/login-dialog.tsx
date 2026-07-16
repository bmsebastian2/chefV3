'use client'

import { useState, useEffect, useId } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft, MailCheck, X, Loader2 } from 'lucide-react'
import { login, loginWithGoogle, requestPasswordReset } from '@/app/auth/actions'
import { createClient } from '@/utils/supabase/clients'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CLOSE_MS = 220

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function LoginDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(() =>
    typeof window !== 'undefined' && window.location.search.includes('login=true')
  )
  const [view, setView] = useState<'login' | 'forgot'>('login')
  // Controlado a propósito: React 19 resetea los campos no controlados al
  // terminar la action, y con un login fallido eso obligaba a retipear el mail.
  // La contraseña sigue sin controlar, así se limpia sola tras el error.
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checking, setChecking] = useState(false)
  const [entered, setEntered] = useState(false)
  const [loginState, loginAction, isPending] = useActionState(login, null)
  const [resetState, resetAction, isResetting] = useActionState(requestPasswordReset, null)
  const titleId = useId()

  // Antes de mostrar el formulario, verificar si ya hay sesión activa.
  // Si la hay, redirigir al dashboard según el rol en vez de abrir el modal.
  async function handleOpenChange(o: boolean) {
    if (!o) {
      setEntered(false)
      const finish = () => {
        setOpen(false)
        setView('login') // al cerrar, volver siempre a la vista de login
      }
      if (prefersReducedMotion()) finish()
      else setTimeout(finish, CLOSE_MS)
      return
    }

    setChecking(true)
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      // Token de refresco inválido/ausente (cookie obsoleta): limpiar la sesión
      // local para detener los reintentos de auto-refresh y abrir el formulario.
      if (error) {
        await supabase.auth.signOut({ scope: 'local' })
        setOpen(true)
        return
      }

      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (userData?.role === 'chef') {
          router.push('/dashboard')
          return
        }
        if (userData?.role === 'client') {
          router.push('/client-dashboard')
          return
        }
        // Rol desconocido/null → continuar al formulario de login.
      }

      setOpen(true)
    } catch {
      // Ante cualquier error de verificación, abrir el formulario igualmente.
      setOpen(true)
    } finally {
      setChecking(false)
    }
  }

  // Dispara la transición de entrada un frame después de montar el panel.
  useEffect(() => {
    if (!open) {
      setEntered(false)
      return
    }
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const hasLoginError = Boolean(loginState?.error)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            disabled={checking}
            variant="ghost"
            className="h-8 rounded-[4px] border-zinc-200 bg-white px-4 text-base text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-70"
          >
            {checking ? 'Verificando…' : 'Acceder'}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        aria-labelledby={titleId}
        className={[
          // Mobile: bottom-sheet anclado abajo. Desktop: vuelve al flujo del
          // wrapper de DialogContent, que ya centra con flex — así el transform
          // queda libre para la animación.
          // z-10 basta: el wrapper de DialogContent ya crea el contexto de
          // apilamiento, así que acá solo hay que ganarle al scrim hermano.
          'fixed inset-x-0 bottom-0 z-10 w-full max-w-none',
          'sm:relative sm:bottom-auto sm:left-auto sm:right-auto sm:w-full sm:max-w-[420px]',
          'max-h-[92svh] overflow-y-auto',
          'rounded-none rounded-t-[4px] sm:rounded-[4px]',
          'border-0 border-t border-zinc-200 sm:border',
          'bg-white',
          'p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-8 sm:pb-8',
          'shadow-[0_-8px_40px_rgba(24,24,27,0.12)] sm:shadow-[0_24px_80px_rgba(24,24,27,0.16)]',
          'transform-gpu transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          entered
            ? 'translate-y-0 opacity-100 sm:scale-100'
            : 'translate-y-full opacity-0 sm:translate-y-0 sm:scale-[0.98] motion-reduce:translate-y-0 motion-reduce:scale-100',
        ].join(' ')}
      >
        {/* Cierre */}
        <button
          type="button"
          onClick={() => handleOpenChange(false)}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-[4px] p-1 text-zinc-400 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>

        {view === 'login' ? (
          <>
            {/* Header */}
            <div className="text-center">
              <Eyebrow>Acceso</Eyebrow>
              <h2
                id={titleId}
                className="mt-4 font-serif text-[28px] italic leading-[1.15] text-zinc-900"
              >
                Accedé a tu cuenta
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                Si sos cliente, gestioná tu solicitud.<br />
                Si sos Chef, gestioná tus servicios, platos y menús.
              </p>
            </div>

            <Rule className="my-6" />

            <form action={loginAction}>
              <div inert={isPending} className={isPending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                <div className="space-y-4">
                  {/* Email */}
                  <Field label="Email" htmlFor="login-email">
                    <FieldShell invalid={hasLoginError}>
                      <SheetInput
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={hasLoginError}
                        aria-describedby={hasLoginError ? 'login-error' : undefined}
                      />
                    </FieldShell>
                  </Field>

                  {/* Contraseña */}
                  <Field label="Contraseña" htmlFor="login-password">
                    <FieldShell invalid={hasLoginError}>
                      <SheetInput
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        aria-invalid={hasLoginError}
                        aria-describedby={hasLoginError ? 'login-error' : undefined}
                        className="pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-[4px] p-1.5 text-zinc-400 transition-colors hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </FieldShell>
                  </Field>
                </div>
              </div>

              {/* Error */}
              {loginState?.error && (
                <ErrorNote id="login-error">{loginState.error}</ErrorNote>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[4px] bg-accent text-[15px] font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-[filter,opacity] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:opacity-70"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isPending ? 'Accediendo…' : 'Acceder'}
              </button>
            </form>

            {/* Recuperar contraseña */}
            <p className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setView('forgot')}
                className="rounded-[4px] text-[13px] text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </p>

            {/* Divisor */}
            <div className="my-5 flex items-center gap-4">
              <span className="h-px flex-1 bg-zinc-200" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">o</span>
              <span className="h-px flex-1 bg-zinc-200" />
            </div>

            {/* Google */}
            <form action={loginWithGoogle}>
              <button
                type="submit"
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[4px] border border-zinc-300 bg-white text-[15px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
              >
                <GoogleIcon />
                Continuar con Google
              </button>
            </form>
          </>
        ) : (
          /* ── Vista: recuperar contraseña ─────────────────────────────── */
          <>
            <button
              type="button"
              onClick={() => setView('login')}
              className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-[4px] p-1 text-[13px] text-zinc-400 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </button>

            {resetState?.success ? (
              <div className="pt-6 text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-[4px] bg-accent/10">
                  <MailCheck className="h-5 w-5 text-accent" />
                </div>
                <Eyebrow>Enlace enviado</Eyebrow>
                <h2 id={titleId} className="mt-4 font-serif text-[28px] italic leading-[1.15] text-zinc-900">
                  Revisá tu email
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                  Si existe una cuenta con ese correo, te enviamos un enlace para
                  restablecer tu contraseña. Revisá tu bandeja de entrada y el spam.
                </p>
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="mt-6 h-[52px] w-full rounded-[4px] bg-accent text-[15px] font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <div className="pt-6 text-center">
                  <Eyebrow>Recuperar</Eyebrow>
                  <h2 id={titleId} className="mt-4 font-serif text-[28px] italic leading-[1.15] text-zinc-900">
                    Recuperá tu contraseña
                  </h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                    Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.
                  </p>
                </div>

                <Rule className="my-6" />

                <form action={resetAction}>
                  <div inert={isResetting} className={isResetting ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    <Field label="Email" htmlFor="reset-email">
                      <FieldShell invalid={Boolean(resetState?.error)}>
                        <SheetInput
                          id="reset-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          aria-invalid={Boolean(resetState?.error)}
                          aria-describedby={resetState?.error ? 'reset-error' : undefined}
                        />
                      </FieldShell>
                    </Field>
                  </div>

                  {resetState?.error && (
                    <ErrorNote id="reset-error">{resetState.error}</ErrorNote>
                  )}

                  <button
                    type="submit"
                    disabled={isResetting}
                    className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[4px] bg-accent text-[15px] font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-[filter,opacity] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:opacity-70"
                  >
                    {isResetting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {isResetting ? 'Enviando…' : 'Enviar enlace'}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ── Piezas de la ficha ──────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">
      <span className="h-px w-5 bg-accent/60" aria-hidden="true" />
      {children}
      <span className="h-px w-5 bg-accent/60" aria-hidden="true" />
    </span>
  )
}

function Rule({ className }: { className?: string }) {
  return <div className={`h-px bg-zinc-200 ${className ?? ''}`} aria-hidden="true" />
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

// Contenedor del campo: la regla ocre baja al enfocar, como quien subraya
// un nombre en la ficha de reserva.
function FieldShell({
  invalid,
  children,
}: {
  invalid?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={[
        'group relative overflow-hidden rounded-[4px] border bg-zinc-50/80 transition-colors',
        'focus-within:bg-white',
        invalid ? 'border-red-300' : 'border-zinc-200 focus-within:border-zinc-300',
      ].join(' ')}
    >
      {children}
      <span
        aria-hidden="true"
        className={[
          'pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-300 ease-out group-focus-within:scale-x-100 motion-reduce:transition-none',
          invalid ? 'bg-red-600' : 'bg-accent',
        ].join(' ')}
      />
    </div>
  )
}

// Neutraliza el ring y el borde por defecto del Input base: acá el foco lo
// comunica la regla inferior de FieldShell.
function SheetInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={[
        'h-[52px] rounded-none border-0 bg-transparent px-4 text-[15px] text-zinc-900 md:text-[15px]',
        'placeholder:text-zinc-400',
        'focus-visible:border-0 focus-visible:ring-0',
        'aria-invalid:border-0 aria-invalid:ring-0',
        className ?? '',
      ].join(' ')}
    />
  )
}

function ErrorNote({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-4 rounded-r-[4px] border-l-2 border-red-600 bg-red-50 px-3 py-2 text-[13px] leading-relaxed text-red-800"
    >
      {children}
    </p>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
