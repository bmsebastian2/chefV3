import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ChevronLeft } from "lucide-react";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ClientChangePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <Link
        href="/client-dashboard/configuracion"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Configuración
      </Link>
      <h1 className="font-serif text-2xl font-semibold text-zinc-900 mb-10">
        Cambiar contraseña
      </h1>
      <ChangePasswordForm />
    </div>
  );
}
