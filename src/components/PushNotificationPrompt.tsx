"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationPrompt() {
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasSupport =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(hasSupport);
    if (hasSupport) setPermission(Notification.permission);
    if (sessionStorage.getItem("push-dismissed")) setDismissed(true);
  }, []);

  async function subscribe() {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;

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
    } catch (err) {
      console.error("[push] subscribe error:", err);
    }
  }

  function dismiss() {
    sessionStorage.setItem("push-dismissed", "1");
    setDismissed(true);
  }

  if (!mounted || !supported || permission !== "default" || dismissed) return null;

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
            onClick={subscribe}
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
