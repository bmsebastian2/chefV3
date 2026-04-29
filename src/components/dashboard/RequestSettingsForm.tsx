"use client";

import { useActionState } from "react";
import { saveRequestSettings } from "@/app/dashboard/request-settings/actions";
import { Button } from "@/components/ui/button";

export type RequestSettingsInitialData = {
  accepts_single:   boolean
  accepts_multiple: boolean
  accepts_weekly:   boolean
  min_guests:       number
  max_guests:       number
  min_budget:       number | null
  advance_days:     number
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-5">
      {children}
    </h2>
  );
}

function CheckCard({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 p-4 border border-zinc-200 rounded-lg cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 w-4 h-4 accent-accent"
      />
      <div>
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
    </label>
  );
}

export function RequestSettingsForm({ initialData }: { initialData: RequestSettingsInitialData }) {
  const [state, action, isPending] = useActionState(saveRequestSettings, null);

  return (
    <form action={action} className="space-y-10">

      {/* ── Tipos de servicio ──────────────────────────────── */}
      <section>
        <SectionTitle>Tipos de servicio</SectionTitle>
        <p className="text-sm text-muted-foreground mb-5">
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

      <hr className="border-zinc-100" />

      {/* ── Cantidad de comensales ─────────────────────────── */}
      <section>
        <SectionTitle>Cantidad de comensales</SectionTitle>
        <p className="text-sm text-muted-foreground mb-5">
          Definí el rango de personas para el que estás disponible.
        </p>
        <div className="flex items-center gap-4 max-w-xs">
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Mínimo</label>
            <input
              type="number"
              name="min_guests"
              min={1}
              max={500}
              defaultValue={initialData.min_guests}
              className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <span className="mt-5 text-zinc-400">—</span>
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Máximo</label>
            <input
              type="number"
              name="max_guests"
              min={1}
              max={500}
              defaultValue={initialData.max_guests}
              className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </section>

      <hr className="border-zinc-100" />

      {/* ── Presupuesto mínimo ─────────────────────────────── */}
      <section>
        <SectionTitle>Presupuesto mínimo</SectionTitle>
        <p className="text-sm text-muted-foreground mb-5">
          Solo verás solicitudes cuyo presupuesto máximo supere este valor. Dejalo en blanco para ver todas.
        </p>
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">Monto (USD)</label>
          <input
            type="number"
            name="min_budget"
            min={0}
            step={10}
            defaultValue={initialData.min_budget ?? ""}
            placeholder="Sin mínimo"
            className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </section>

      <hr className="border-zinc-100" />

      {/* ── Anticipación mínima ────────────────────────────── */}
      <section>
        <SectionTitle>Anticipación mínima</SectionTitle>
        <p className="text-sm text-muted-foreground mb-5">
          Días de anticipación mínimos que necesitás para aceptar un servicio.
        </p>
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">Días</label>
          <input
            type="number"
            name="advance_days"
            min={0}
            max={60}
            defaultValue={initialData.advance_days}
            className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </section>

      {/* ── Feedback ──────────────────────────────────────── */}
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}
      {state?.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3">
          <p className="text-sm text-emerald-700 font-medium">¡Configuración guardada correctamente!</p>
        </div>
      )}

      <div className="pt-2 pb-10">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-accent hover:bg-accent-200 text-white border-none h-11 px-8 text-sm rounded-md disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
