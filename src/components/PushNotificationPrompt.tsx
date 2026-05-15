"use client";

import { useSyncExternalStore, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type PushState = "hidden" | "default";

function subscribe(onChange: () => void) {
  // Push permission puede cambiar (ej. el usuario revoca desde settings)
  if (!("permissions" in navigator)) return () => {};
  let permStatus: PermissionStatus | null = null;
  navigator.permissions.query({ name: "notifications" }).then((ps) => {
    permStatus = ps;
    ps.addEventListener("change", onChange);
  });
  return () => permStatus?.removeEventListener("change", onChange);
}

function getClientSnapshot(): PushState {
  if (sessionStorage.getItem("push-dismissed")) return "hidden";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return "hidden";
  if (Notification.permission !== "default") return "hidden";
  return "default";
}

export function PushNotificationPrompt() {
  const pushState = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    () => "hidden" as PushState // servidor: no renderizar
  );

  const [, tick] = useState(0);

  async function subscribe_() {
    try {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        tick((n) => n + 1);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      tick((n) => n + 1);
    } catch (err) {
      console.error("[push] subscribe error:", err);
      tick((n) => n + 1);
    }
  }

  function dismiss() {
    sessionStorage.setItem("push-dismissed", "1");
    tick((n) => n + 1);
  }

  if (pushState === "hidden") return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-96 z-50 bg-card border border-border rounded-2xl shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <Bell className="w-5 h-5 text-accent mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Activa las notificaciones</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Recibe alertas cuando un chef acepte tu solicitud o tengas novedades.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={subscribe_}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Bell className="w-3.5 h-3.5" />
            Activar
          </button>
          <button
            onClick={dismiss}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:opacity-80 transition-opacity"
          >
            <BellOff className="w-3.5 h-3.5" />
            Ahora no
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
