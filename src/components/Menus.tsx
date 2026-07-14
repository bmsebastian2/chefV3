"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

type MenuItem = {
  name: string;
  desc: string;
  img: string;
  categoria: string;
  descripcionLarga: string;
  ingredientes: string[];
  alergenos: string[];
};

// Datos estáticos locales — reemplazar textos/precios por los reales cuando estén.
const menuItems: MenuItem[] = [
  {
    name: "Tataki de Atún Rojo",
    desc: "Ajo blanco de coco y migas crujientes",
    img: "/tataki de atun rojo.webp",
    categoria: "Entrante",
    descripcionLarga:
      "Lomo de atún rojo sellado al instante, sobre un ajo blanco de coco sedoso y rematado con migas crujientes que aportan contraste y textura.",
    ingredientes: ["Atún rojo", "Leche de coco", "Almendra", "Pan crujiente", "Aceite de oliva virgen"],
    alergenos: ["Pescado", "Frutos secos", "Gluten"],
  },
  {
    name: "Lomo de Ciervo",
    desc: "Salsa de frutos rojos y setas salteadas",
    img: "/Lomito.webp",
    categoria: "Principal",
    descripcionLarga:
      "Lomo de ciervo cocinado en su punto, napado con una reducción de frutos rojos y acompañado de setas de temporada salteadas al momento.",
    ingredientes: ["Lomo de ciervo", "Frutos rojos", "Setas de temporada", "Mantequilla", "Vino tinto"],
    alergenos: ["Lácteos", "Sulfitos"],
  },
  {
    name: "Milhoja Caramelizada",
    desc: "Foie de pato, manzana verde y cebolla confitada",
    img: "/milhoja.webp",
    categoria: "Principal",
    descripcionLarga:
      "Capas de hojaldre caramelizado entre foie de pato, manzana verde ácida y cebolla confitada lentamente para un bocado dulce y untuoso.",
    ingredientes: ["Foie de pato", "Hojaldre", "Manzana verde", "Cebolla", "Azúcar moreno"],
    alergenos: ["Gluten", "Huevo", "Lácteos"],
  },
  {
    name: "Torrija de Pan Brioche",
    desc: "Crema inglesa y su helado",
    img: "/pan brioche.webp",
    categoria: "Postre",
    descripcionLarga:
      "Torrija de brioche caramelizada por fuera y cremosa por dentro, bañada en crema inglesa de vainilla y servida con su propio helado.",
    ingredientes: ["Brioche", "Vainilla bourbon", "Nata", "Yema de huevo", "Azúcar"],
    alergenos: ["Gluten", "Huevo", "Lácteos"],
  },
];

export function Menus() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Reveal al entrar en viewport (equivale al ScrollTrigger start "top 60%"),
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
      { rootMargin: "0px 0px -40% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Entrada de las tarjetas: opacity + scale 0.95, dur 0.8, stagger 0.1.
  // Va en un wrapper para no pisar la transición de hover del <button> interno.
  const cardCls = `transition-all duration-[800ms] ease-out motion-reduce:transition-none ${
    revealed ? "opacity-100 scale-100" : "motion-safe:opacity-0 motion-safe:scale-95"
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
    <section ref={sectionRef} className="relative overflow-hidden bg-white py-24">
      {/* Animaciones del detalle (respetan prefers-reduced-motion) */}
      <style>{`
        @keyframes menuPanelIn {
          from { opacity: 0; transform: translateY(10px) scale(.97); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .menu-detail-panel { animation: none !important; }
        }
      `}</style>

      {/* Glow cálido sutil — lenguaje del sistema */}
      <div className="pointer-events-none absolute -left-32 top-16 h-[420px] w-[420px] rounded-full bg-amber-100/40 blur-3xl" aria-hidden="true" />

      <div className="container relative z-10 mx-auto max-w-[1280px] px-6">
        <div className="mb-16 text-center">
          <span className="mb-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
            <span className="h-px w-5 bg-amber-500/70" aria-hidden="true" />
            La carta
            <span className="h-px w-5 bg-amber-500/70" aria-hidden="true" />
          </span>
          <h2 className="mb-4 font-serif text-4xl font-semibold text-zinc-900 md:text-5xl">
            Cada ocasión requiere un menú diferente
          </h2>
          <p className="mx-auto max-w-2xl font-sans text-lg font-light leading-relaxed text-zinc-500">
            Explora las texturas y sabores diseñados por nuestros chefs, u opta por un menú creado
            completamente a medida para tus invitados.
          </p>
        </div>

        {/* Cards: carrusel horizontal con scroll-snap en mobile (corta el scroll
            vertical largo), grilla desde sm. Mismo patrón que la sección de chefs;
            el reset a grilla ocurre en sm porque Menus ya muestra 2 columnas ahí. */}
        <div
          role="region"
          aria-label="Menús destacados"
          className="mb-16 -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-mask-image:linear-gradient(to_right,#000_86%,transparent)] [mask-image:linear-gradient(to_right,#000_86%,transparent)] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 sm:[-webkit-mask-image:none] sm:[mask-image:none] lg:grid-cols-4"
        >
          {menuItems.map((item, idx) => (
            <div
              key={idx}
              className={`w-[85%] shrink-0 snap-start sm:w-auto sm:shrink-0 ${cardCls}`}
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
            <button
              type="button"
              onClick={() => setSelected(item)}
              aria-label={`Ver detalle de ${item.name}`}
              className="group flex w-full flex-col text-left outline-none transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:-translate-y-1"
            >
              {/* Imagen */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-black/5 transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-amber-900/[0.08] group-focus-visible:ring-2 group-focus-visible:ring-accent">
                <Image
                  src={item.img}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 backdrop-blur-sm">
                  {item.categoria}
                </span>
              </div>

              {/* Ficha */}
              <div className="px-1 pt-4">
                <span
                  className="mb-2 block h-px w-5 bg-amber-500/70 transition-all duration-500 group-hover:w-9"
                  aria-hidden="true"
                />
                <h3 className="font-serif text-xl font-semibold leading-tight text-zinc-900">
                  {item.name}
                </h3>
                <p className="mt-1 line-clamp-2 font-sans text-sm leading-snug text-zinc-500">
                  {item.desc}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    Ver plato
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/wizard">
            <Button
              size="lg"
              className="h-12 rounded-full bg-accent px-8 text-white shadow-xl shadow-green-400/25 transition-all hover:bg-green-600 hover:shadow-green-400/40"
            >
              Personalizar Menú
            </Button>
          </Link>
        </div>
      </div>

      {/* Detalle de receta — reutiliza el Dialog del sistema */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        {selected && (
          <DialogContent className="menu-detail-panel max-h-[90vh] max-w-3xl overflow-y-auto p-0 motion-safe:animate-[menuPanelIn_0.3s_ease-out] md:max-h-none md:overflow-hidden">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Cerrar detalle"
              className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-zinc-900"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Foto — más baja en mobile para que el modal no quede larguísimo */}
              <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[440px]">
                <Image
                  src={selected.img}
                  alt={selected.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 384px"
                  className="object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex flex-col p-6 md:p-7">
                <span className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                  <span className="h-px w-5 bg-amber-500/70" aria-hidden="true" />
                  {selected.categoria}
                </span>
                <h3 className="font-serif text-2xl font-semibold leading-tight text-zinc-900 md:text-3xl">
                  {selected.name}
                </h3>
                <p className="mt-3 font-sans text-sm leading-relaxed text-zinc-500">
                  {selected.descripcionLarga}
                </p>

                {/* Ingredientes */}
                <div className="mt-6">
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Ingredientes
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.ingredientes.map((ing) => (
                      <span
                        key={ing}
                        className="rounded-full bg-secondary px-2.5 py-1 text-xs text-zinc-700"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Alérgenos */}
                <div className="mt-5">
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Alérgenos
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.alergenos.map((al) => (
                      <span
                        key={al}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                        {al}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pie: CTA */}
                <div className="mt-auto flex pt-7">
                  <Link
                    href="/wizard"
                    className="group/cta inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-green-400/25 transition-all hover:bg-green-600 hover:shadow-green-400/40"
                  >
                    Diseñar mi menú
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
