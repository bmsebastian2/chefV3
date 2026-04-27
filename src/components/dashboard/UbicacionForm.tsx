"use client";

import { useActionState } from "react";
import { saveUbicacion } from "@/app/dashboard/ubicacion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Globe } from "lucide-react";

const COUNTRIES = [
  { value: "Argentina",  label: "Argentina" },
  { value: "Bolivia",    label: "Bolivia" },
  { value: "Chile",      label: "Chile" },
  { value: "Colombia",   label: "Colombia" },
  { value: "Costa Rica", label: "Costa Rica" },
  { value: "Cuba",       label: "Cuba" },
  { value: "Ecuador",    label: "Ecuador" },
  { value: "España",     label: "España" },
  { value: "Guatemala",  label: "Guatemala" },
  { value: "Honduras",   label: "Honduras" },
  { value: "Mexico",     label: "México" },
  { value: "Nicaragua",  label: "Nicaragua" },
  { value: "Panama",     label: "Panamá" },
  { value: "Paraguay",   label: "Paraguay" },
  { value: "Peru",       label: "Perú" },
  { value: "Uruguay",    label: "Uruguay" },
  { value: "Venezuela",  label: "Venezuela" },
  { value: "Other",      label: "Otro país" },
];

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "it", label: "Italiano" },
];

export type UbicacionInitialData = {
  city:               string | null
  country:            string | null
  preferred_language: string | null
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-5">
      {children}
    </h2>
  );
}

export function UbicacionForm({ initialData }: { initialData: UbicacionInitialData }) {
  const [state, action, isPending] = useActionState(saveUbicacion, null);

  return (
    <form action={action} className="space-y-10">

      {/* ── Ubicación ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Ubicación</SectionTitle>
        <p className="text-sm text-muted-foreground mb-5">
          Indicá desde dónde operás. Los clientes podrán encontrarte según tu ciudad y país.
        </p>

        <div className="space-y-4 max-w-md">
          {/* País */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              País <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <select
                name="country"
                defaultValue={initialData.country ?? ""}
                required
                className="w-full pl-9 pr-4 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white appearance-none"
              >
                <option value="" disabled>Seleccioná tu país</option>
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ciudad */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Ciudad <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <Input
                name="city"
                defaultValue={initialData.city ?? ""}
                placeholder="Ej: Buenos Aires"
                required
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </section>

      <hr className="border-zinc-100" />

      {/* ── Idioma preferido ──────────────────────────────────────── */}
      <section>
        <SectionTitle>Idioma de Preferencia</SectionTitle>
        <p className="text-sm text-muted-foreground mb-5">
          Idioma en el que preferís comunicarte con clientes y recibir notificaciones.
        </p>

        <div className="max-w-md">
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Seleccioná tu idioma
          </label>
          <select
            name="preferred_language"
            defaultValue={initialData.preferred_language ?? "es"}
            className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ── Feedback ─────────────────────────────────────────────── */}
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}
      {state?.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3">
          <p className="text-sm text-emerald-700 font-medium">¡Ubicación guardada correctamente!</p>
        </div>
      )}

      <div className="pt-2 pb-10">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-accent hover:bg-accent-200 text-white border-none h-11 px-8 text-sm rounded-md"
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

    </form>
  );
}
