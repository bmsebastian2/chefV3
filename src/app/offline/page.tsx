"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center bg-background text-foreground">
      <WifiOff className="w-16 h-16 text-muted-foreground" strokeWidth={1.5} />

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Sin conexión</h1>
        <p className="text-muted-foreground max-w-sm">
          No hay conexión a internet. Revisa tu red y vuelve a intentarlo.
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <RefreshCw className="w-4 h-4" />
        Reintentar
      </button>
    </div>
  );
}
