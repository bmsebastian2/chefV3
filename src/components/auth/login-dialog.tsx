'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { login, loginWithGoogle } from '@/app/auth/actions'
import {
  Dialog,
  DialogContent,
  DialogTrigger,DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [showPassword, setShowPassword] = useState(false)
  const [loginState, loginAction] = useActionState(login, null)

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? <Button className="h-8 px-4 text-base bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm rounded-md transition-all" variant="ghost">Acceder</Button>}
      </DialogTrigger>
 <DialogContent className="fixed top-1/2 left-1/2 z-[9999] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl p-10 bg-white shadow-lg">
       
       {/* Botón de cierre */}
    <DialogClose asChild>
      <button className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-700">
        ✕
      </button>
    </DialogClose>
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-medium text-amber-600">Accedé a tu cuenta</h2>
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
            placeholder="Email *"
            required
            className="rounded-full px-5 h-12 bg-muted border-0"
          />

          {/* Password */}
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña *"
              required
              className="rounded-full px-5 h-12 bg-muted border-0 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>

          {/* Error */}
          {loginState?.error && (
            <p className="text-sm text-red-500 text-center">{loginState.error}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className=" h-8 px-4 w-full rounded-full h-8 bg-amber-500 hover:bg-amber-600 text-white font-medium"
          >
            Acceder
          </Button>

        </form>

        {/* Forgot password */}
        <p className="text-center text-sm mt-3">
          <button className="underline text-foreground hover:text-amber-600">
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