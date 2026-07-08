"use client";

import { useState, useEffect } from "react";
import { WizardData } from "./types";

const COMIDAS_MIN  = 4;
const COMIDAS_MAX  = 14;
const RACIONES_MIN = 1;
const RACIONES_MAX = 10;

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [dir, setDir]         = useState<"up" | "down">("up");
  const [animKey, setAnimKey] = useState(0);

  const step = (delta: 1 | -1) => {
    const next = value + delta;
    if (next < min || next > max) return;
    setDir(delta === 1 ? "up" : "down");
    setAnimKey((k) => k + 1);
    onChange(next);
  };

  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-5">{label}</p>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={value <= min}
          aria-label="Disminuir"
          className="w-14 h-14 rounded-full bg-zinc-100 hover:bg-zinc-200 active:scale-95 flex items-center justify-center text-2xl text-zinc-600 transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed select-none"
        >
          −
        </button>

        <div className="flex-1 flex justify-center items-center overflow-hidden h-[72px]">
          <span
            key={animKey}
            className={`font-serif text-6xl text-zinc-900 leading-none animate-in duration-200 ${
              dir === "up"
                ? "slide-in-from-bottom-2 fade-in"
                : "slide-in-from-top-2 fade-in"
            }`}
          >
            {value}
          </span>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={value >= max}
          aria-label="Aumentar"
          className="w-14 h-14 rounded-full bg-zinc-100 hover:bg-zinc-200 active:scale-95 flex items-center justify-center text-2xl text-zinc-600 transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed select-none"
        >
          +
        </button>
      </div>
      <p className="text-[10px] text-zinc-400 text-center mt-2 tabular-nums">
        {min} – {max}
      </p>
    </div>
  );
}

interface Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export function WeeklyStep3Volume({ data, updateData, onNext }: Props) {
  const comidas  = data.weeklyDetails?.comidasPorSemana  ?? 7;
  const raciones = data.weeklyDetails?.racionesPorComida ?? 2;

  useEffect(() => {
    const missing: Partial<NonNullable<WizardData["weeklyDetails"]>> = {};
    if (data.weeklyDetails?.comidasPorSemana  === undefined) missing.comidasPorSemana  = 7;
    if (data.weeklyDetails?.racionesPorComida === undefined) missing.racionesPorComida = 2;
    if (Object.keys(missing).length > 0)
      updateData({ weeklyDetails: { ...data.weeklyDetails, ...missing } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setComidas  = (v: number) =>
    updateData({ weeklyDetails: { ...data.weeklyDetails, comidasPorSemana: v } });
  const setRaciones = (v: number) =>
    updateData({ weeklyDetails: { ...data.weeklyDetails, racionesPorComida: v } });

  return (
    <div className="flex flex-col w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-serif text-3xl leading-tight text-zinc-900 mb-2">
        ¿Cuánto necesitás?
      </h2>
      <p className="text-sm text-zinc-500 mb-10">
        Definí el volumen semanal.
      </p>

      <div className="mb-8">
        <Stepper
          label="Comidas por semana"
          value={comidas}
          min={COMIDAS_MIN}
          max={COMIDAS_MAX}
          onChange={setComidas}
        />
      </div>

      <div className="h-px bg-zinc-100 mb-8" />

      <div className="mb-8">
        <Stepper
          label="Personas por comida"
          value={raciones}
          min={RACIONES_MIN}
          max={RACIONES_MAX}
          onChange={setRaciones}
        />
      </div>

      {/* Resumen en tiempo real */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-10">
        <p className="text-sm text-zinc-700 leading-relaxed">
          Tu chef preparará{" "}
          <span className="font-semibold text-accent">
            {comidas} {comidas === 1 ? "comida" : "comidas"}
          </span>{" "}
          para{" "}
          <span className="font-semibold text-accent">
            {raciones} {raciones === 1 ? "persona" : "personas"}
          </span>{" "}
          cada semana.
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl transition-all duration-200"
      >
        Continuar
      </button>
    </div>
  );
}
