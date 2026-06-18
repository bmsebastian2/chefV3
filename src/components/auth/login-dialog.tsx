'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft, MailCheck } from 'lucide-react'
import { login, loginWithGoogle, requestPasswordReset } from '@/app/auth/actions'
import { createClient } from '@/utils/supabase/clients'
import {
  Dialog,
  DialogContent,
  DialogTrigger,DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(() =>
    typeof window !== 'undefined' && window.location.search.includes('login=true')
  )
  const [view, setView] = useState<'login' | 'forgot'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [checking, setChecking] = useState(false)
  const [loginState, loginAction, isPending] = useActionState(login, null)
  const [resetState, resetAction, isResetting] = useActionState(requestPasswordReset, null)

  // Antes de mostrar el formulario, verificar si ya hay sesión activa.
  // Si la hay, redirigir al dashboard según el rol en vez de abrir el modal.
  async function handleOpenChange(o: boolean) {
    if (!o) {
      setOpen(false)
      setView('login') // al cerrar, volver siempre a la vista de login
      return
    }

    setChecking(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

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

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger asChild>
        {trigger ?? <Button disabled={checking} className="h-8 px-4 text-base bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm rounded-md transition-all disabled:opacity-70" variant="ghost">{checking ? 'Verificando…' : 'Acceder'}</Button>}
      </DialogTrigger>
 <DialogContent className="fixed top-1/2 left-1/2 z-[9999] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl p-10 bg-white shadow-lg">

       {/* Botón de cierre */}
    <DialogClose asChild>
      <button className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-700">
        ✕
      </button>
    </DialogClose>

        {view === 'login' ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-medium text-accent">Accedé a tu cuenta</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Si sos cliente, gestioná tu solicitud.<br />
                Si sos Chef, gestioná tus servicios, platos y menús.
              </p>
            </div>

            <form className="space-y-3" action={loginAction}>

              {/* Email */}
              <Input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="Email *"
                required
                className="rounded-full px-5 h-12 bg-muted border-0"
              />

              {/* Password */}
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Contraseña *"
                  required
                  className="rounded-full px-5 h-12 bg-muted border-0 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Error */}
              {loginState?.error && (
                <p className="text-sm text-red-500 text-center">{loginState.error}</p>
              )}

              {/* Submit */}
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-2xl bg-accent hover:bg-accent/90 text-zinc-900 font-bold text-base disabled:opacity-50 shadow-[0_6px_18px_rgba(34,197,94,0.25)] transition-all"
                >
                  {isPending ? <span className="animate-pulse">Accediendo...</span> : 'Acceder'}
                </Button>
              </div>

            </form>

            {/* Forgot password */}
            <p className="text-center text-sm mt-3">
              <button
                type="button"
                onClick={() => setView('forgot')}
                className="underline text-foreground hover:text-accent"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </p>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">O continuar con</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google */}
            <div className="flex justify-center gap-3">
              <form action={loginWithGoogle}>
                <button
                  type="submit"
                  className="w-16 h-16 rounded-2xl border border-border flex items-center justify-center hover:bg-muted transition"
                >
                  <GoogleIcon />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* ── Vista: recuperar contraseña ─────────────────────────────── */
          <>
            <button
              type="button"
              onClick={() => setView('login')}
              className="absolute left-4 top-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>

            {resetState?.success ? (
              <div className="text-center pt-2">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                  <MailCheck className="h-7 w-7 text-accent" />
                </div>
                <h2 className="text-xl font-medium text-accent mb-2">Revisá tu email</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Si existe una cuenta con ese correo, te enviamos un enlace para
                  restablecer tu contraseña. Revisá tu bandeja de entrada y el spam.
                </p>
                <Button
                  type="button"
                  onClick={() => setView('login')}
                  className="mt-6 w-full h-12 rounded-2xl bg-accent hover:bg-accent/90 text-zinc-900 font-bold text-base transition-all"
                >
                  Volver al inicio de sesión
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-medium text-accent">Recuperá tu contraseña</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.
                  </p>
                </div>

                <form className="space-y-3" action={resetAction}>
                  <Input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email *"
                    required
                    className="rounded-full px-5 h-12 bg-muted border-0"
                  />

                  {resetState?.error && (
                    <p className="text-sm text-red-500 text-center">{resetState.error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={isResetting}
                    className="w-full h-12 rounded-2xl bg-accent hover:bg-accent/90 text-zinc-900 font-bold text-base disabled:opacity-50 shadow-[0_6px_18px_rgba(34,197,94,0.25)] transition-all"
                  >
                    {isResetting ? <span className="animate-pulse">Enviando…</span> : 'Enviar enlace'}
                  </Button>
                </form>
              </>
            )}
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}

function GoogleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
