"use client";

import { useEffect, useRef, useState } from "react";
import { Star, ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";

// Shape público de un chef para la card. Preparado para la futura tabla de
// reviews: `rating` ya es un agregado { average, count } — cuando exista la
// tabla solo cambia la fuente del query, no este componente.
export type ChefCard = {
  id: string;
  name: string;
  tagline: string | null;
  city: string | null;
  country: string | null;
  experienceYears: number | null;
  isPro: boolean;
  imageUrl: string | null;
  rating: { average: number; count: number };
};

function locationLabel(city: string | null, country: string | null): string | null {
  const parts = [city, country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "C";
}

// Foto del chef con fallback elegante cuando no hay imagen (chef sin foto subida).
function ChefPhoto({
  src,
  name,
  sizes,
  imgClassName = "",
}: {
  src: string | null;
  name: string;
  sizes: string;
  imgClassName?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        fill
        sizes={sizes}
        className={`object-cover ${imgClassName}`}
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100">
      <span className="font-serif text-5xl font-semibold text-zinc-300">
        {initialOf(name)}
      </span>
    </div>
  );
}

function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-zinc-300"
          }`}
        />
      ))}
    </span>
  );
}

// Línea de rating con tres estados, lista para la futura tabla de reviews:
// - count > 0  → estrellas + "4.9 · 12 reseñas"
// - solo average (sin reseñas aún) → estrellas + "4.9 · Nuevo"
// - sin datos  → chip "Chef nuevo"
function RatingLine({
  rating,
  size = "sm",
}: {
  rating: ChefCard["rating"];
  size?: "sm" | "md";
}) {
  const textClass = size === "md" ? "text-sm" : "text-xs";
  if (rating.count > 0) {
    return (
      <span className="flex items-center gap-2">
        <Stars rating={rating.average} />
        <span className={`${textClass} font-medium text-zinc-500`}>
          {rating.average.toFixed(1)} · {rating.count} reseñas
        </span>
      </span>
    );
  }
  if (rating.average > 0) {
    return (
      <span className="flex items-center gap-2">
        <Stars rating={rating.average} />
        <span className={`${textClass} font-medium text-zinc-500`}>
          {rating.average.toFixed(1)} · Nuevo
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
      Chef nuevo
    </span>
  );
}

export function Chefs({ chefs }: { chefs: ChefCard[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<ChefCard | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Reveal al entrar en viewport (equivale al ScrollTrigger start "top 75%"),
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
      { rootMargin: "0px 0px -25% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Entrada de las cards: opacity + y:50, dur 0.9, stagger 0.18.
  // Va en un wrapper para no pisar la transición de hover del <button> interno.
  const cardCls = `transition-all duration-[900ms] ease-out motion-reduce:transition-none ${
    revealed ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-[50px]"
  }`;

  // Cierre con Escape + bloqueo de scroll del body mientras el detalle está abierto
  // (el Dialog base solo maneja click-fuera, no estas dos cosas).
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selected]);

  return (
    <section id="chefs" ref={sectionRef} className="relative overflow-hidden bg-white py-28">
      {/* Animaciones del detalle (respetan prefers-reduced-motion) */}
      <style>{`
        @keyframes chefPanelIn {
          from { opacity: 0; transform: translateY(10px) scale(.97); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .chef-detail-panel { animation: none !important; }
        }
      `}</style>

      {/* Glow cálido sutil — lenguaje del sistema */}
      <div className="pointer-events-none absolute -right-32 top-16 h-[420px] w-[420px] rounded-full bg-amber-100/40 blur-3xl" aria-hidden="true" />

      <div className="container relative z-10 mx-auto max-w-[1280px] px-6">
        {/* Header */}
        <div className="mb-16 flex flex-col items-end justify-between gap-6 md:flex-row">
          <div className="max-w-xl">
            <span className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
              <span className="h-px w-5 bg-amber-500/70" aria-hidden="true" />
              Nuestros Chefs
            </span>
            <h2 className="mb-4 font-serif text-4xl font-semibold leading-tight text-zinc-900 md:text-5xl">
              Los mejores chefs. <span className="text-accent">En tu cocina.</span>
            </h2>
            <p className="font-sans text-lg font-light leading-relaxed text-zinc-500">
              Chefs profesionales seleccionados, cocinando alta cocina en la comodidad de tu hogar.
            </p>
          </div>
          <Link
            href="#chefs"
            className="group flex cursor-pointer items-center gap-2 whitespace-nowrap border-none bg-transparent p-0 text-sm font-medium text-zinc-500 transition-colors duration-200 hover:text-accent"
          >
            Ver todos los chefs
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Cards: carrusel horizontal con scroll-snap en mobile (corta el scroll
            vertical largo), grilla de 3 en desktop. El cambio es solo de layout
            vía breakpoints md: — el diseño de cada card no se toca. */}
        <div
          role="region"
          aria-label="Chefs destacados"
          className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0"
        >
          {chefs.map((chef, idx) => {
            const location = locationLabel(chef.city, chef.country);
            return (
            <div
              key={chef.id}
              className={`w-[85%] shrink-0 snap-start sm:w-[55%] md:w-auto md:shrink-0 ${cardCls}`}
              style={{ transitionDelay: `${idx * 180}ms` }}
            >
            <button
              type="button"
              onClick={() => setSelected(chef)}
              aria-label={`Ver perfil de ${chef.name}`}
              className="group flex w-full flex-col text-left outline-none transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:-translate-y-1"
            >
              {/* Imagen */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-black/5 transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-amber-900/[0.08] group-focus-visible:ring-2 group-focus-visible:ring-accent">
                <ChefPhoto
                  src={chef.imageUrl}
                  name={chef.name}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  imgClassName="transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                {location && (
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 backdrop-blur-sm">
                    {location}
                  </span>
                )}
                {chef.isPro && (
                  <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-sm">
                    Pro
                  </span>
                )}
              </div>

              {/* Ficha */}
              <div className="px-1 pt-4">
                <span
                  className="mb-2 block h-px w-5 bg-amber-500/70 transition-all duration-500 group-hover:w-9"
                  aria-hidden="true"
                />
                <h3 className="font-serif text-xl font-semibold leading-tight text-zinc-900">
                  {chef.name}
                </h3>
                {chef.tagline && (
                  <p className="mt-1 line-clamp-1 font-sans text-sm font-light text-zinc-500">
                    {chef.tagline}
                  </p>
                )}
                <div className="mt-1.5">
                  <RatingLine rating={chef.rating} />
                </div>
                {chef.experienceYears != null && chef.experienceYears > 0 && (
                  <p className="mt-2 text-xs text-zinc-400">
                    {chef.experienceYears} años de experiencia
                  </p>
                )}
                <div className="mt-3 flex items-center justify-end">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    Ver perfil
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </button>
            </div>
            );
          })}
        </div>
      </div>

      {/* Detalle del chef — reutiliza el Dialog del sistema */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        {selected && (
          <DialogContent className="chef-detail-panel max-h-[90vh] max-w-3xl overflow-y-auto p-0 motion-safe:animate-[chefPanelIn_0.3s_ease-out] md:max-h-none md:overflow-hidden">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Cerrar perfil"
              className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-zinc-900"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Foto — más baja en mobile para que el modal no quede larguísimo */}
              <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[440px]">
                <ChefPhoto
                  src={selected.imageUrl}
                  name={selected.name}
                  sizes="(max-width: 768px) 100vw, 384px"
                />
              </div>

              {/* Info */}
              <div className="flex flex-col p-6 md:p-7">
                {locationLabel(selected.city, selected.country) && (
                  <span className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                    <span className="h-px w-5 bg-amber-500/70" aria-hidden="true" />
                    {locationLabel(selected.city, selected.country)}
                  </span>
                )}
                <h3 className="font-serif text-2xl font-semibold leading-tight text-zinc-900 md:text-3xl">
                  {selected.name}
                </h3>

                <div className="mt-3">
                  <RatingLine rating={selected.rating} size="md" />
                </div>

                {selected.experienceYears != null && selected.experienceYears > 0 && (
                  <p className="mt-2 text-sm text-zinc-400">
                    {selected.experienceYears} años de experiencia
                  </p>
                )}

                <p className="mt-4 font-sans text-sm leading-relaxed text-zinc-500">
                  {selected.tagline ??
                    "Alta cocina preparada en tu propio hogar, frente a ti y a tus invitados."}
                </p>

                {/* Pie: CTA */}
                <div className="mt-auto pt-7">
                  <Link
                    href="/wizard"
                    className="group/cta inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-green-400/25 transition-all hover:bg-green-600 hover:shadow-green-400/40"
                  >
                    Solicitar a este chef
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
