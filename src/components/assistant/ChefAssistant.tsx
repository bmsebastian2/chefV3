"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChefHat, Sparkles, ArrowRight, ArrowUpRight, RotateCcw, Star, MapPin, Check,
} from "lucide-react";
import { getAssistantCuisines, matchChefs } from "./actions";
import { cuisineLabel } from "./types";
import type { AssistantCuisine, MatchResult } from "./types";
import {
  stepsFor, OCCASION_OPTIONS, MEALS_OPTIONS, GUESTS_OPTIONS,
  DIETARY_OPTIONS, INITIAL_ANSWERS, buildWizardUrl,
} from "./flow";
import type { Answers, Phase, HistoryEntry } from "./flow";

export function ChefAssistant() {
  const [phase, setPhase] = useState<Phase>("occasion");
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [cuisines, setCuisines] = useState<AssistantCuisine[]>([]);
  const [dietarySel, setDietarySel] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAssistantCuisines().then(setCuisines).catch(() => setCuisines([]));
  }, []);

  // Pausa de "composición" antes de revelar cada pregunta (caret editorial).
  useEffect(() => {
    if (phase === "results") return;
    const t = setTimeout(() => setRevealed(true), 700);
    return () => clearTimeout(t);
  }, [phase]);

  // Búsqueda al llegar a resultados (estado preparado en confirmDietary).
  useEffect(() => {
    if (phase !== "results") return;
    let active = true;
    matchChefs({
      serviceType: answers.serviceType,
      cuisine:     answers.cuisine,
      guests:      answers.guestsNum,
    })
      .then((r) => { if (active) setResult(r); })
      .catch(() => { if (active) setResult({ chefs: [], matchLevel: 0, relaxed: false }); })
      .finally(() => { if (active) setSearching(false); });
    return () => { active = false; };
  }, [phase, answers.serviceType, answers.cuisine, answers.guestsNum]);

  const pushHistory = (label: string, answer: string) =>
    setHistory((h) => [...h, { label, answer }]);

  const pickOccasion = (opt: typeof OCCASION_OPTIONS[number]) => {
    setAnswers((a) => ({ ...a, serviceType: opt.serviceType, wizardService: opt.wizardService, occasion: opt.occasion }));
    pushHistory("Ocasión", opt.label);
    setRevealed(false);
    setPhase(opt.serviceType === "weekly" ? "meals" : "cuisine");
  };

  const pickCuisine = (value: string | null, label: string) => {
    setAnswers((a) => ({ ...a, cuisine: value }));
    pushHistory("Cocina", label);
    setRevealed(false);
    setPhase("guests");
  };

  const pickMeals = (opt: typeof MEALS_OPTIONS[number]) => {
    setAnswers((a) => ({ ...a, mealsPerWeek: opt.value }));
    pushHistory("Comidas", opt.label);
    setRevealed(false);
    setPhase("guests");
  };

  const pickGuests = (opt: typeof GUESTS_OPTIONS[number]) => {
    setAnswers((a) => ({ ...a, guestsRange: opt.range, guestsNum: opt.num }));
    pushHistory("Comensales", opt.label);
    setRevealed(false);
    setPhase("dietary");
  };

  const toggleDietary = (value: string) =>
    setDietarySel((s) => (s.includes(value) ? s.filter((v) => v !== value) : [...s, value]));

  const confirmDietary = () => {
    const labels = DIETARY_OPTIONS.filter((o) => dietarySel.includes(o.value)).map((o) => o.label);
    setAnswers((a) => ({ ...a, dietary: dietarySel }));
    pushHistory("Restricciones", labels.length ? labels.join(", ") : "Sin restricciones");
    setSearching(true);
    setResult(null);
    setPhase("results");
  };

  const restart = () => {
    setAnswers(INITIAL_ANSWERS);
    setHistory([]);
    setDietarySel([]);
    setResult(null);
    setSearching(false);
    setRevealed(false);
    setPhase("occasion");
  };

  const wizardUrl = buildWizardUrl(answers);
  const steps = stepsFor(answers.serviceType);
  const idx = phase === "results" ? steps.length : steps.findIndex((s) => s.key === phase);

  return (
    <section id="asistente" className="relative overflow-hidden scroll-mt-24 bg-[#FAFAFA] py-24 md:py-32">
      <style>{`
        @keyframes caRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes caCaret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes caGlow { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }
        .ca-rise { animation: caRise .6s cubic-bezier(.22,.61,.36,1) both; }
        .ca-caret { animation: caCaret 1s step-end infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ca-rise { animation: none; }
          .ca-caret { animation: none; opacity: 1; }
        }
      `}</style>

      {/* Textura de grano sutil (igual que el hero) */}
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
        {/* Encabezado editorial */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-700">
            <span className="h-px w-8 bg-amber-500/50" />
            <Sparkles className="h-3.5 w-3.5" />
            ASISTENTE gastronómico
            <span className="h-px w-8 bg-amber-500/50" />
          </span>
          <h2 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-900 md:text-5xl">
            Encontremos tu chef
            <span className="italic text-accent"> ideal</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md font-sans text-[15px] font-light leading-relaxed text-zinc-500">
            Cuatro preguntas. Cero formularios. Te presentamos a los chefs hechos para tu mesa.
          </p>
        </div>

        {/* Panel del concierge */}
        <div
          ref={panelRef}
          className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/70 shadow-[0_30px_80px_-32px_rgba(24,24,27,0.25)] backdrop-blur-xl"
        >
          {/* Barra superior: marca + progreso + reiniciar */}
          <div className="border-b border-zinc-100 px-6 py-5 md:px-8">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-accent/12 ring-1 ring-accent/25">
                  <ChefHat className="h-4 w-4 text-accent" />
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"
                    style={{ animation: "caGlow 2.4s ease-in-out infinite" }}
                  />
                </span>
                <div className="leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Asistente</p>
                  <p className="font-serif text-base text-zinc-900">GetChef</p>
                </div>
              </div>
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

            {/* Riel de progreso (carta de degustación) */}
            <div className="flex gap-2.5">
              {steps.map((s, i) => {
                const done = i < idx;
                const current = i === idx;
                return (
                  <div key={s.key} className="flex-1">
                    <div className={`h-[3px] rounded-full transition-colors duration-500 ${done || current ? "bg-accent" : "bg-zinc-200"}`} />
                    <span className={`mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] transition-colors duration-300 ${
                      current ? "text-zinc-800" : done ? "text-zinc-400" : "text-zinc-300"
                    }`}>
                      <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <span className="hidden sm:inline">{s.label}</span>
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
              <div className="ca-rise mb-8 flex flex-wrap gap-2">
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
                <div className="ca-rise mb-7">
                  <span className="font-serif text-lg italic text-amber-600">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-serif text-3xl font-semibold leading-[1.12] tracking-tight text-zinc-900 md:text-[2.5rem]">
                    {steps[idx].question}
                    {!revealed && <span className="ca-caret ml-1 inline-block h-7 w-[3px] translate-y-1 bg-accent md:h-9" />}
                  </h3>
                </div>

                {revealed && (
                  <>
                    {phase === "occasion" && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {OCCASION_OPTIONS.map((opt, i) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => pickOccasion(opt)}
                            style={{ animationDelay: `${i * 60}ms` }}
                            className="ca-rise group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-green-500/5"
                          >
                            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-100 ring-1 ring-zinc-200/60 transition-colors group-hover:bg-accent/12 group-hover:ring-accent/25">
                              <opt.Icon className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-accent" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-serif text-base text-zinc-900">{opt.label}</span>
                              <span className="block text-xs text-zinc-500">{opt.desc}</span>
                            </span>
                            <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-zinc-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                          </button>
                        ))}
                      </div>
                    )}

                    {phase === "cuisine" && (
                      <div className="flex flex-wrap gap-2.5">
                        {cuisines.map((c, i) => (
                          <PillButton key={c.value} delay={i * 45} onClick={() => pickCuisine(c.value, c.label)}>
                            {c.label}
                          </PillButton>
                        ))}
                        <PillButton delay={cuisines.length * 45} onClick={() => pickCuisine(null, "Me da igual")} ghost>
                          <Sparkles className="h-3.5 w-3.5" /> Me da igual
                        </PillButton>
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
                            className="ca-rise group flex flex-col items-center justify-center gap-1 rounded-2xl border border-zinc-200 bg-white px-3 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-green-500/5"
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
                            className="ca-rise group flex flex-col items-center justify-center gap-1 rounded-2xl border border-zinc-200 bg-white px-3 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-green-500/5"
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
                              <PillButton key={opt.value} delay={i * 45} active={on} onClick={() => toggleDietary(opt.value)}>
                                {on && <Check className="h-3.5 w-3.5" />}
                                {opt.label}
                              </PillButton>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={confirmDietary}
                          className="ca-rise mt-7 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-400/25 transition-all hover:-translate-y-0.5 hover:bg-green-600"
                        >
                          {dietarySel.length ? "Ver mis chefs" : "Sin restricciones, continuar"}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Resultados */}
            {phase === "results" && (
              <div>
                {searching ? (
                  <div className="ca-rise flex flex-col items-center justify-center gap-4 py-10 text-center">
                    <span className="relative flex h-12 w-12 items-center justify-center">
                      <span className="absolute inset-0 rounded-full border-2 border-accent/20" />
                      <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
                      <ChefHat className="h-5 w-5 text-accent" />
                    </span>
                    <p className="font-serif text-lg italic text-zinc-600">Seleccionando chefs para vos…</p>
                  </div>
                ) : result && result.chefs.length > 0 ? (
                  <>
                    <div className="ca-rise mb-7">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                        {result.relaxed ? "Lo más cercano a tu búsqueda" : "Tu selección"}
                      </span>
                      <h3 className="mt-2 font-serif text-3xl font-semibold leading-tight text-zinc-900">
                        {result.chefs.length === 1
                          ? "Un chef hecho para tu mesa"
                          : `${result.chefs.length} chefs hechos para tu mesa`}
                      </h3>
                      {result.relaxed && (
                        <p className="mt-2 text-sm text-zinc-500">
                          No hubo un match exacto, pero estos son los más afines a lo que buscás.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-3">
                      {result.chefs.slice(0, 4).map((chef, i) => (
                        <ChefCard key={chef.chefId} chef={chef} wizardUrl={wizardUrl} delay={i * 80} />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={restart}
                      className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-700"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Empezar de nuevo
                    </button>
                  </>
                ) : (
                  <div className="ca-rise py-4">
                    <h3 className="font-serif text-2xl font-semibold leading-snug text-zinc-900">
                      Todavía no tengo un chef que encaje justo con eso.
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                      Creá tu solicitud y dejá que nuestros chefs te propongan algo a medida.
                    </p>
                    <Link
                      href={wizardUrl}
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-400/25 transition-all hover:-translate-y-0.5 hover:bg-green-600"
                    >
                      Crear mi solicitud
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────
function PillButton({
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
      className={`ca-rise inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${
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

function ChefCard({
  chef, wizardUrl, delay = 0,
}: {
  chef: MatchResult["chefs"][number];
  wizardUrl: string;
  delay?: number;
}) {
  const specialty = chef.tagline?.trim()
    || (chef.cuisines.length ? chef.cuisines.map(cuisineLabel).slice(0, 2).join(" · ") : "Chef privado");

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="ca-rise group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-900/5"
    >
      <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
        {chef.photoUrl ? (
          <Image
            src={chef.photoUrl}
            alt={chef.fullName}
            fill
            sizes="72px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ChefHat className="h-7 w-7 text-zinc-300" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate font-serif text-lg text-zinc-900">{chef.fullName}</h4>
        <p className="truncate text-xs text-zinc-500">{specialty}</p>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-500">
          {chef.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-amber-600" />
              {chef.city}
            </span>
          )}
          {chef.ratingCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {chef.ratingAvg.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <Link
        href={wizardUrl}
        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-green-600"
      >
        Solicitar
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
