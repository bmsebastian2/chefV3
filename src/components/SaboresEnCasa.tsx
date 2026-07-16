"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, UtensilsCrossed, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Banner gastronómico — mosaico editorial asimétrico.
 *
 * Cada tarjeta abre un detalle (modal) con el mismo diseño y comportamiento
 * que la sección "Cada ocasión requiere un menú diferente" (Menus.tsx).
 *
 * ASSETS → en /public con estos nombres exactos:
 *   - Rissotto.jpg → protagonista vertical
 *   - Chef.jpg / Chef.png → apaisada superior
 *   - Coulant.jpg → cuadrada inferior izq.
 *   - Ceviche.jpg → cuadrada inferior der.
 * Si una foto falla, la celda muestra un placeholder con el nombre del plato.
 *
 * Datos estáticos locales — reemplazar textos/precios por los reales cuando estén.
 */
type Dish = {
  name: string;
  note: string;
  img: string;
  categoria: string;
  descripcionLarga: string;
  ingredientes: string[];
  alergenos: string[];
};

const dishes: Dish[] = [
  {
    name: "Risotto de hongos",
    note: "trufa negra y parmesano 24 meses",
    img: "/Rissotto.webp",
    categoria: "Principal",
    descripcionLarga:
      "Arroz carnaroli mantecado al momento con una selección de hongos salteados, lascas de parmesano curado 24 meses y un aroma final de trufa negra.",
    ingredientes: ["Arroz carnaroli", "Hongos de temporada", "Parmesano 24 meses", "Trufa negra", "Mantequilla", "Caldo de verduras"],
    alergenos: ["Lácteos", "Sulfitos"],
  },
  {
    name: "Mesa de autor",
    note: "selección del chef",
    img: "/Chef.webp",
    categoria: "Experiencia",
    descripcionLarga:
      "Un menú degustación diseñado en vivo por el chef según el mercado del día. Una secuencia de bocados de autor pensada para sorprender a tus invitados de principio a fin.",
    ingredientes: ["Producto fresco del día", "Selección del chef", "Maridaje sugerido"],
    alergenos: ["Consultar según menú"],
  },
  {
    name: "Coulant de chocolate",
    note: "helado de vainilla bourbon",
    img: "/Coulant.jpg",
    categoria: "Postre",
    descripcionLarga:
      "Bizcocho tibio de chocolate con corazón fundente que se derrama al primer corte, acompañado de un helado de vainilla bourbon que equilibra su intensidad.",
    ingredientes: ["Chocolate negro 70%", "Mantequilla", "Huevo", "Harina", "Vainilla bourbon", "Nata"],
    alergenos: ["Gluten", "Huevo", "Lácteos"],
  },
  {
    name: "Ceviche nikkei",
    note: "leche de tigre y cítricos",
    img: "/Ceviche.webp",
    categoria: "Entrante",
    descripcionLarga:
      "Pescado fresco marinado en una leche de tigre nikkei de cítricos y soja, con el punto justo de ají y un toque de jengibre que despierta el paladar.",
    ingredientes: ["Pescado blanco fresco", "Lima", "Soja", "Ají limo", "Jengibre", "Cebolla morada", "Cilantro"],
    alergenos: ["Pescado", "Soja"],
  },
];

export function SaboresEnCasa() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<Dish | null>(null);

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
            <DishCard dish={dishes[0]} priority onSelect={setSelected} className={`col-start-1 row-span-2 row-start-1 ${animCls}`} style={animStyle(1)} />
            <DishCard dish={dishes[1]} onSelect={setSelected} className={`col-span-2 col-start-2 row-start-1 ${animCls}`} style={animStyle(2)} />
            <DishCard dish={dishes[2]} onSelect={setSelected} className={`col-start-2 row-start-2 ${animCls}`} style={animStyle(3)} />
            <DishCard dish={dishes[3]} onSelect={setSelected} className={`col-start-3 row-start-2 ${animCls}`} style={animStyle(4)} />
          </div>

          {/* ── Mosaico (mobile): protagonista + tira con scroll-snap ── */}
          <div className="lg:hidden">
            <DishCard dish={dishes[0]} priority onSelect={setSelected} className={`aspect-[4/3] ${animCls}`} style={animStyle(1)} />
            <div className="-mx-6 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-mask-image:linear-gradient(to_right,#000_86%,transparent)] [mask-image:linear-gradient(to_right,#000_86%,transparent)]">
              {dishes.slice(1).map((dish, i) => (
                <DishCard
                  key={dish.img}
                  dish={dish}
                  onSelect={setSelected}
                  className={`aspect-[4/3] w-[72%] shrink-0 snap-start ${animCls}`}
                  style={animStyle(i + 2)}
                />
              ))}
            </div>
          </div>
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

function DishCard({
  dish,
  className = "",
  style,
  priority = false,
  onSelect,
}: {
  dish: Dish;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  onSelect: (dish: Dish) => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(dish)}
      aria-label={`Ver detalle de ${dish.name}`}
      className={`group relative block w-full overflow-hidden rounded-2xl text-left outline-none ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-xl hover:shadow-amber-900/[0.08] focus-visible:ring-2 focus-visible:ring-accent ${className}`}
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
    </button>
  );
}
