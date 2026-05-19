"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/auth/actions";

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, null);

  return (
    <form action={formAction} className="space-y-10">
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-5">
          Cambia tu contraseña
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
              className="w-full px-3 py-2.5 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Repetir nueva contraseña
            </label>
            <input
              type="password"
              name="repeatPassword"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              className="w-full px-3 py-2.5 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            />
          </div>
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 mt-4">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-green-600 mt-4">
            Contraseña actualizada correctamente.
          </p>
        )}
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="bg-accent hover:bg-accent-200 text-white border-none h-11 px-8 text-sm rounded-md disabled:opacity-50 transition-colors"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
