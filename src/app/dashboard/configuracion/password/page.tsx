import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: chefProfile } = await supabase
    .from("chef_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let profileIncomplete = false;
  if (chefProfile) {
    const { data: completion } = await supabase
      .from("profile_completion")
      .select("bio_done, location_done, profile_picture_done")
      .eq("chef_id", chefProfile.id)
      .maybeSingle();

    profileIncomplete = !(
      completion?.bio_done &&
      completion?.location_done &&
      completion?.profile_picture_done
    );
  }

  return (
    <div>
      {profileIncomplete && (
        <div className="bg-white border-b border-zinc-100 px-6 py-2.5 flex items-center justify-end gap-2 text-sm">
          <span className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            i
          </span>
          <span className="text-zinc-500">
            Completá tu perfil para recibir solicitudes.
          </span>
          <Link
            href="/dashboard/perfil"
            className="text-indigo-600 font-medium hover:underline flex items-center gap-0.5"
          >
            Finalizar <span aria-hidden>›</span>
          </Link>
        </div>
      )}

      <div className="p-6 md:p-10 max-w-2xl">
        <h1 className="font-serif text-2xl font-semibold text-zinc-900 mb-10">
          Cambiar contraseña
        </h1>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
