"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, UtensilsCrossed } from "lucide-react";

/**
 * Banner gastronómico — mosaico editorial asimétrico.
 *
 * ASSETS PENDIENTES → dejar caer en /public con estos nombres exactos
 * (deben ser platos DISTINTOS a los de la sección Menus):
 *   - banner-firma.webp    → protagonista vertical  (3:4, ~1200×1600)
 *   - banner-mesa.webp     → apaisada superior       (4:3, ~1600×1200)
 *   - banner-postre.webp   → cuadrada inferior izq.  (1:1, ~1000×1000)
 *   - banner-entrada.webp  → cuadrada inferior der.  (1:1, ~1000×1000)
 * Mientras no existan, cada celda muestra un placeholder con el nombre del plato.
 */
const dishes = [
  { name: "Risotto de hongos", note: "trufa negra y parmesano 24 meses", img: "/banner-firma.webp" },
  { name: "Mesa de autor", note: "selección del chef", img: "/banner-mesa.webp" },
  { name: "Coulant de chocolate", note: "helado de vainilla bourbon", img: "/banner-postre.webp" },
  { name: "Ceviche nikkei", note: "leche de tigre y cítricos", img: "/banner-entrada.webp" },
];

type Dish = (typeof dishes)[number];

export function SaboresEnCasa() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

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
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Entrada (fade + slide) con stagger por índice.
  // prefers-reduced-motion: las variantes motion-safe evitan ocultar el contenido
  // y motion-reduce elimina la transición → aparición directa.
  const animCls = `transition-all duration-700 ease-out motion-reduce:transition-none ${
    revealed ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-4"
  }`;
  const animStyle = (i: number) => ({ transitionDelay: `${i * 90}ms` });

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-white py-24">
      {/* Glow cálido sutil */}
      <div className="pointer-events-none absolute -right-32 -top-24 h-[420px] w-[420px] rounded-full bg-amber-100/40 blur-3xl" aria-hidden="true" />

      <div className="container relative z-10 mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">

          {/* ── Texto ── */}
          <div className={`lg:col-span-4 ${animCls}`} style={animStyle(0)}>
            <span className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
              <span className="h-px w-6 bg-amber-500/70" aria-hidden="true" />
              La mesa
            </span>
            <h2 className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-900 md:text-5xl">
              Sabores que llegan a tu casa
            </h2>
            <p className="mt-5 max-w-md font-sans text-lg font-light leading-relaxed text-zinc-500">
              Cocina de autor, emplatada en tu propia mesa. Cada plato lo prepara
              un chef privado, frente a ti, con producto fresco del día.
            </p>
            <Link
              href="/wizard"
              className="group/cta mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-green-400/25 transition-all duration-200 hover:bg-green-600 hover:shadow-green-400/40"
            >
              Diseñar mi experiencia
              <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
            </Link>
          </div>

          {/* ── Mosaico (desktop) ── */}
          <div className="hidden lg:col-span-8 lg:grid lg:h-[460px] lg:grid-cols-3 lg:grid-rows-2 lg:gap-3">
            <DishCard dish={dishes[0]} priority className={`col-start-1 row-span-2 row-start-1 ${animCls}`} style={animStyle(1)} />
            <DishCard dish={dishes[1]} className={`col-span-2 col-start-2 row-start-1 ${animCls}`} style={animStyle(2)} />
            <DishCard dish={dishes[2]} className={`col-start-2 row-start-2 ${animCls}`} style={animStyle(3)} />
            <DishCard dish={dishes[3]} className={`col-start-3 row-start-2 ${animCls}`} style={animStyle(4)} />
          </div>

          {/* ── Mosaico (mobile): protagonista + tira con scroll-snap ── */}
          <div className="lg:hidden">
            <DishCard dish={dishes[0]} priority className={`aspect-[4/3] ${animCls}`} style={animStyle(1)} />
            <div className="-mx-6 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dishes.slice(1).map((dish, i) => (
                <DishCard
                  key={dish.img}
                  dish={dish}
                  className={`aspect-[4/3] w-[72%] shrink-0 snap-start ${animCls}`}
                  style={animStyle(i + 2)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DishCard({
  dish,
  className = "",
  style,
  priority = false,
}: {
  dish: Dish;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl ring-1 ring-black/5 ${className}`}
      style={style}
    >
      {failed ? (
        /* Placeholder claro e intencional mientras no exista la foto */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-50 via-white to-zinc-100 px-4 text-center">
          <UtensilsCrossed className="h-6 w-6 text-amber-500/70" strokeWidth={1.4} />
          <h3 className="font-serif text-[15px] font-semibold leading-tight text-zinc-700">
            {dish.name}
          </h3>
          <p className="text-[11px] leading-tight text-zinc-400">{dish.note}</p>
        </div>
      ) : (
        <>
          <Image
            src={dish.img}
            alt={dish.name}
            fill
            priority={priority}
            sizes="(max-width: 1024px) 80vw, 40vw"
            onError={() => setFailed(true)}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {/* Velado para legibilidad */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Nombre del plato */}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <span className="mb-1 block h-px w-5 bg-amber-400 transition-all duration-500 group-hover:w-9" aria-hidden="true" />
            <h3 className="font-serif text-[15px] font-semibold leading-tight text-white">
              {dish.name}
            </h3>
            <p className="mt-0.5 text-[11px] leading-tight text-white/75">{dish.note}</p>
          </div>
        </>
      )}
    </div>
  );
}
