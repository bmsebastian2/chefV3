import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { logout } from "@/app/auth/actions";
import { ClientNombreForm } from "@/components/client-dashboard/ClientNombreForm";
import { KeyRound, User, LogOut, ChevronRight, Mail } from "lucide-react";

export default async function ClientConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: userData } = await supabase
    .from("users")
    .select("first_name, first_surname, second_surname, role")
    .eq("id", user.id)
    .maybeSingle();

  const roleLabel = userData?.role === "chef" ? "Chef" : userData?.role === "client" ? "Cliente" : "—";

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold text-zinc-900 mb-1">
        Configuración
      </h1>
      <p className="text-sm text-zinc-500 mb-10">
        Gestioná los datos de tu cuenta y tu seguridad.
      </p>

      {/* ── Cuenta ── */}
      <section className="mb-8">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">
          Cuenta
        </h2>
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm divide-y divide-zinc-100">
          <div className="flex items-start gap-3 p-4">
            <User className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-1.5" />
            <span className="text-sm text-zinc-500 w-24 flex-shrink-0 mt-2.5">Nombre</span>
            <div className="flex-1 min-w-0">
              <ClientNombreForm
                initialData={{
                  first_name: userData?.first_name ?? null,
                  first_surname: userData?.first_surname ?? null,
                  second_surname: userData?.second_surname ?? null,
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Mail className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <span className="text-sm text-zinc-500 w-24 flex-shrink-0">Email</span>
            <span className="text-sm font-medium text-zinc-900 truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 p-4">
            <span className="w-4 flex-shrink-0" aria-hidden />
            <span className="text-sm text-zinc-500 w-24 flex-shrink-0">Tipo de cuenta</span>
            <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              {roleLabel}
            </span>
          </div>
        </div>
      </section>

      {/* ── Ajustes ── */}
      <section className="mb-8">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">
          Ajustes
        </h2>
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm divide-y divide-zinc-100 overflow-hidden">
          <Link
            href="/client-dashboard/configuracion/password"
            className="flex items-center gap-3 p-4 hover:bg-zinc-50 transition-colors"
          >
            <KeyRound className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900">Cambiar la contraseña</p>
              <p className="text-xs text-zinc-500">Actualizá tu contraseña de acceso.</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
          </Link>
        </div>
      </section>

      {/* ── Sesión ── */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">
          Sesión
        </h2>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-zinc-100 bg-white shadow-sm text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  );
}
