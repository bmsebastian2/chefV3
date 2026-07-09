"use client";

// Puerta de entrada full-screen a la solicitud.
// Conduce la conversación (servicio → ocasión → cocina → comensales → preferencias;
// la rama semanal cambia ocasión/cocina por comidas), muestra una señal de
// disponibilidad por capacidad (sin listar chefs: el modelo es por postulaciones)
// y entrega al wizard ya pre-llenado. "Varios días" aún no tiene conversación
// propia: deriva directo al wizard con el servicio pre-seteado.
// La sección "descubrir chefs" de la home (ChefAssistant) queda intacta.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, RotateCcw, ChefHat, Sparkles, ArrowRight, Check, Plus,
} from "lucide-react";
import { getAssistantCuisines, matchChefs } from "./actions";
import { CUISINE_LABELS } from "./types";
import type { AssistantCuisine } from "./types";
import {
  INITIAL_ANSWERS, SERVICE_OPTIONS, OCCASION_CHIPS, OCCASION_CHIPS_MORE,
  MEALS_OPTIONS, GUESTS_OPTIONS, DIETARY_OPTIONS, buildWizardUrl,
} from "./flow";
import type { Answers, HistoryEntry } from "./flow";

// Orden de la conversación según servicio elegido. "results" es el beat de confianza.
type EntryStep = "service" | "occasion" | "cuisine" | "meals" | "guests" | "dietary";
type EntryPhase = EntryStep | "results";

const orderFor = (serviceType: Answers["serviceType"]): EntryStep[] =>
  serviceType === "weekly"
    ? ["service", "meals", "guests", "dietary"]
    : ["service", "occasion", "cuisine", "guests", "dietary"];

const STEP_LABELS: Record<EntryStep, string> = {
  service:  "Servicio",
  occasion: "Ocasión",
  cuisine:  "Cocina",
  meals:    "Comidas",
  guests:   "Comensales",
  dietary:  "Detalles",
};

// Cocinas visibles antes de "Más cocinas": llegan ordenadas por nº de chefs,
// así que las frecuentes ya están primero.
const CUISINES_VISIBLE = 4;

const QUESTIONS: Record<EntryStep, string> = {
  service:  "¿Qué tipo de servicio buscás?",
  occasion: "¿Qué ocasión estás imaginando?",
  cuisine:  "¿Qué cocina te tienta?",
  meals:    "¿Cuántas comidas por semana?",
  guests:   "¿Cuántos a la mesa?",
  dietary:  "¿Alguna preferencia en la cocina?",
};

export function AssistantEntry() {
  const router = useRouter();
  const [phase, setPhase] = useState<EntryPhase>("service");
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [cuisines, setCuisines] = useState<AssistantCuisine[]>([]);
  const [dietarySel, setDietarySel] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [occasionLabel, setOccasionLabel] = useState<string>("");
  const [moreOccasions, setMoreOccasions] = useState(false);
  const [customOccasion, setCustomOccasion] = useState("");
  const [moreCuisines, setMoreCuisines] = useState(false);

  useEffect(() => {
    getAssistantCuisines().then(setCuisines).catch(() => setCuisines([]));
  }, []);

  const pushHistory = (label: string, answer: string) =>
    setHistory((h) => [...h, { label, answer }]);

  // Catálogo completo de cocinas: primero las que tienen chefs activos
  // (llegan de la RPC ordenadas por cantidad), después el resto del catálogo,
  // que solo se ve al desplegar "Más cocinas". Elegir una sin chefs es válido:
  // match_chefs relaja el filtro automáticamente.
  const allCuisines: AssistantCuisine[] = [
    ...cuisines,
    ...Object.entries(CUISINE_LABELS)
      .filter(([value]) => !cuisines.some((c) => c.value === value))
      .map(([value, label]) => ({ value, label, count: 0 })),
  ];

  const pickService = (opt: (typeof SERVICE_OPTIONS)[number]) => {
    // "Varios días" aún no tiene conversación propia: entrega directo al wizard.
    if (opt.serviceType === "multiple") {
      router.push(buildWizardUrl({ ...INITIAL_ANSWERS, wizardService: opt.wizardService }, "assistant"));
      return;
    }
    // Arranque limpio de la rama: si vuelve y cambia de servicio, no arrastra
    // respuestas de la rama anterior (cocina/comidas).
    setAnswers({ ...INITIAL_ANSWERS, serviceType: opt.serviceType, wizardService: opt.wizardService });
    setDietarySel([]);
    setOccasionLabel("");
    setMoreOccasions(false);
    setCustomOccasion("");
    setMoreCuisines(false);
    setHistory([{ label: "Servicio", answer: opt.label }]);
    setPhase(opt.serviceType === "weekly" ? "meals" : "occasion");
  };

  // `occasion` es siempre un slug del CHECK de la BD; `label` es lo que se
  // muestra en la conversación (puede ser texto libre que persiste como "other").
  const pickOccasion = (occasion: string, label: string) => {
    setAnswers((a) => ({ ...a, occasion }));
    setOccasionLabel(label);
    pushHistory("Ocasión", label);
    setPhase("cuisine");
  };

  const pickMeals = (opt: (typeof MEALS_OPTIONS)[number]) => {
    setAnswers((a) => ({ ...a, mealsPerWeek: opt.value }));
    pushHistory("Comidas", opt.label);
    setPhase("guests");
  };

  const pickCuisine = (value: string | null, label: string) => {
    setAnswers((a) => ({ ...a, cuisine: value }));
    pushHistory("Cocina", label);
    setPhase("guests");
  };

  const pickGuests = (opt: (typeof GUESTS_OPTIONS)[number]) => {
    setAnswers((a) => ({ ...a, guestsRange: opt.range, guestsNum: opt.num }));
    pushHistory("Comensales", opt.label);
    setPhase("dietary");
  };

  const toggleDietary = (value: string) =>
    setDietarySel((s) => (s.includes(value) ? s.filter((v) => v !== value) : [...s, value]));

  const confirmDietary = () => {
    const labels = DIETARY_OPTIONS.filter((o) => dietarySel.includes(o.value)).map((o) => o.label);
    setAnswers((a) => ({ ...a, dietary: dietarySel }));
    pushHistory("Preferencias", labels.length ? labels.join(", ") : "Sin restricciones");
    setSearching(true);
    setCount(null);
    setPhase("results");
  };

  // Señal de capacidad: usamos el conteo de chefs disponibles, no sus identidades.
  useEffect(() => {
    if (phase !== "results") return;
    let active = true;
    matchChefs({
      serviceType: answers.serviceType,
      cuisine:     answers.cuisine,
      guests:      answers.guestsNum,
    })
      .then((r) => { if (active) setCount(r.chefs.length); })
      .catch(() => { if (active) setCount(0); })
      .finally(() => { if (active) setSearching(false); });
    return () => { active = false; };
  }, [phase, answers.serviceType, answers.cuisine, answers.guestsNum]);

  const order = orderFor(answers.serviceType);

  const goBack = () => {
    if (phase === "results") { setPhase("dietary"); return; }
    const i = order.indexOf(phase as EntryStep);
    if (i > 0) {
      setPhase(order[i - 1]);
      setHistory((h) => h.slice(0, -1));
    } else {
      router.push("/");
    }
  };

  const restart = () => {
    setAnswers(INITIAL_ANSWERS);
    setHistory([]);
    setDietarySel([]);
    setCount(null);
    setSearching(false);
    setOccasionLabel("");
    setPhase("service");
  };

  const goToWizard = () => router.push(buildWizardUrl(answers, "assistant"));

  const stepIndex = phase === "results" ? order.length : order.indexOf(phase as EntryStep);

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#FAFAFA] py-14 font-sans md:py-20">
      <style>{`
        @keyframes aeRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes aePing { 0% { transform: scale(.5); opacity: .7; } 70%, 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes aeGlow { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }
        .ae-rise { animation: aeRise .5s cubic-bezier(.22,.61,.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .ae-rise { animation: none; } }
      `}</style>

      {/* Textura de grano sutil (igual que la sección/hero) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />
      {/* Glows cálidos */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[460px] w-[460px] rounded-full bg-amber-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-green-100/40 blur-3xl" />

      <div className="container relative z-10 mx-auto max-w-[1280px] px-6">

        {/* Volver al inicio */}
        <div className="mx-auto mb-6 max-w-2xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>

        {/* Encabezado editorial */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-700">
            <span className="h-px w-8 bg-amber-500/50" />
            <Sparkles className="h-3.5 w-3.5" />
            ASISTENTE gastronómico
            <span className="h-px w-8 bg-amber-500/50" />
          </span>
          <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-900 md:text-5xl">
            Encontremos tu chef
            <span className="italic text-accent"> ideal</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md font-sans text-[15px] font-light leading-relaxed text-zinc-500">
            Unas pocas preguntas. Cero formularios. Armamos tu solicitud a tu medida.
          </p>
        </div>

        {/* Panel del concierge */}
        <div className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/70 shadow-[0_30px_80px_-32px_rgba(24,24,27,0.25)] backdrop-blur-xl">

          {/* Barra superior: marca + progreso + controles */}
          <div className="border-b border-zinc-100 px-6 py-5 md:px-8">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-accent/12 ring-1 ring-accent/25">
                  <ChefHat className="h-4 w-4 text-accent" />
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"
                    style={{ animation: "aeGlow 2.4s ease-in-out infinite" }}
                  />
                </span>
                <div className="leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Asistente</p>
                  <p className="font-serif text-base text-zinc-900">GetChef</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {phase !== "service" && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Atrás
                  </button>
                )}
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={restart}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reiniciar
                  </button>
                )}
              </div>
            </div>

            {/* Riel de progreso (carta de degustación) */}
            <div className="flex gap-2.5">
              {order.map((key, i) => {
                const done = i < stepIndex;
                const current = i === stepIndex;
                return (
                  <div key={key} className="flex-1">
                    <div className={`h-[3px] rounded-full transition-colors duration-500 ${done || current ? "bg-accent" : "bg-zinc-200"}`} />
                    <span className={`mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] transition-colors duration-300 ${
                      current ? "text-zinc-800" : done ? "text-zinc-400" : "text-zinc-300"
                    }`}>
                      <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <span className="hidden sm:inline">{STEP_LABELS[key]}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cuerpo */}
          <div className="px-6 py-8 md:px-8 md:py-10">

            {/* Rastro de selecciones previas */}
            {history.length > 0 && phase !== "results" && (
              <div className="ae-rise mb-8 flex flex-wrap gap-2">
                {history.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
                  >
                    <Check className="h-3 w-3 text-accent" />
                    {h.answer}
                  </span>
                ))}
              </div>
            )}

            {/* Pregunta + opciones */}
            {phase !== "results" && (
              <div key={phase}>
                <div className="ae-rise mb-7">
                  <span className="font-serif text-lg italic text-amber-600">
                    {String(stepIndex + 1).padStart(2, "0")}
                  </span>
                  <h2 className="mt-2 font-serif text-3xl font-semibold leading-[1.12] tracking-tight text-zinc-900 md:text-[2.5rem]">
                    {QUESTIONS[phase as EntryStep]}
                  </h2>
                </div>

                {phase === "service" && (
                  <div className="grid grid-cols-1 gap-3">
                    {SERVICE_OPTIONS.map((opt, i) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => pickService(opt)}
                        style={{ animationDelay: `${i * 60}ms` }}
                        className="ae-rise group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-green-500/5"
                      >
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-100 ring-1 ring-zinc-200/60 transition-colors group-hover:bg-accent/12 group-hover:ring-accent/25">
                          <opt.Icon className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-accent" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-serif text-base text-zinc-900">{opt.label}</span>
                          <span className="block text-xs text-zinc-500">{opt.desc}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
                      </button>
                    ))}
                  </div>
                )}

                {phase === "occasion" && (
                  <div>
                    <div className="flex flex-wrap gap-2.5">
                      {OCCASION_CHIPS.map((opt, i) => (
                        <EntryPill key={opt.label} delay={i * 45} onClick={() => pickOccasion(opt.occasion, opt.label)}>
                          {opt.label}
                        </EntryPill>
                      ))}
                      {!moreOccasions && (
                        <EntryPill delay={OCCASION_CHIPS.length * 45} onClick={() => setMoreOccasions(true)} ghost>
                          <Plus className="h-3.5 w-3.5" /> Otra ocasión
                        </EntryPill>
                      )}
                    </div>
                    {moreOccasions && (
                      <div className="mt-2.5">
                        <div className="flex flex-wrap gap-2.5">
                          {OCCASION_CHIPS_MORE.map((opt, i) => (
                            <EntryPill key={opt.label} delay={i * 45} onClick={() => pickOccasion(opt.occasion, opt.label)}>
                              {opt.label}
                            </EntryPill>
                          ))}
                        </div>
                        <form
                          style={{ animationDelay: `${OCCASION_CHIPS_MORE.length * 45}ms` }}
                          className="ae-rise mt-3 flex max-w-md items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-5 pr-1.5 transition-colors focus-within:border-accent/50"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const text = customOccasion.trim();
                            if (text) pickOccasion("other", text);
                          }}
                        >
                          <input
                            type="text"
                            value={customOccasion}
                            onChange={(e) => setCustomOccasion(e.target.value)}
                            placeholder="Contanos tu ocasión…"
                            maxLength={60}
                            className="min-w-0 flex-1 bg-transparent py-2 text-base text-zinc-900 outline-none placeholder:text-zinc-400"
                          />
                          <button
                            type="submit"
                            disabled={!customOccasion.trim()}
                            aria-label="Confirmar ocasión"
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white transition-all hover:brightness-110 disabled:bg-zinc-100 disabled:text-zinc-400"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {phase === "cuisine" && (
                  <div className="flex flex-wrap gap-2.5">
                    {(moreCuisines ? allCuisines : allCuisines.slice(0, CUISINES_VISIBLE)).map((c, i) => (
                      <EntryPill
                        key={c.value}
                        // Las que aparecen al desplegar animan desde cero, no arrastran el stagger inicial.
                        delay={(i >= CUISINES_VISIBLE ? i - CUISINES_VISIBLE : i) * 45}
                        onClick={() => pickCuisine(c.value, c.label)}
                      >
                        {c.label}
                      </EntryPill>
                    ))}
                    {!moreCuisines && allCuisines.length > CUISINES_VISIBLE && (
                      <EntryPill delay={CUISINES_VISIBLE * 45} onClick={() => setMoreCuisines(true)} ghost>
                        <Plus className="h-3.5 w-3.5" /> Más cocinas
                      </EntryPill>
                    )}
                    <EntryPill delay={(CUISINES_VISIBLE + 1) * 45} onClick={() => pickCuisine(null, "Me da igual")} ghost>
                      <Sparkles className="h-3.5 w-3.5" /> Me da igual
                    </EntryPill>
                  </div>
                )}

                {phase === "meals" && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {MEALS_OPTIONS.map((opt, i) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => pickMeals(opt)}
                        style={{ animationDelay: `${i * 60}ms` }}
                        className="ae-rise group flex flex-col items-center justify-center gap-1 rounded-2xl border border-zinc-200 bg-white px-3 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-green-500/5"
                      >
                        <span className="font-serif text-xl text-zinc-900 transition-colors group-hover:text-accent">{opt.label}</span>
                        <span className="text-[11px] uppercase tracking-wider text-zinc-400">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                )}

                {phase === "guests" && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {GUESTS_OPTIONS.map((opt, i) => (
                      <button
                        key={opt.range}
                        type="button"
                        onClick={() => pickGuests(opt)}
                        style={{ animationDelay: `${i * 60}ms` }}
                        className="ae-rise group flex flex-col items-center justify-center gap-1 rounded-2xl border border-zinc-200 bg-white px-3 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-green-500/5"
                      >
                        <span className="font-serif text-xl text-zinc-900 transition-colors group-hover:text-accent">{opt.label}</span>
                        <span className="text-[11px] uppercase tracking-wider text-zinc-400">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                )}

                {phase === "dietary" && (
                  <div>
                    <div className="flex flex-wrap gap-2.5">
                      {DIETARY_OPTIONS.map((opt, i) => {
                        const on = dietarySel.includes(opt.value);
                        return (
                          <EntryPill key={opt.value} delay={i * 45} active={on} onClick={() => toggleDietary(opt.value)}>
                            {on && <Check className="h-3.5 w-3.5" />}
                            {opt.label}
                          </EntryPill>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={confirmDietary}
                      className="ae-rise mt-7 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-400/25 transition-all hover:-translate-y-0.5 hover:bg-green-600"
                    >
                      {dietarySel.length ? "Continuar" : "Sin restricciones, continuar"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Beat de confianza ──────────────────────────────────────────── */}
            {phase === "results" && (
              <div className="ae-rise flex flex-col items-center py-2 text-center">
                {searching ? (
                  <>
                    {/* Radar de disponibilidad */}
                    <span className="relative flex h-20 w-20 items-center justify-center">
                      <span className="absolute inset-0 rounded-full border border-accent/20" />
                      <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
                      <span className="absolute inset-0 rounded-full bg-accent/20" style={{ animation: "aePing 2s ease-out infinite" }} />
                      <ChefHat className="relative h-8 w-8 text-accent" />
                    </span>
                    <p className="mt-6 font-serif text-2xl italic text-zinc-600">Buscando disponibilidad…</p>
                  </>
                ) : count && count > 0 ? (
                  <>
                    <span className="relative flex h-20 w-20 items-center justify-center">
                      <span className="absolute inset-0 rounded-full bg-accent/10" style={{ animation: "aePing 2.6s ease-out infinite" }} />
                      <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent/12 ring-1 ring-accent/25">
                        <Check className="h-9 w-9 text-accent" strokeWidth={2.5} />
                      </span>
                    </span>
                    <span className="mt-7 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-semibold text-green-700">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                      </span>
                      {count} {count === 1 ? "chef disponible" : "chefs disponibles"}
                    </span>
                    <h2 className="mt-5 font-serif text-3xl font-semibold leading-tight text-zinc-900 md:text-4xl">
                      Tenemos chefs para tu mesa
                    </h2>
                    <p className="mt-4 max-w-md font-sans text-[15px] font-light leading-relaxed text-zinc-500">
                      Contamos con chefs disponibles para experiencias como{" "}
                      {occasionLabel ? `tu ${occasionLabel.toLowerCase()}` : "la tuya"}
                      {answers.guestsNum ? ` de ${answers.guestsNum} personas` : ""}. Terminá tu
                      solicitud y recibirás propuestas de menú a medida.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
                      <ChefHat className="h-9 w-9 text-amber-500" />
                    </span>
                    <h2 className="mt-7 font-serif text-3xl font-semibold leading-tight text-zinc-900 md:text-4xl">
                      Sumamos chefs para experiencias como la tuya
                    </h2>
                    <p className="mt-4 max-w-md font-sans text-[15px] font-light leading-relaxed text-zinc-500">
                      Creá tu solicitud igual y nuestros chefs te propondrán algo a medida
                      para tu evento.
                    </p>
                  </>
                )}

                {!searching && (
                  <button
                    type="button"
                    onClick={goToWizard}
                    className="ae-rise mt-9 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-green-400/25 transition-all hover:-translate-y-0.5 hover:bg-green-600"
                  >
                    Continuar con mi solicitud
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Escape hatch: solicitar sin asistente (para usuarios apurados) */}
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-zinc-400">
          ¿Preferís el formulario directo?{" "}
          <Link
            href="/wizard"
            className="font-medium text-zinc-600 underline underline-offset-2 transition-colors hover:text-zinc-900"
          >
            Completá tu solicitud sin asistente
          </Link>
        </p>
      </div>
    </section>
  );
}

// ── Pill del asistente (presentacional) ───────────────────────────────────────
function EntryPill({
  children, onClick, active = false, ghost = false, delay = 0,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  ghost?: boolean;
  delay?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={`ae-rise inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : ghost
            ? "border-dashed border-zinc-300 bg-transparent text-zinc-500 hover:border-amber-400 hover:text-amber-700"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-accent/50 hover:text-zinc-900 hover:shadow-md hover:shadow-green-500/5"
      }`}
    >
      {children}
    </button>
  );
}
