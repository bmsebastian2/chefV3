"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star, ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

type Chef = {
  name: string;
  rating: number;
  reviews: number;
  specialty: string;
  img: string;
};

const chefs: Chef[] = [
  {
    name: "Chef Javier Aranda",
    rating: 4.9,
    reviews: 120,
    specialty: "Cocina de Autor",
    img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=600&grayscale=true",
  },
  {
    name: "Chef Elena Arzak",
    rating: 5.0,
    reviews: 340,
    specialty: "Alta Cocina Vasca",
    img: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=600&grayscale=true",
  },
  {
    name: "Chef Diego Guerrero",
    rating: 4.8,
    reviews: 95,
    specialty: "Cocina Creativa",
    img: "https://images.unsplash.com/photo-1581349485608-9469926a8e5e?auto=format&fit=crop&q=80&w=600&grayscale=true",
  },
];

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

export function Chefs() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Chef | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".chef-card",
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.18,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

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
          <button
            type="button"
            className="group flex cursor-pointer items-center gap-2 whitespace-nowrap border-none bg-transparent p-0 text-sm font-medium text-zinc-500 transition-colors duration-200 hover:text-accent"
          >
            Ver todos los chefs
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {chefs.map((chef, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelected(chef)}
              aria-label={`Ver perfil de ${chef.name}`}
              className="chef-card group flex flex-col text-left opacity-0 outline-none transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:-translate-y-1"
            >
              {/* Imagen */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-black/5 transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-amber-900/[0.08] group-focus-visible:ring-2 group-focus-visible:ring-accent">
                <Image
                  src={chef.img}
                  alt={chef.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 backdrop-blur-sm">
                  {chef.specialty}
                </span>
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
                <div className="mt-1.5 flex items-center gap-2">
                  <Stars rating={chef.rating} />
                  <span className="text-xs font-medium text-zinc-500">
                    {chef.rating} · {chef.reviews} reseñas
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    Ver perfil
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detalle del chef — reutiliza el Dialog del sistema */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        {selected && (
          <DialogContent className="chef-detail-panel max-w-3xl overflow-hidden p-0 motion-safe:animate-[chefPanelIn_0.3s_ease-out]">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Cerrar perfil"
              className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-zinc-900"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Foto */}
              <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[440px]">
                <Image
                  src={selected.img}
                  alt={selected.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 384px"
                  className="object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex flex-col p-7">
                <span className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                  <span className="h-px w-5 bg-amber-500/70" aria-hidden="true" />
                  {selected.specialty}
                </span>
                <h3 className="font-serif text-3xl font-semibold leading-tight text-zinc-900">
                  {selected.name}
                </h3>

                <div className="mt-3 flex items-center gap-2">
                  <Stars rating={selected.rating} />
                  <span className="text-sm font-medium text-zinc-500">
                    {selected.rating} · {selected.reviews} reseñas
                  </span>
                </div>

                <p className="mt-4 font-sans text-sm leading-relaxed text-zinc-500">
                  Cocina {selected.specialty.toLowerCase()} preparada en tu propio hogar, frente a ti
                  y a tus invitados.
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
