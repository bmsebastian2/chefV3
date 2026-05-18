"use client";

import { useSyncExternalStore, useState } from "react";
import { Download, Share2, Plus, MoreVertical, X, Monitor } from "lucide-react";
import { pwaSubscribe, pwaSnapshot, pwaServerSnapshot, pwaInstall } from "@/lib/pwa";

export function InstallButton({ className = "" }: { className?: string }) {
  const snap = useSyncExternalStore(pwaSubscribe, pwaSnapshot, pwaServerSnapshot);
  const [modal, setModal] = useState(false);
  const [, tick] = useState(0);

  if (snap === "hidden") return null;

  async function handleClick() {
    if (snap === "prompt") {
      // Chrome tiene el evento listo → diálogo nativo directo
      await pwaInstall();
      tick((n) => n + 1);
      return;
    }
    // iOS / Samsung / Chrome sin evento → mostrar instrucciones
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

            {snap === "manual-chrome-desktop" && (
              <ol className="text-sm text-muted-foreground space-y-3">
                <li className="flex items-start gap-2">
                  <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">1</span>
                  <span>
                    Busca el ícono <Monitor className="w-4 h-4 inline mx-0.5 align-text-bottom" /> en
                    el extremo derecho de la barra de direcciones
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">2</span>
                  Haz clic y selecciona{" "}
                  <strong className="text-foreground">&ldquo;Instalar&rdquo;</strong>
                </li>
              </ol>
            )}

            {snap === "manual-chrome-mobile" && (
              <ol className="text-sm text-muted-foreground space-y-3">
                <li className="flex items-center gap-2">
                  <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">1</span>
                  Toca <MoreVertical className="w-4 h-4 inline mx-1" /> arriba a la derecha
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">2</span>
                  Selecciona{" "}
                  <strong className="text-foreground">&ldquo;Instalar app&rdquo;</strong>
                </li>
              </ol>
            )}

            {snap === "manual-samsung" && (
              <>
                <ol className="text-sm text-muted-foreground space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">1</span>
                    Toca el menú <strong className="text-foreground">≡</strong> o los 3 puntos
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">2</span>
                    Toca{" "}
                    <strong className="text-foreground">&ldquo;Agregar página a&rdquo;</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-secondary rounded px-1.5 py-0.5 font-medium shrink-0">3</span>
                    Elige{" "}
                    <strong className="text-foreground">&ldquo;Pantalla de inicio&rdquo;</strong>
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground italic">
                  Si Play Protect avisa, toca &ldquo;Instalar de todos modos&rdquo; — es seguro.
                </p>
              </>
            )}

            {snap === "ios" && (
              <ol className="text-sm text-muted-foreground space-y-3">
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
