import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const subscription: PushSubscriptionJSON = await request.json();
  const { endpoint, keys } = subscription;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: "user_id,endpoint" }
    );

  if (error) {
    console.error("[push/subscribe]", error.message);
    return NextResponse.json({ error: "Error guardando suscripción" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { endpoint }: { endpoint: string } = await request.json();
  const admin = createAdminClient();

  await admin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
