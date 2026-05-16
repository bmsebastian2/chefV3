"use client";

import { useSyncExternalStore, useState } from "react";
import { Download, Share2, X, Plus, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let _deferredPrompt: BeforeInstallPromptEvent | null =
  typeof window !== "undefined"
    ? ((window as { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt ?? null)
    : null;

function detectBrowser(): "samsung" | "chrome" | "other" {
  const ua = navigator.userAgent;
  if (/SamsungBrowser/.test(ua)) return "samsung";
  if (/Chrome/.test(ua) && !/Chromium/.test(ua)) return "chrome";
  return "other";
}

type UIState = "hidden" | "android-prompt" | "android-samsung" | "android-chrome" | "ios";

function subscribe(onChange: () => void) {
  const handler = (e: Event) => {
    e.preventDefault();
    _deferredPrompt = e as BeforeInstallPromptEvent;
    onChange();
  };
  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}

function getClientSnapshot(): UIState {
  if (sessionStorage.getItem("install-dismissed")) return "hidden";
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
    return "hidden";
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return "ios";
  if (_deferredPrompt) return "android-prompt";
  const browser = detectBrowser();
  if (browser === "samsung") return "android-samsung";
  return "android-chrome";
}

export function InstallPrompt() {
  const uiState = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    () => "hidden" as UIState
  );

  const [, tick] = useState(0);

  async function install() {
    if (!_deferredPrompt) return;
    await _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    _deferredPrompt = null;
    if (outcome === "accepted") sessionStorage.setItem("install-dismissed", "1");
    tick((n) => n + 1);
  }

  function dismiss() {
    sessionStorage.setItem("install-dismissed", "1");
    tick((n) => n + 1);
  }

  if (uiState === "hidden") return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-card border border-border rounded-2xl shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <Download className="w-5 h-5 text-accent mt-0.5 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Instala GetChef</p>

        {/* Botón directo cuando Chrome ya tiene el evento listo */}
        {uiState === "android-prompt" && (
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

        {/* Samsung Internet */}
        {uiState === "android-samsung" && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">Para instalar en Samsung Internet:</p>
            <ol className="text-xs text-muted-foreground mt-1.5 space-y-1.5">
              <li className="flex items-start gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">1</span>
                Toca el ícono <strong>≡</strong> (menú inferior) o los 3 puntos
              </li>
              <li className="flex items-start gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">2</span>
                Toca <strong>&ldquo;Agregar página a&rdquo;</strong>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">3</span>
                Selecciona <strong>&ldquo;Pantalla de inicio&rdquo;</strong>
              </li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Si Play Protect avisa, toca &ldquo;Instalar de todos modos&rdquo; — la app es segura.
            </p>
          </>
        )}

        {/* Chrome sin engagement suficiente todavía */}
        {uiState === "android-chrome" && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">Para instalar en Chrome:</p>
            <ol className="text-xs text-muted-foreground mt-1.5 space-y-1.5">
              <li className="flex items-center gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">1</span>
                Toca <MoreVertical className="w-3 h-3 inline mx-0.5" /> (menú arriba a la derecha)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">2</span>
                Toca <strong>&ldquo;Instalar app&rdquo;</strong> o <strong>&ldquo;Agregar a inicio&rdquo;</strong>
              </li>
            </ol>
          </>
        )}

        {/* iOS Safari */}
        {uiState === "ios" && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">Para instalar en iPhone:</p>
            <ol className="text-xs text-muted-foreground mt-1.5 space-y-1.5">
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
