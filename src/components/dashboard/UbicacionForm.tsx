"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Country, City } from "country-state-city";
import { saveUbicacion } from "@/app/dashboard/ubicacion/actions";
import { ChevronDown, X, AlertCircle, CheckCircle2 } from "lucide-react";

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "it", label: "Italiano" },
];

// ── Combobox genérico ──────────────────────────────────────────────────────────

function Combobox({
  name,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())).slice(0, 80)
    : options.slice(0, 80);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handleFocus() {
    setOpen(true);
    setQuery("");
  }

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />

      {/* Visible input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={disabled ? "Seleccioná primero un país" : placeholder}
          value={open ? query : selectedLabel}
          onFocus={handleFocus}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-11 px-4 pr-16 border border-zinc-200 rounded-xl text-sm bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all duration-150"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-zinc-300 hover:text-zinc-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-zinc-100 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-zinc-400">Sin resultados</li>
          ) : (
            filtered.map((option) => (
              <li
                key={option.value}
                onMouseDown={() => handleSelect(option.value)}
                className={`px-4 py-2.5 text-sm cursor-pointer select-none transition-colors ${
                  option.value === value
                    ? "bg-accent/8 text-accent font-medium"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {option.label}
              </li>
            ))
          )}
          {options.length > 80 && filtered.length === 80 && (
            <li className="px-4 py-2.5 text-xs text-zinc-400 border-t border-zinc-50">
              Escribí para filtrar más resultados…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type UbicacionInitialData = {
  city:               string | null
  country:            string | null
  preferred_language: string | null
}

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

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 mb-2">
      {children}
      {required && <span className="text-red-400 ml-1 normal-case tracking-normal font-normal">*</span>}
    </label>
  );
}

// ── Formulario principal ───────────────────────────────────────────────────────

export function UbicacionForm({ initialData }: { initialData: UbicacionInitialData }) {
  const [state, action, isPending] = useActionState(saveUbicacion, null);

  // Derivar isoCode del nombre de país guardado en DB
  const allCountries = Country.getAllCountries();
  const initialIso = allCountries.find((c) => c.name === initialData.country)?.isoCode ?? "";

  const [countryIso, setCountryIso] = useState(initialIso);
  const [countryName, setCountryName] = useState(initialData.country ?? "");
  const [cityName, setCityName] = useState(initialData.city ?? "");

  const countryOptions = allCountries.map((c) => ({
    value: c.isoCode,
    label: `${c.flag ?? ""} ${c.name}`.trim(),
  }));

  const cityOptions = countryIso
    ? Array.from(new Set((City.getCitiesOfCountry(countryIso) ?? []).map((c) => c.name))).map(
        (name) => ({ value: name, label: name })
      )
    : [];

  function handleCountryChange(iso: string) {
    const country = allCountries.find((c) => c.isoCode === iso);
    setCountryIso(iso);
    setCountryName(country?.name ?? "");
    setCityName(""); // reset city when country changes
  }

  return (
    <form action={action} className="space-y-10">
      {/* Hidden inputs con los valores reales para el server action */}
      <input type="hidden" name="country" value={countryName} />
      <input type="hidden" name="city" value={cityName} />

      {/* ── Ubicación ───────────────────────────────────────────── */}
      <section>
        <SectionTitle>Ubicación</SectionTitle>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          Indicá desde dónde operás. Los clientes podrán encontrarte por ciudad y país.
        </p>

        <div className="space-y-5 max-w-md">
          <div>
            <FieldLabel required>País</FieldLabel>
            <Combobox
              name="_country_iso"
              options={countryOptions}
              value={countryIso}
              onChange={handleCountryChange}
              placeholder="Buscar país…"
            />
          </div>

          <div>
            <FieldLabel required>Ciudad</FieldLabel>
            <Combobox
              name="_city"
              options={cityOptions}
              value={cityName}
              onChange={setCityName}
              placeholder="Buscar ciudad…"
              disabled={!countryIso}
            />
          </div>
        </div>
      </section>

      <div className="border-t border-zinc-100" />

      {/* ── Idioma ──────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Idioma de Preferencia</SectionTitle>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          Idioma en el que preferís comunicarte con clientes y recibir notificaciones.
        </p>
        <div className="max-w-md">
          <FieldLabel>Idioma</FieldLabel>
          <div className="relative">
            <select
              name="preferred_language"
              defaultValue={initialData.preferred_language ?? "es"}
              className="w-full h-11 appearance-none px-4 pr-10 border border-zinc-200 rounded-xl text-sm text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150 cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── Feedback ──────────────────────────────────────────── */}
      {state?.error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3.5">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">¡Ubicación guardada correctamente!</p>
        </div>
      )}

      {/* ── Submit ──────────────────────────────────────────────── */}
      <div className="pt-2 pb-10">
        <button
          type="submit"
          disabled={isPending || !countryName || !cityName}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold text-sm h-11 px-8 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
