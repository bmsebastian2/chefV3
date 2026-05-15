"use client";

import { useState, useEffect } from "react";
import { Download, Share2, X, Plus, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type State = "idle" | "android-prompt" | "android-manual" | "ios" | "installed";

export function InstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (sessionStorage.getItem("install-dismissed")) {
      setDismissed(true);
      return;
    }

    // Ya instalada
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setState("installed");
      return;
    }

    // iOS Safari: no soporta beforeinstallprompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      setState("ios");
      return;
    }

    // Android/Chrome: revisar si el evento ya fue capturado antes de que React montara
    const early = (window as { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt;
    if (early) {
      setDeferredPrompt(early);
      setState("android-prompt");
      return;
    }

    // Sin evento aún → mostrar instrucciones manuales de Chrome
    setState("android-manual");

    // Igual escuchar por si el evento llega después
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState("android-prompt");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setState("installed");
    setDeferredPrompt(null);
    dismiss();
  }

  function dismiss() {
    sessionStorage.setItem("install-dismissed", "1");
    setDismissed(true);
  }

  if (!mounted || dismissed || state === "idle" || state === "installed") return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-card border border-border rounded-2xl shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <Download className="w-5 h-5 text-accent mt-0.5 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Instala GetChef</p>

        {/* Android con botón directo */}
        {state === "android-prompt" && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">
              Accede rápido desde tu pantalla de inicio.
            </p>
            <button
              onClick={install}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar app
            </button>
          </>
        )}

        {/* Android sin evento (Chrome engagement check no cumplido) */}
        {state === "android-manual" && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">Para instalar en Android:</p>
            <ol className="text-xs text-muted-foreground mt-1.5 space-y-1">
              <li className="flex items-center gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">1</span>
                Toca <MoreVertical className="w-3 h-3 inline mx-0.5" /> (menú de Chrome)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">2</span>
                Toca <strong>&ldquo;Instalar app&rdquo;</strong> o &ldquo;Agregar a inicio&rdquo;
              </li>
            </ol>
          </>
        )}

        {/* iOS Safari */}
        {state === "ios" && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">Para instalar en iPhone:</p>
            <ol className="text-xs text-muted-foreground mt-1.5 space-y-1">
              <li className="flex items-center gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">1</span>
                Toca <Share2 className="w-3 h-3 inline mx-0.5" /> (Compartir) en Safari
              </li>
              <li className="flex items-center gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">2</span>
                Toca <Plus className="w-3 h-3 inline mx-0.5" /> <strong>&ldquo;Agregar a inicio&rdquo;</strong>
              </li>
            </ol>
          </>
        )}
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
