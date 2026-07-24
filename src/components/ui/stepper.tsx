// Stepper − / + compartido. Extraído del CounterRow del wizard (Steps.tsx) para
// que wizard y dashboard usen el mismo control de cantidades y no vuelvan a
// divergir (el dashboard tenía un dropdown propio con una opción por número).

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

/** Píldora compacta − valor + con límites min/max. */
export function Stepper({ value, min = 0, max = Infinity, onDecrement, onIncrement }: StepperProps) {
  return (
    <div className="flex items-center gap-1 bg-zinc-50 rounded-full p-1 border border-zinc-200">
      <button
        type="button"
        onClick={onDecrement}
        disabled={value <= min}
        aria-label="Disminuir"
        className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-600 text-lg font-light hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
      >−</button>
      <span className="w-8 text-center text-base font-semibold text-zinc-900 select-none">{value}</span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={value >= max}
        aria-label="Aumentar"
        className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-600 text-lg font-light hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
      >+</button>
    </div>
  );
}

interface CounterRowProps extends StepperProps {
  label: string;
  subtitle: string;
}

/** Tarjeta label + subtítulo con el stepper a la derecha (formato del wizard). */
export function CounterRow({ label, subtitle, ...stepper }: CounterRowProps) {
  return (
    <div className="flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-2xl transition-colors hover:border-zinc-300">
      <div>
        <p className="font-semibold text-zinc-900 text-base">{label}</p>
        <p className="text-sm text-accent mt-0.5">{subtitle}</p>
      </div>
      <Stepper {...stepper} />
    </div>
  );
}
