"use client";

import { useState } from "react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  isBefore, startOfDay, addMonths, subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { WizardData } from "./types";

const DAYS_OF_WEEK = [
  { id: 1, initial: "L", label: "Lun" },
  { id: 2, initial: "M", label: "Mar" },
  { id: 3, initial: "X", label: "Mié" },
  { id: 4, initial: "J", label: "Jue" },
  { id: 5, initial: "V", label: "Vie" },
  { id: 6, initial: "S", label: "Sáb" },
  { id: 7, initial: "D", label: "Dom" },
];

const DAY_HEADERS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={dir === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
    </svg>
  );
}

function InlineCalendar({
  selected,
  onSelect,
}: {
  selected?: Date;
  onSelect: (d: Date) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState<Date>(
    selected ?? new Date()
  );
  const today = startOfDay(new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
  });

  const canGoPrev = !isBefore(
    startOfMonth(subMonths(currentMonth, 1)),
    startOfMonth(new Date())
  );

  return (
    <div className="w-full">
      {/* Navegación de mes */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          disabled={!canGoPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronIcon dir="left" />
        </button>

        <span className="text-sm font-semibold text-zinc-900 capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </span>

        <button
          type="button"
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors duration-150"
        >
          <ChevronIcon dir="right" />
        </button>
      </div>

      {/* Cabeceras de día */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="text-center text-[10px] text-zinc-400 pb-1">
            {h}
          </div>
        ))}
      </div>

      {/* Grilla de días */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, idx) => {
          const inMonth  = isSameMonth(day, currentMonth);
          const isPast   = isBefore(day, today);
          const isSelDay = selected ? isSameDay(day, selected) : false;
          const isTodayD = isToday(day);

          if (!inMonth) return <div key={idx} className="h-9" />;

          return (
            <button
              key={idx}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(day)}
              className={[
                "h-9 w-full flex items-center justify-center rounded-full text-sm transition-all duration-100 select-none",
                isPast
                  ? "text-zinc-300 cursor-not-allowed"
                  : isSelDay
                  ? "bg-zinc-900 text-white font-medium"
                  : isTodayD
                  ? "text-accent font-semibold hover:bg-zinc-100"
                  : "text-zinc-700 hover:bg-zinc-100",
              ].join(" ")}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export function WeeklyStep5Schedule({ data, updateData, onNext }: Props) {
  const selectedDate = data.date;
  const selectedDays = data.weeklyDetails?.frecuenciaCocina ?? [];
  const canContinue  = !!selectedDate && selectedDays.length > 0;

  const handleDateSelect = (d: Date) => updateData({ date: d });

  const handleDaySelect = (id: number) => {
    const updated = selectedDays.includes(id)
      ? selectedDays.filter((d) => d !== id)
      : [...selectedDays, id];
    updateData({ weeklyDetails: { ...data.weeklyDetails, frecuenciaCocina: updated } });
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-serif text-3xl leading-tight text-zinc-900 mb-2">
        ¿Cuándo empezamos?
      </h2>
      <p className="text-sm text-zinc-500 mb-8">
        Elegí la fecha y el día preferido para tu chef.
      </p>

      {/* Campo 1 — Fecha de inicio */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-4">
        Fecha ideal de inicio
      </p>
      <div className="border border-zinc-100 rounded-2xl p-4 mb-8 bg-white">
        <InlineCalendar selected={selectedDate} onSelect={handleDateSelect} />
      </div>

      <div className="h-px bg-zinc-100 mb-8" />

      {/* Campo 2 — Día de la semana */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1.5">
        Día preferido para la sesión
      </p>
      <p className="text-sm text-zinc-500 mb-4">
        ¿Qué día preferís que el chef vaya a cocinar?
      </p>
      <div
        className="overflow-x-auto pb-1 mb-10"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        <div className="flex gap-2 w-max">
          {DAYS_OF_WEEK.map(({ id, initial, label }) => {
            const active = selectedDays.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleDaySelect(id)}
                className={[
                  "flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-all duration-150 flex-shrink-0 select-none",
                  active
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                ].join(" ")}
              >
                <span
                  className={`font-serif text-lg leading-none ${
                    active ? "text-white" : "text-zinc-800"
                  }`}
                >
                  {initial}
                </span>
                <span
                  className={`text-[9px] uppercase tracking-wide mt-1 ${
                    active ? "text-zinc-300" : "text-zinc-400"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
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
