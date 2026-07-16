"use client";

// Constructor de carta de la home (sección "El menú de esta noche").
//
// Tercer punto de entrada a la solicitud, junto al wizard directo y al
// asistente: compone una carta y entrega al wizard pre-llenado (Servicio 1).
// El handoff y el formato del texto viven en carta.ts; acá solo la experiencia.
//
// Caparazón propio y no ui/dialog.tsx: ese primitivo centra su contenido con un
// p-4 fijo que no se puede desactivar desde afuera, así que no llega a pantalla
// completa en mobile, que es donde esta pieza tiene que brillar. El
// comportamiento de modal (Escape, foco, scroll) sí es el mismo del primitivo:
// se comparte vía useModalBehavior para no mantener dos implementaciones.

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useModalBehavior } from "@/components/ui/dialog";
import { OCCASION_CHIPS } from "@/components/assistant/flow";
import {
  COURSE_LABEL,
  COURSE_ORDER,
  dishesFor,
  type Course,
  type Momento,
} from "./dishes";
import {
  buildCartaWizardUrl,
  platosDeCarta,
  romano,
  type Seleccion,
} from "./carta";

// ── Las dos salas ────────────────────────────────────────────────────────────
// El único dato que el Servicio 1 necesita de acá es el momento (mealTime), así
// que en vez de gastarlo en un radio button es la luz de la sala. Un mismo juego
// de variables, tres estados: la sala vacía antes de elegir, el mediodía y la
// noche. El color de marca (verde) no entra en esta paleta: se reserva para el
// único botón que confirma.
type Sala = Momento | "off";

const SALAS: Record<Sala, React.CSSProperties> = {
  off: {
    "--sala": "#141416",
    "--tinta": "#FAFAFA",
    "--tenue": "#71717A",
    "--vela": "#A1A1AA",
    "--linea": "rgba(161,161,170,0.18)",
  } as React.CSSProperties,
  dinner: {
    "--sala": "#18181B",
    "--tinta": "#FAFAFA",
    "--tenue": "#A1A1AA",
    "--vela": "#F59E0B",
    "--linea": "rgba(245,158,11,0.22)",
  } as React.CSSProperties,
  lunch: {
    "--sala": "#FFFDF7",
    "--tinta": "#18181B",
    "--tenue": "#71717A",
    "--vela": "#D97706",
    "--linea": "rgba(217,119,6,0.20)",
  } as React.CSSProperties,
};

const MOMENTOS: { momento: Momento; nombre: string; luz: string }[] = [
  { momento: "lunch",  nombre: "Almuerzo", luz: "Luz de mediodía, sobremesa larga." },
  { momento: "dinner", nombre: "Cena",     luz: "Luz de vela, la casa en calma." },
];

// Cloche con vapor. El vapor lo anima .menu-steam (globals.css), que ya respeta
// reduced-motion. Trazo en currentColor para que tome la luz de cada sala.
function Cloche({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-block h-11 w-14 ${className}`} aria-hidden="true">
      <svg
        className="menu-steam absolute left-1/2 top-0 -translate-x-1/2"
        width="26" height="16" viewBox="0 0 26 16"
        fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      >
        <path d="M7 15c0-3 2-3 2-6s-2-3-2-6" opacity=".7" />
        <path d="M13 15c0-3 2-3 2-6s-2-3-2-6" opacity=".7" />
        <path d="M19 15c0-3 2-3 2-6s-2-3-2-6" opacity=".7" />
      </svg>
      <svg
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        width="56" height="34" viewBox="0 0 56 34"
        fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M4 30h48" />
        <path d="M8 30a20 20 0 0 1 40 0" />
        <path d="M28 10V6" />
        <circle cx="28" cy="5" r="2" />
      </svg>
    </span>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

type Pantalla = "momento" | "cocina" | "carta";

export function MenuBuilderDialog({ open, onClose }: Props) {
  const router = useRouter();
  const [pantalla, setPantalla] = useState<Pantalla>("momento");
  const [momento, setMomento] = useState<Momento | null>(null);
  const [seleccion, setSeleccion] = useState<Seleccion>({});
  const [occasion, setOccasion] = useState("");
  const [sellada, setSellada] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useModalBehavior({ open, onClose, panelRef });

  const platos = useMemo(() => platosDeCarta(seleccion), [seleccion]);

  // El numeral de cada plato sale de su lugar real en la carta: si no hay
  // entrada, el principal es I. Es el orden en que llegan a la mesa.
  const numeralPorPlato = useMemo(
    () => new Map(platos.map((d, i) => [d.id, romano(i)])),
    [platos]
  );

  // Sin guard de montaje: el portal solo existe con open=true, que solo llega
  // por un click del usuario. En SSR nunca se toca document.
  if (!open) return null;

  const sala: Sala = momento ?? "off";

  const elegir = (course: Course, id: string) =>
    setSeleccion((prev) => ({
      ...prev,
      // Tocar el plato elegido lo saca; tocar otro del mismo tiempo lo reemplaza.
      [course]: prev[course] === id ? undefined : id,
    }));

  const abrirSala = (m: Momento) => {
    // Cambiar de sala descarta lo compuesto: los platos de un momento no
    // siempre se sirven en el otro, y una carta a medio migrar miente.
    if (momento && m !== momento) setSeleccion({});
    setMomento(m);
    setPantalla("cocina");
  };

  const reservar = () => {
    if (!momento || !platos.length) return;
    const url = buildCartaWizardUrl(seleccion, momento, occasion);
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sinMovimiento) {
      router.push(url);
      return;
    }
    // El sello: un beat para que la carta se cierre antes de irse al wizard.
    setSellada(true);
    window.setTimeout(() => router.push(url), 420);
  };

  const volver = () => {
    if (pantalla === "carta") setPantalla("cocina");
    else if (pantalla === "cocina") setPantalla("momento");
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-stretch justify-center md:items-center md:p-6">
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="carta-titulo"
        tabIndex={-1}
        style={SALAS[sala]}
        className={`relative z-10 flex h-full w-full flex-col overflow-hidden bg-[var(--sala)] text-[var(--tinta)] outline-none transition-all duration-700 ease-out motion-reduce:transition-none md:h-[min(760px,88vh)] md:w-[min(1080px,94vw)] md:rounded-2xl md:shadow-2xl md:shadow-zinc-950/40 ${
          sellada ? "motion-safe:scale-[0.98] motion-safe:opacity-0" : ""
        }`}
      >
        {/* Un solo glow: la vela de la sala. */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--vela)] opacity-10 blur-3xl transition-colors duration-700"
          aria-hidden="true"
        />

        {/* ── Encabezado ───────────────────────────────────────────────────── */}
        <header className="relative flex items-center justify-between gap-4 border-b border-[var(--linea)] px-5 py-4 md:px-8">
          <div className="flex w-16 items-center">
            {pantalla !== "momento" && (
              <button
                type="button"
                onClick={volver}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--tenue)] transition-colors hover:bg-[var(--vela)]/10 hover:text-[var(--tinta)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vela)]"
                aria-label="Volver"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--vela)]">
            <span className="h-px w-5 bg-[var(--vela)]/70" aria-hidden="true" />
            Tu carta
          </span>

          <div className="flex w-16 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--tenue)] transition-colors hover:bg-[var(--vela)]/10 hover:text-[var(--tinta)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vela)]"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ── Uno · El momento ─────────────────────────────────────────────── */}
        {pantalla === "momento" && (
          <div className="relative flex flex-1 flex-col justify-center overflow-y-auto px-6 py-10 md:px-12">
            <h2
              id="carta-titulo"
              className="mb-2 text-center font-serif text-3xl font-semibold md:text-4xl"
            >
              ¿Cuándo se sienta tu mesa?
            </h2>
            <p className="mx-auto mb-10 max-w-sm text-center text-sm leading-relaxed text-[var(--tenue)]">
              La hora cambia la carta. Elegí y encendemos la sala.
            </p>

            <div className="mx-auto grid w-full max-w-2xl gap-4 md:grid-cols-2">
              {MOMENTOS.map(({ momento: m, nombre, luz }) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => abrirSala(m)}
                  style={SALAS[m]}
                  className="group flex flex-col items-start gap-4 rounded-2xl border border-[var(--linea)] bg-[var(--sala)] p-6 text-left text-[var(--tinta)] transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vela)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <Cloche className="text-[var(--vela)]" />
                  <div>
                    <p className="font-serif text-2xl font-semibold">{nombre}</p>
                    <p className="mt-1 text-sm leading-snug text-[var(--tenue)]">{luz}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Dos · La cocina ──────────────────────────────────────────────── */}
        {pantalla === "cocina" && momento && (
          <>
            <div className="relative flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-8 md:px-10">
                <h2 id="carta-titulo" className="sr-only">
                  Componé tu carta
                </h2>

                {COURSE_ORDER.map((course) => (
                  <section key={course} className="mb-12 last:mb-2">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--vela)]">
                        {COURSE_LABEL[course]}
                      </span>
                      <span className="h-px flex-1 bg-[var(--linea)]" aria-hidden="true" />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {dishesFor(course, momento).map((d) => {
                        const elegido = seleccion[course] === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => elegir(course, d.id)}
                            aria-pressed={elegido}
                            className={`flex items-baseline gap-3 rounded-xl border p-4 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vela)] ${
                              elegido
                                ? "border-transparent bg-[var(--tinta)] text-[var(--sala)]"
                                : "border-[var(--linea)] hover:bg-[var(--vela)]/8"
                            }`}
                          >
                            {/* El numeral ES el estado elegido: sin checks ni
                                colores extra, el plato se gana su lugar. */}
                            <span
                              className={`w-5 flex-shrink-0 font-serif text-base italic ${
                                elegido ? "opacity-100" : "opacity-0"
                              }`}
                              aria-hidden={!elegido}
                            >
                              {numeralPorPlato.get(d.id) ?? ""}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-serif text-[15px] font-semibold leading-tight">
                                {d.name}
                              </span>
                              <span
                                className={`mt-0.5 block text-xs leading-snug ${
                                  elegido ? "opacity-70" : "text-[var(--tenue)]"
                                }`}
                              >
                                {d.note}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              {/* La carta viva, al lado, en desktop. */}
              <aside className="hidden w-[340px] flex-col border-l border-[var(--linea)] px-7 py-8 md:flex">
                <CartaLineas
                  platos={platos}
                  numerales={numeralPorPlato}
                  onQuitar={(course) => elegir(course, seleccion[course]!)}
                />
              </aside>
            </div>

            <footer className="relative flex items-center gap-4 border-t border-[var(--linea)] px-5 py-4 md:px-10">
              {/* La tira: en mobile es la única carta visible mientras componés. */}
              <div className="min-w-0 flex-1 overflow-x-auto md:hidden">
                {platos.length ? (
                  <p className="flex items-baseline gap-3 whitespace-nowrap">
                    {platos.map((d) => (
                      <span key={d.id} className="flex items-baseline gap-1.5">
                        <span className="font-serif text-sm italic text-[var(--vela)]">
                          {numeralPorPlato.get(d.id)}
                        </span>
                        <span className="font-serif text-sm">{d.name}</span>
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--tenue)]">Tu carta está en blanco.</p>
                )}
              </div>
              <p className="hidden flex-1 text-xs text-[var(--tenue)] md:block">
                Elegí uno por tiempo. Podés dejarle alguno al chef.
              </p>
              <button
                type="button"
                onClick={() => setPantalla("carta")}
                disabled={!platos.length}
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[var(--tinta)] px-5 py-2.5 text-xs font-semibold text-[var(--sala)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vela)] disabled:opacity-30"
              >
                Ver mi carta
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </footer>
          </>
        )}

        {/* ── Tres · La carta ──────────────────────────────────────────────── */}
        {pantalla === "carta" && momento && (
          <>
            <div className="relative flex-1 overflow-y-auto px-6 py-10 md:px-12">
              <div className="mx-auto max-w-md">
                <div className="mb-8 flex flex-col items-center text-center">
                  <Cloche className="mb-3 text-[var(--vela)]" />
                  <h2 id="carta-titulo" className="font-serif text-3xl font-semibold">
                    {momento === "dinner" ? "Cena" : "Almuerzo"}
                  </h2>
                </div>

                <CartaLineas
                  platos={platos}
                  numerales={numeralPorPlato}
                  onQuitar={(course) => elegir(course, seleccion[course]!)}
                />

                {/* La dedicatoria: la ocasión no es un campo, es el encabezado
                    que las cartas llevan de verdad. Y es lo que hace que el
                    wizard aterrice directo en la dirección. */}
                <div className="mt-10 border-t border-[var(--linea)] pt-6">
                  <p className="mb-3 text-center font-serif text-lg italic text-[var(--tenue)]">
                    Una carta para{" "}
                    {occasion ? (
                      <span className="text-[var(--tinta)] not-italic">
                        {OCCASION_CHIPS.find((c) => c.occasion === occasion)?.label.toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-[var(--tenue)]">…</span>
                    )}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {OCCASION_CHIPS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => setOccasion(occasion === c.occasion ? "" : c.occasion)}
                        aria-pressed={occasion === c.occasion}
                        className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vela)] ${
                          occasion === c.occasion
                            ? "border-transparent bg-[var(--tinta)] text-[var(--sala)]"
                            : "border-[var(--linea)] text-[var(--tenue)] hover:text-[var(--tinta)]"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <footer className="relative border-t border-[var(--linea)] px-6 py-4 md:px-12">
              <div className="mx-auto flex max-w-md items-center gap-4">
                <button
                  type="button"
                  onClick={volver}
                  className="text-xs text-[var(--tenue)] transition-colors hover:text-[var(--tinta)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vela)]"
                >
                  Seguir componiendo
                </button>
                <button
                  type="button"
                  onClick={reservar}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
                >
                  Reservar esta carta
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── La carta viva ────────────────────────────────────────────────────────────
// Misma pieza en el panel de desktop y en la pantalla final: una sola forma de
// dibujar la carta, un solo lugar donde se quita un plato.
function CartaLineas({
  platos,
  numerales,
  onQuitar,
}: {
  platos: ReturnType<typeof platosDeCarta>;
  numerales: Map<string, string>;
  onQuitar: (course: Course) => void;
}) {
  if (!platos.length) {
    return (
      <p className="font-serif text-sm italic leading-relaxed text-[var(--tenue)]">
        Tu carta está en blanco. Elegí un plato y aparece acá.
      </p>
    );
  }

  return (
    <ul>
      {platos.map((d) => (
        <li
          key={d.id}
          className="group flex items-baseline gap-3 border-t border-[var(--linea)] py-3 first:border-t-0 first:pt-0"
        >
          <span className="w-5 flex-shrink-0 font-serif text-base italic text-[var(--vela)]">
            {numerales.get(d.id)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[15px] font-semibold leading-tight">{d.name}</p>
            {!d.chefChoice && (
              <p className="mt-0.5 text-xs leading-snug text-[var(--tenue)]">{d.note}</p>
            )}
          </div>
          {/* Siempre visible en mobile (no hay hover que lo revele); en desktop
              aparece al pasar por la línea para no ensuciar la carta. */}
          <button
            type="button"
            onClick={() => onQuitar(d.course)}
            aria-label={`Quitar ${d.name}`}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[var(--tenue)] transition-opacity hover:text-[var(--tinta)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vela)] md:opacity-0 md:group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
