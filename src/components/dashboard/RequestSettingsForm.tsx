"use client";

import { useActionState } from "react";
import { saveRequestSettings } from "@/app/dashboard/request-settings/actions";
import { AdditionalCitiesPicker } from "@/components/dashboard/AdditionalCitiesPicker";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export type RequestSettingsInitialData = {
  accepts_single:    boolean
  accepts_multiple:  boolean
  accepts_weekly:    boolean
  min_guests:        number
  max_guests:        number
  min_budget:        number | null
  advance_days:      number
  city:              string | null
  country:           string | null
  additional_cities: string[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="h-px w-5 bg-accent/60 rounded-full" />
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
        {children}
      </h2>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 mb-2">
      {children}
    </label>
  );
}

function CheckCard({
  name,
  label,
  description,
  defaultChecked,
}: {
  name:           string;
  label:          string;
  description:    string;
  defaultChecked: boolean;
}) {
  return (
    <label className="relative flex items-start gap-3 p-4 border border-zinc-200 rounded-xl cursor-pointer hover:border-zinc-300 hover:bg-zinc-50/50 transition-all duration-150 has-[:checked]:border-accent has-[:checked]:bg-accent/8">
      {/* Hidden native checkbox — peer for the custom visual */}
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      {/* Custom checkbox indicator */}
      <div className="mt-0.5 w-5 h-5 rounded-lg border-2 border-zinc-200 flex items-center justify-center shrink-0 transition-all duration-150 peer-checked:bg-accent peer-checked:border-accent">
        <svg
          className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-800">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </label>
  );
}

// ── Formulario principal ──────────────────────────────────────────────────────

export function RequestSettingsForm({ initialData }: { initialData: RequestSettingsInitialData }) {
  const [state, action, isPending] = useActionState(saveRequestSettings, null);

  return (
    <form action={action} className="space-y-10">

      {/* ── Tipos de servicio ──────────────────────────────── */}
      <section>
        <SectionTitle>Tipos de servicio</SectionTitle>
        <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
          Seleccioná qué tipos de solicitudes querés recibir.
        </p>
        <div className="space-y-3 max-w-md">
          <CheckCard
            name="accepts_single"
            label="Servicio único"
            description="Una sola comida o evento puntual."
            defaultChecked={initialData.accepts_single}
          />
          <CheckCard
            name="accepts_multiple"
            label="Múltiples servicios"
            description="Varios eventos o comidas en un período determinado."
            defaultChecked={initialData.accepts_multiple}
          />
          <CheckCard
            name="accepts_weekly"
            label="Servicio semanal"
            description="Cocina recurrente semana a semana."
            defaultChecked={initialData.accepts_weekly}
          />
        </div>
      </section>

      <div className="border-t border-zinc-100" />

      {/* ── Ciudades que cubrís ────────────────────────────── */}
      <AdditionalCitiesPicker
        city={initialData.city}
        country={initialData.country}
        initialKeys={initialData.additional_cities}
      />

      <div className="border-t border-zinc-100" />

      {/* ── Cantidad de comensales ─────────────────────────── */}
      <section>
        <SectionTitle>Cantidad de comensales</SectionTitle>
        <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
          Definí el rango de personas para el que estás disponible.
        </p>
        <div className="flex items-end gap-3 max-w-xs">
          <div className="flex-1">
            <FieldLabel>Mínimo</FieldLabel>
            <input
              type="number"
              name="min_guests"
              min={1}
              max={500}
              defaultValue={initialData.min_guests}
              className="w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
            />
          </div>
          <span className="pb-3 text-zinc-300 font-light text-lg">—</span>
          <div className="flex-1">
            <FieldLabel>Máximo</FieldLabel>
            <input
              type="number"
              name="max_guests"
              min={1}
              max={500}
              defaultValue={initialData.max_guests}
              className="w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
            />
          </div>
        </div>
      </section>

      <div className="border-t border-zinc-100" />

      {/* ── Presupuesto mínimo ─────────────────────────────── */}
      <section>
        <SectionTitle>Presupuesto mínimo</SectionTitle>
        <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
          Solo verás solicitudes cuyo presupuesto máximo supere este valor. Dejalo en blanco para ver todas.
        </p>
        <div className="max-w-xs">
          <FieldLabel>Monto (USD)</FieldLabel>
          <input
            type="number"
            name="min_budget"
            min={0}
            step={10}
            defaultValue={initialData.min_budget ?? ""}
            placeholder="Sin mínimo"
            className="w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
          />
        </div>
      </section>

      <div className="border-t border-zinc-100" />

      {/* ── Anticipación mínima ────────────────────────────── */}
      <section>
        <SectionTitle>Anticipación mínima</SectionTitle>
        <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
          Días de anticipación mínimos que necesitás para aceptar un servicio.
        </p>
        <div className="max-w-xs">
          <FieldLabel>Días</FieldLabel>
          <input
            type="number"
            name="advance_days"
            min={0}
            max={60}
            defaultValue={initialData.advance_days}
            className="w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
          />
        </div>
      </section>

      {/* ── Feedback ──────────────────────────────────────── */}
      {state?.error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3.5">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">¡Configuración guardada correctamente!</p>
        </div>
      )}

      {/* ── Submit ── */}
      <div className="pt-2 pb-10">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold text-sm h-11 px-8 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
