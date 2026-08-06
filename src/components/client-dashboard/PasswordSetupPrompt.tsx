'use client'

import { useActionState, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { KeyRound, Mail, X } from 'lucide-react'
import { PASSWORD_REQUIREMENTS, validatePassword } from '@/lib/password'
import { setInitialPassword, skipPasswordSetup } from '@/app/client-dashboard/actions'

type View = 'choice' | 'form'

/**
 * Prompt de una sola vez, en el primer ingreso de un cliente creado desde el
 * wizard con contraseña random: no la conoce, así que la elección real es
 * "crear una propia" vs "seguir con el enlace por email" — nunca "quedarse
 * con la random". El cierre con X solo pospone (vuelve a aparecer en la
 * próxima visita); las dos acciones explícitas marcan password_set=true y no
 * vuelve a mostrarse.
 */
export function PasswordSetupPrompt() {
  const [visible, setVisible] = useState(true)
  const [view, setView] = useState<View>('choice')
  const [isPending, startTransition] = useTransition()
  const [state, formAction, isSaving] = useActionState(setInitialPassword, null)

  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const passwordsMatch = repeatPassword.length === 0 || newPassword === repeatPassword

  if (!visible) return null

  function handleSkip() {
    startTransition(async () => {
      await skipPasswordSetup()
      setVisible(false)
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const { valid, message } = validatePassword(newPassword)
    if (!valid) {
      setLocalError(message)
      e.preventDefault()
      return
    }
    if (newPassword !== repeatPassword) {
      setLocalError('Las contraseñas no coinciden.')
      e.preventDefault()
      return
    }
    setLocalError('')
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setVisible(false) }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={() => setVisible(false)}
          aria-label="Ahora no"
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {state?.success ? (
          <div className="text-center py-4">
            <h2 className="font-serif text-xl font-semibold text-zinc-900 mb-2">
              Listo, ya tenés contraseña
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              La próxima vez podés entrar con tu email y esta contraseña, o seguir usando el enlace.
            </p>
            <button
              onClick={() => setVisible(false)}
              className="w-full py-3 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Continuar
            </button>
          </div>
        ) : view === 'choice' ? (
          <>
            <h2 className="font-serif text-xl font-semibold text-zinc-900 mb-2">
              ¿Querés crear una contraseña?
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              Hoy entrás con el enlace que te llegó por email. Si querés, podés crear una
              contraseña propia para entrar más rápido la próxima vez — o seguir usando el
              enlace, como hasta ahora.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setView('form')}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                <KeyRound className="w-4 h-4 shrink-0" />
                Crear una contraseña
              </button>
              <button
                onClick={handleSkip}
                disabled={isPending}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-full border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-40"
              >
                <Mail className="w-4 h-4 shrink-0" />
                {isPending ? 'Guardando…' : 'Seguir con el enlace por email'}
              </button>
            </div>
          </>
        ) : (
          <form action={formAction} onSubmit={handleSubmit}>
            <h2 className="font-serif text-xl font-semibold text-zinc-900 mb-6">
              Creá tu contraseña
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  name="newPassword"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                />
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {PASSWORD_REQUIREMENTS.map((req) => {
                    const met = req.test(newPassword)
                    return (
                      <li
                        key={req.id}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          met ? 'text-accent' : 'text-zinc-400'
                        }`}
                      >
                        <span aria-hidden="true">{met ? '✓' : '○'}</span>
                        {req.label}
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Repetir contraseña
                </label>
                <input
                  type="password"
                  name="repeatPassword"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                />
                {repeatPassword.length > 0 && (
                  <p className={`mt-2 text-xs ${passwordsMatch ? 'text-accent' : 'text-red-500'}`}>
                    {passwordsMatch ? '✓ Coinciden' : '✗ Las contraseñas no coinciden'}
                  </p>
                )}
              </div>
            </div>

            {(localError || state?.error) && (
              <p className="text-sm text-red-600 mt-4">{localError || state?.error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setView('choice')}
                disabled={isSaving}
                className="flex-1 py-3 rounded-full border border-accent text-accent text-sm font-medium hover:bg-accent/5 transition-colors disabled:opacity-40"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40"
              >
                {isSaving ? 'Guardando…' : 'Guardar y continuar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
