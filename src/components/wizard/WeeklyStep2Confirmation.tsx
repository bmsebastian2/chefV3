"use client";

import { useState } from "react";

interface Props {
  onNext: () => void;
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function WeeklyStep2Confirmation({ onNext }: Props) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-serif text-3xl leading-tight text-zinc-900 mb-2">
        ¿Todo claro?
      </h2>
      <p className="text-sm text-zinc-500 mb-8">
        Leé los detalles antes de continuar.
      </p>

      {/* Tarjeta informativa */}
      <div className="border-l-2 border-accent bg-accent/5 rounded-xl p-5 mb-6">
        <p className="text-sm text-zinc-700 leading-relaxed">
          Cada semana, un chef profesional se desplazará hasta tu hogar para preparar una gran
          variedad de platos en una única sesión de cocina, dejándote todo listo y organizado
          para varios días. Dependiendo del volumen del servicio, la sesión puede extenderse
          entre 3 y 5 horas. El costo parte desde <span className="font-semibold text-zinc-900">$300 USD</span> o
          su valor equivalente en moneda local.
        </p>
      </div>

      {/* Checkbox custom */}
      <button
        type="button"
        onClick={() => setAgreed((v) => !v)}
        className={[
          "flex items-center gap-4 w-full px-4 h-14 rounded-xl border text-left transition-all duration-200 mb-10",
          agreed
            ? "border-accent/40 bg-accent/5"
            : "border-zinc-200 bg-white hover:border-zinc-300",
        ].join(" ")}
      >
        <span
          className={[
            "flex-shrink-0 w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center transition-all duration-150",
            agreed
              ? "bg-accent border-accent text-white"
              : "bg-white border-zinc-300",
          ].join(" ")}
        >
          {agreed && <CheckIcon />}
        </span>
        <span className="text-sm font-medium text-zinc-800">
          Estoy de acuerdo
        </span>
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!agreed}
        className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Continuar
      </button>
    </div>
  );
}
