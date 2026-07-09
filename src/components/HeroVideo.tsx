"use client";

import { useState, useSyncExternalStore } from "react";

type NetInfo = { saveData?: boolean; effectiveType?: string };

const emptySubscribe = () => () => {};

function canAutoplay(when?: string) {
  // La tarjeta se renderiza en dos posiciones responsivas; cada instancia solo
  // monta el video en su breakpoint para no descargarlo/reproducirlo dos veces
  if (when && !window.matchMedia(when).matches) return false;
  // Solo el poster para quien pide menos movimiento
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  // Solo el poster en modo ahorro de datos o conexión lenta (2g/3g).
  // Si el navegador no expone la API (Safari/Firefox), asumimos conexión buena.
  const conn = (navigator as Navigator & { connection?: NetInfo }).connection;
  if (conn?.saveData) return false;
  if (conn?.effectiveType && conn.effectiveType !== "4g") return false;
  return true;
}

export function HeroVideo({ when }: { when?: string }) {
  // false en SSR e hidratación; en el cliente decide según motion/conexión
  const showVideo = useSyncExternalStore(
    emptySubscribe,
    () => canAutoplay(when),
    () => false
  );
  const [playing, setPlaying] = useState(false);

  return (
    <>
      {/* Poster: presente en el HTML del SSR — es el candidato LCP, no el video */}
      <img
        src="/banner-chef.webp"
        alt="Chef cocinando en vivo un plato nicaragüense de autor"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-right transition-transform duration-700 ease-out group-hover:scale-105"
      />
      {showVideo && (
        <video
          src="/Cocina%20en%20vivo.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover object-right transition-[opacity,transform] duration-700 ease-out group-hover:scale-105 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </>
  );
}
