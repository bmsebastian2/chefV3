"use client";

import { useFormStatus } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";

/**
 * Botón de cierre de sesión reutilizable. Debe vivir dentro de un
 * <form action={logout}> — usa useFormStatus() para mostrar el estado de carga
 * mientras la server action se ejecuta, así el usuario sabe que algo está pasando
 * durante el redirect.
 */
export function LogoutButton({
  className,
  labelClassName = "",
  iconClassName = "w-4 h-4 flex-shrink-0",
}: {
  className: string;
  labelClassName?: string;
  iconClassName?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? (
        <Loader2 className={`${iconClassName} animate-spin`} />
      ) : (
        <LogOut className={iconClassName} />
      )}
      <span className={labelClassName}>
        {pending ? "Cerrando sesión…" : "Cerrar sesión"}
      </span>
    </button>
  );
}
