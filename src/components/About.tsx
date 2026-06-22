"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// Valores de marca como lista editorial numerada (no un grid plano de íconos).
const values = [
  {
    title: "Gastronomía",
    body: "Una comunidad curada categóricamente por la excelencia y la pasión por el producto.",
  },
  {
    title: "Servicio",
    body: "Transformamos a los chefs en anfitriones, elevando cada detalle a su máxima expresión.",
  },
] as const;

export function About() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  // Reveal al entrar en viewport. Equivale al antiguo ScrollTrigger start "top 70%"
  // (el -30% inferior del rootMargin dispara cuando el top cruza el 70% de la pantalla),
  // sin el forced reflow de ScrollTrigger ni el peso de GSAP.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -30% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Entrada (fade + slide) con stagger por índice. Solo anima opacity/transform
  // (compositadas) y respeta prefers-reduced-motion.
  const animCls = `transition-all duration-[800ms] ease-out motion-reduce:transition-none ${
    revealed ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-[30px]"
  }`;
  const animStyle = (i: number) => ({ transitionDelay: `${i * 160}ms` });

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-white py-24 md:py-28"
    >
      {/* Halo ámbar tenue detrás de la foto — motivo Deluxe (Hero/Chefs). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-8 h-[460px] w-[460px] rounded-full bg-amber-100/40 blur-3xl"
      />

      <div className="container relative mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Columna de contenido — peso visual alto, ocupa más que la mitad. */}
          <div className="lg:col-span-7">
            <span
              className={`mb-5 flex items-center gap-2.5 font-sans text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700 ${animCls}`}
              style={animStyle(0)}
            >
              <span className="h-px w-6 bg-amber-500/70" aria-hidden="true" />
              Nuestra filosofía
            </span>

            <h2
              className={`font-serif text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl ${animCls}`}
              style={animStyle(1)}
            >
              El arte del servicio,
              <br />
              <span className="text-zinc-500">redefinido.</span>
            </h2>

            <p
              className={`mt-7 max-w-xl font-sans text-base leading-relaxed text-zinc-600 md:text-lg ${animCls}`}
              style={animStyle(2)}
            >
              Nacimos con la convicción de que el talento de los chefs más
              excepcionales no debería permanecer escondido detrás de los muros de
              un restaurante tradicional. Creemos que la cocina debe brillar en el
              lugar donde se disfrutan las cenas más inolvidables: en tu propia
              mesa.
            </p>

            {/* Valores como lista numerada editorial con hairline ámbar vertical. */}
            <div
              className={`relative mt-10 max-w-xl space-y-7 pl-6 ${animCls}`}
              style={animStyle(3)}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-amber-500/70 via-amber-500/30 to-transparent"
              />
              {values.map((value, i) => (
                <div key={value.title} className="group flex gap-4">
                  <span className="select-none pt-0.5 font-serif text-sm font-medium tabular-nums text-amber-700">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="font-serif text-xl font-medium text-zinc-900">
                      {value.title}
                    </h3>
                    <p className="mt-1.5 font-sans text-sm leading-relaxed text-zinc-600">
                      {value.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Foto protagonista que rompe la grilla: vertical, sobresale del flujo
              en desktop con márgenes negativos. */}
          <div
            className={`lg:col-span-5 ${animCls}`}
            style={animStyle(2)}
          >
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl shadow-2xl shadow-zinc-900/15 ring-1 ring-black/5 lg:-my-10 lg:aspect-[3/4] lg:max-w-none">
              <Image
                src="/Chef.webp"
                alt="Chef privado emplatando un plato con guarnición y micro-hierbas"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover object-[65%_50%]"
              />
              {/* Velo inferior + etiqueta editorial sutil. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-zinc-950/45 via-transparent to-transparent"
              />
              <span className="absolute bottom-5 left-5 flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white/90">
                <span className="h-px w-5 bg-amber-400" aria-hidden="true" />
                Cocina en vivo
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
