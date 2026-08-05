"use client";

import { useActionState, useState } from "react";
import { changePassword } from "@/app/auth/actions";
import { PASSWORD_REQUIREMENTS, validatePassword } from "@/lib/password";

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, null);
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const passwordsMatch = repeatPassword.length === 0 || newPassword === repeatPassword;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const { valid, message } = validatePassword(newPassword);
    if (!valid) {
      setLocalError(message);
      e.preventDefault();
      return;
    }
    if (newPassword !== repeatPassword) {
      setLocalError("Las contraseñas no coinciden.");
      e.preventDefault();
      return;
    }
    setLocalError("");
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-10">
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
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            />
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {PASSWORD_REQUIREMENTS.map((req) => {
                const met = req.test(newPassword);
                return (
                  <li
                    key={req.id}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      met ? "text-accent" : "text-zinc-400"
                    }`}
                  >
                    <span aria-hidden="true">{met ? "✓" : "○"}</span>
                    {req.label}
                  </li>
                );
              })}
            </ul>
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
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            />
            {repeatPassword.length > 0 && (
              <p className={`mt-2 text-xs ${passwordsMatch ? "text-accent" : "text-red-500"}`}>
                {passwordsMatch ? "✓ Coinciden" : "✗ Las contraseñas no coinciden"}
              </p>
            )}
          </div>
        </div>

        {(localError || state?.error) && (
          <p className="text-sm text-red-600 mt-4">{localError || state?.error}</p>
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
