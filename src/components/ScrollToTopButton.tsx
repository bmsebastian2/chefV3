"use client";

import { useEffect, useState } from "react";

// Umbral de scroll (px) a partir del cual aparece el botón.
// En páginas cortas no se alcanza, así que el botón solo surge en páginas largas.
const SHOW_AFTER = 400;

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      setVisible(window.scrollY > SHOW_AFTER);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    // Estado inicial por si la página carga ya scrolleada (ej. al volver atrás)
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Volver arriba"
      inert={!visible}
      className={`group fixed z-40 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-[0_8px_30px_-6px_rgba(24,24,27,0.18)] outline-none ring-accent/40 transition-all duration-300 ease-out hover:scale-110 hover:border-accent/40 focus-visible:ring-4 active:scale-95 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-6 w-6 transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
