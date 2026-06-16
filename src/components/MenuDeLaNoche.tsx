"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

// Menú degustación de muestra — lo que un chef compone para ti en casa
const tastingMenu = [
  { course: "I", name: "Tartar de atún rojo", note: "palta, cítricos y aceite de oliva virgen" },
  { course: "II", name: "Lomo madurado al carbón", note: "jugo de su cocción y papas confitadas" },
  { course: "III", name: "Milhojas de vainilla", note: "crema diplomática y frutos rojos" },
];

export function MenuDeLaNoche() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      const trigger = { trigger: sectionRef.current, start: "top 70%" };

      gsap.fromTo(
        ".menu-intro > *",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: "power2.out", scrollTrigger: trigger }
      );
      gsap.fromTo(
        ".menu-card",
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay: 0.15, scrollTrigger: trigger }
      );
      gsap.fromTo(
        ".menu-dish",
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.6, stagger: 0.12, ease: "power2.out", delay: 0.45, scrollTrigger: trigger }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="menu-noche" ref={sectionRef} className="relative overflow-hidden bg-[#FAFAFA] py-28">
      {/* Vapor (respeta prefers-reduced-motion) */}
      <style>{`
        @keyframes menuSteam {
          0%   { opacity: 0; transform: translateY(2px) scaleY(.7); }
          25%  { opacity: .6; }
          100% { opacity: 0; transform: translateY(-12px) scaleY(1.25); }
        }
        .menu-steam > path { transform-origin: center bottom; animation: menuSteam 3.2s ease-in-out infinite; }
        .menu-steam > path:nth-child(2) { animation-delay: 1s; }
        .menu-steam > path:nth-child(3) { animation-delay: 2s; }
        @media (prefers-reduced-motion: reduce) {
          .menu-steam > path { animation: none !important; }
        }
      `}</style>

      {/* Glows cálidos de fondo */}
      <div className="pointer-events-none absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-amber-100/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[380px] w-[380px] rounded-full bg-green-100/30 blur-3xl" aria-hidden="true" />

      <div className="container relative z-10 mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">

          {/* ── Columna de intro ── */}
          <div className="menu-intro">
            <span className="mb-5 inline-block rounded-full border border-accent/25 bg-accent/5 px-4 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-accent opacity-0">
              La experiencia
            </span>
            <h2 className="mb-4 font-serif text-4xl font-semibold text-zinc-900 opacity-0 md:text-5xl">
              Un menú pensado solo para ti
            </h2>
            <p className="max-w-md font-sans text-lg leading-relaxed text-zinc-500 opacity-0">
              No eliges de una carta fija: tu chef diseña cada plato según tu ocasión,
              tus gustos y tus alergias, y lo cocina en tu propia cocina.
            </p>
          </div>

          {/* ── Tarjeta del menú degustación ── */}
          <div className="menu-card relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-white via-amber-50/40 to-white p-6 opacity-0 shadow-xl shadow-amber-900/[0.06]">
            {/* Glow cálido de fondo */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-200/30 blur-3xl" aria-hidden="true" />

            {/* Encabezado: eyebrow + campana de servicio con vapor */}
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                  <span className="h-px w-5 bg-amber-500/70" aria-hidden="true" />
                  El menú de esta noche
                </span>
                <h3 className="mt-1 font-serif text-xl font-semibold tracking-tight text-zinc-900">
                  Lo compone tu chef, a tu medida
                </h3>
              </div>

              {/* Cloche + vapor */}
              <div className="relative h-11 w-14 flex-shrink-0" aria-hidden="true">
                <svg className="menu-steam absolute left-1/2 top-0 -translate-x-1/2" width="26" height="16" viewBox="0 0 26 16" fill="none" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M7 15c0-3 2-3 2-6s-2-3-2-6" opacity=".7" />
                  <path d="M13 15c0-3 2-3 2-6s-2-3-2-6" opacity=".7" />
                  <path d="M19 15c0-3 2-3 2-6s-2-3-2-6" opacity=".7" />
                </svg>
                <svg className="absolute bottom-0 left-1/2 -translate-x-1/2" width="56" height="34" viewBox="0 0 56 34" fill="none" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 30h48" />
                  <path d="M8 30a20 20 0 0 1 40 0" fill="#fffbeb" />
                  <path d="M28 10V6" />
                  <circle cx="28" cy="5" r="2" fill="#fffbeb" />
                </svg>
              </div>
            </div>

            {/* Platos */}
            <ul className="relative mt-4">
              {tastingMenu.map((m) => (
                <li
                  key={m.course}
                  className="menu-dish flex items-baseline gap-3 border-t border-amber-100 py-2.5 opacity-0 first:border-t-0 first:pt-1"
                >
                  <span className="w-5 flex-shrink-0 font-serif text-base italic text-amber-500/90">
                    {m.course}
                  </span>
                  <div className="min-w-0">
                    <p className="font-serif text-[15px] font-semibold leading-tight text-zinc-900">
                      {m.name}
                    </p>
                    <p className="text-xs leading-snug text-zinc-500">{m.note}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pie: señal de servicio en casa + CTA */}
            <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-amber-100 pt-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
                Cocinado en tu hogar
              </span>
              <Link
                href="/wizard"
                className="group/cta inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
              >
                Diseñar mi menú
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
