"use client";

import { useSyncExternalStore, useState } from "react";
import { Download, Share2, Plus, MoreVertical, X } from "lucide-react";
import { pwaSubscribe, pwaSnapshot, pwaServerSnapshot, pwaInstall, pwaDismiss } from "@/lib/pwa";

export function InstallPrompt() {
  const snap = useSyncExternalStore(pwaSubscribe, pwaSnapshot, pwaServerSnapshot);
  const [, tick] = useState(0);

  async function install() {
    await pwaInstall();
    tick((n) => n + 1);
  }

  function dismiss() {
    pwaDismiss();
    tick((n) => n + 1);
  }

  if (snap === "hidden") return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-card border border-border rounded-2xl shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <Download className="w-5 h-5 text-accent mt-0.5 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Instala GetChef</p>

        {snap === "prompt" && (
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

        {snap === "manual-samsung" && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">Para instalar en Samsung Internet:</p>
            <ol className="text-xs text-muted-foreground mt-1.5 space-y-1.5">
              <li className="flex items-start gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">1</span>
                Toca el menú <strong>≡</strong> o los 3 puntos
              </li>
              <li className="flex items-start gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">2</span>
                Toca <strong>&ldquo;Agregar página a&rdquo;</strong>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">3</span>
                Elige <strong>&ldquo;Pantalla de inicio&rdquo;</strong>
              </li>
            </ol>
            <p className="text-xs text-muted-foreground mt-1.5 italic">
              Si Play Protect avisa, toca &ldquo;Instalar de todos modos&rdquo;.
            </p>
          </>
        )}

        {(snap === "manual-chrome-desktop" || snap === "manual-chrome-mobile") && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">Para instalar en Chrome:</p>
            <ol className="text-xs text-muted-foreground mt-1.5 space-y-1.5">
              <li className="flex items-center gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">1</span>
                Toca <MoreVertical className="w-3 h-3 inline mx-0.5" /> arriba a la derecha
              </li>
              <li className="flex items-center gap-1.5">
                <span className="bg-secondary rounded px-1 py-0.5 shrink-0 font-medium">2</span>
                Toca <strong>&ldquo;Instalar app&rdquo;</strong>
              </li>
            </ol>
          </>
        )}

        {snap === "ios" && (
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
