"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/auth/actions";

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, null);

  return (
    <form action={formAction}>
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">
        Cambia tu contraseña
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Nueva contraseña
          </label>
          <input
            type="password"
            name="newPassword"
            placeholder="••••••••"
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Repetir nueva contraseña
          </label>
          <input
            type="password"
            name="repeatPassword"
            placeholder="••••••••"
            required
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 text-center mb-4">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 text-center mb-4">
          Contraseña actualizada correctamente.
        </p>
      )}

      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isPending}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-12 py-3 rounded-full transition-colors text-sm"
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
