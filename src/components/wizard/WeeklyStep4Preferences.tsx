"use client";

import { useRef } from "react";
import { WizardData } from "./types";

// Los ids son los strings exactos que submitWeeklyRequest chequea con includes()
// para mapear a los booleans de request_restrictions — no cambiar sin tocar ambos.
const ALERGIAS = [
  { id: "Gluten",       label: "Gluten" },
  { id: "Frutos secos", label: "Frutos secos" },
  { id: "Lácteos",      label: "Lácteos" },
  { id: "Mariscos",     label: "Mariscos" },
  { id: "Vegetariana",  label: "Vegetariana" },
  { id: "Vegana",       label: "Vegana" },
];

const INGREDIENTES_OPTS = [
  { id: "si",        label: "Sí" },
  { id: "no",        label: "No" },
  { id: "no_seguro", label: "No estoy seguro/a" },
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export function WeeklyStep4Preferences({ data, updateData, onNext }: Props) {
  const notasRef   = useRef<HTMLTextAreaElement>(null);
  const alergias   = data.dietaryRestrictions ?? [];
  const notas      = data.weeklyDetails?.preferenciasCulinarias ?? "";
  const ingrediente = data.weeklyDetails?.preferenciaChef ?? "";
  const canContinue = !!ingrediente;

  const toggleAlergia = (id: string) => {
    const updated = alergias.includes(id)
      ? alergias.filter((a) => a !== id)
      : [...alergias, id];
    updateData({ dietaryRestrictions: updated });
  };

  const handleNotas = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateData({ weeklyDetails: { ...data.weeklyDetails, preferenciasCulinarias: e.target.value } });
    if (notasRef.current) {
      notasRef.current.style.height = "auto";
      notasRef.current.style.height = notasRef.current.scrollHeight + "px";
    }
  };

  const selectIngrediente = (id: string) => {
    updateData({ weeklyDetails: { ...data.weeklyDetails, preferenciaChef: id } });
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-serif text-3xl leading-tight text-zinc-900 mb-2">
        ¿Qué preferís comer?
      </h2>
      <p className="text-sm text-zinc-500 mb-8">
        Contanos para encontrar tu chef ideal.
      </p>

      {/* Sección 1 — Alergias */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">
        Restricciones dietéticas
      </p>
      <div className="flex flex-wrap gap-2 mb-8">
        {ALERGIAS.map(({ id, label }) => {
          const active = alergias.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleAlergia(id)}
              className={[
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 select-none",
                active
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-transparent",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-zinc-100 mb-8" />

      {/* Sección 2 — Notas */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">
        Preferencias y notas
      </p>
      <div className="relative mb-1">
        <textarea
          ref={notasRef}
          value={notas}
          onChange={handleNotas}
          placeholder="Cuéntanos un poco más sobre tus preferencias culinarias, objetivos alimenticios o cualquier detalle que nos ayude a encontrar el chef ideal para ti."
          rows={3}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 pb-7 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 hover:border-zinc-300 transition-all duration-200 bg-white resize-none overflow-hidden leading-relaxed"
        />
        <span className="absolute bottom-3 right-3 text-[10px] text-zinc-400 tabular-nums pointer-events-none">
          {notas.length}
        </span>
      </div>
      <p className="text-[10px] text-zinc-400 mb-8">Opcional</p>

      <div className="h-px bg-zinc-100 mb-8" />

      {/* Sección 3 — Compra de ingredientes */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2">
        Compra de ingredientes
      </p>
      <p className="text-sm text-zinc-600 mb-4">
        ¿Te gustaría que el chef se encargara de comprar los ingredientes?
      </p>
      <div className="flex flex-col gap-2 mb-10">
        {INGREDIENTES_OPTS.map(({ id, label }) => {
          const active = ingrediente === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectIngrediente(id)}
              className={[
                "flex items-center justify-between px-4 h-14 rounded-xl border text-sm font-medium transition-all duration-150",
                active
                  ? "border-accent/40 bg-accent/5 text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
              ].join(" ")}
            >
              <span>{label}</span>
              {active && <span className="text-accent"><CheckIcon /></span>}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canContinue}
        className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Continuar
      </button>
    </div>
  );
}
