import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  userIds?: string[];
}

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const { title, body, url = "/", userIds }: PushPayload = await request.json();

  const admin = createAdminClient();
  let query = admin.from("push_subscriptions").select("endpoint, p256dh, auth");

  if (userIds?.length) {
    query = query.in("user_id", userIds);
  }

  const { data: subs, error } = await query;

  if (error) {
    console.error("[push/send] fetch subs:", error.message);
    return NextResponse.json({ error: "Error obteniendo suscripciones" }, { status: 500 });
  }

  const payload = JSON.stringify({ title, body, url });
  const results = await Promise.allSettled(
    (subs ?? []).map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return NextResponse.json({ sent: results.length - failed, failed });
}
