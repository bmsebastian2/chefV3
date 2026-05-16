"use client";

import { useSyncExternalStore, useState } from "react";
import { Download, Share2, Plus, MoreVertical, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Compartido con InstallPrompt — misma referencia global
declare global {
  interface Window {
    __pwaPrompt?: BeforeInstallPromptEvent;
  }
}

let _prompt: BeforeInstallPromptEvent | null =
  typeof window !== "undefined" ? (window.__pwaPrompt ?? null) : null;

function subscribe(cb: () => void) {
  const handler = (e: Event) => {
    e.preventDefault();
    _prompt = e as BeforeInstallPromptEvent;
    cb();
  };
  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}

type Snap = "hidden" | "ready" | "manual-samsung" | "manual-chrome" | "ios";

function getSnapshot(): Snap {
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
    return "hidden";
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return "ios";
  if (_prompt) return "ready";
  if (/SamsungBrowser/.test(navigator.userAgent)) return "manual-samsung";
  return "manual-chrome";
}

export function InstallButton({ className = "" }: { className?: string }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, () => "hidden" as Snap);
  const [modal, setModal] = useState(false);
  const [, tick] = useState(0);

  if (snap === "hidden") return null;

  async function handleClick() {
    if (snap === "ready" && _prompt) {
      await _prompt.prompt();
      const { outcome } = await _prompt.userChoice;
      _prompt = null;
      tick((n) => n + 1);
      if (outcome === "accepted") return;
    }
    setModal(true);
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-accent transition-colors ${className}`}
      >
        <Download className="w-4 h-4" />
        Instalar app
      </button>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setModal(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">Instala GetChef</p>
              <button onClick={() => setModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {(snap === "manual-chrome" || snap === "ready") && (
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">1</span>
                  Toca <MoreVertical className="w-4 h-4 inline mx-1" /> arriba a la derecha
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">2</span>
                  Selecciona <strong className="text-foreground">&ldquo;Instalar app&rdquo;</strong>
                </li>
              </ol>
            )}

            {snap === "manual-samsung" && (
              <>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">1</span>
                    Toca el menú <strong className="text-foreground">≡</strong> o los 3 puntos
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">2</span>
                    Toca <strong className="text-foreground">&ldquo;Agregar página a&rdquo;</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">3</span>
                    Elige <strong className="text-foreground">&ldquo;Pantalla de inicio&rdquo;</strong>
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground italic">
                  Si Play Protect avisa, toca &ldquo;Instalar de todos modos&rdquo; — es seguro.
                </p>
              </>
            )}

            {snap === "ios" && (
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">1</span>
                  Toca <Share2 className="w-4 h-4 inline mx-1" /> (Compartir) en Safari
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">2</span>
                  Toca <Plus className="w-4 h-4 inline mx-1" />
                  <strong className="text-foreground">&ldquo;Agregar a inicio&rdquo;</strong>
                </li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
