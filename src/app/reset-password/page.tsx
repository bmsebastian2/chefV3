"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Check, UtensilsCrossed } from "lucide-react";
import { changePassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(changePassword, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-6 py-20">
      <div className="w-full max-w-md">
        {/* Marca */}
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-serif text-2xl font-bold tracking-tight text-zinc-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
            <UtensilsCrossed className="h-4 w-4 text-accent" />
          </span>
          GetChef
        </Link>

        <div className="rounded-3xl bg-white p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.05)] ring-1 ring-zinc-200/80">
          {state?.success ? (
            // ── Éxito ──────────────────────────────────────────────────────
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                <Check className="h-7 w-7 text-accent" />
              </div>
              <h1 className="font-serif text-2xl font-semibold text-zinc-900 mb-2">
                Contraseña actualizada
              </h1>
              <p className="font-sans text-sm text-zinc-500 mb-7 leading-relaxed">
                Tu contraseña se cambió correctamente. Ya podés acceder a tu cuenta.
              </p>
              <Link href="/" className="w-full">
                <Button className="w-full h-12 rounded-2xl bg-accent hover:bg-accent/90 text-white font-bold text-base shadow-[0_6px_18px_rgba(34,197,94,0.25)] transition-all">
                  Ir a mi cuenta
                </Button>
              </Link>
            </div>
          ) : (
            // ── Formulario ─────────────────────────────────────────────────
            <>
              <div className="text-center mb-6">
                <h1 className="font-serif text-2xl font-semibold text-zinc-900">
                  Elegí una nueva contraseña
                </h1>
                <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
                  Introducí tu nueva contraseña. Debe tener al menos 6 caracteres.
                </p>
              </div>

              <form className="space-y-3" action={formAction}>
                {/* Nueva contraseña */}
                <div className="relative">
                  <Input
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Nueva contraseña *"
                    required
                    minLength={6}
                    className="rounded-full px-5 h-12 bg-muted border-0 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Repetir contraseña */}
                <Input
                  name="repeatPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repetí la contraseña *"
                  required
                  minLength={6}
                  className="rounded-full px-5 h-12 bg-muted border-0"
                />

                {state?.error && (
                  <p className="text-sm text-red-500 text-center">{state.error}</p>
                )}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-2xl bg-accent hover:bg-accent/90 text-white font-bold text-base disabled:opacity-50 shadow-[0_6px_18px_rgba(34,197,94,0.25)] transition-all"
                >
                  {isPending ? (
                    <span className="animate-pulse">Guardando…</span>
                  ) : (
                    "Cambiar contraseña"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
