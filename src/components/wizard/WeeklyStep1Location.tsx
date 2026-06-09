"use client";

import { useState, useRef, useEffect } from "react";
import { WizardData } from "./types";

const LOCATIONS: Record<string, { name: string; flag: string; cities: string[] }> = {
  AR: { name: "Argentina",   flag: "🇦🇷", cities: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "Mar del Plata"] },
  MX: { name: "México",      flag: "🇲🇽", cities: ["Ciudad de México", "Guadalajara", "Monterrey", "Cancún", "Playa del Carmen"] },
  CO: { name: "Colombia",    flag: "🇨🇴", cities: ["Bogotá", "Medellín", "Cartagena", "Cali", "Barranquilla"] },
  CL: { name: "Chile",       flag: "🇨🇱", cities: ["Santiago", "Valparaíso", "Viña del Mar", "Concepción"] },
  PE: { name: "Perú",        flag: "🇵🇪", cities: ["Lima", "Miraflores", "Cusco", "Arequipa"] },
  UY: { name: "Uruguay",     flag: "🇺🇾", cities: ["Montevideo", "Punta del Este"] },
  BR: { name: "Brasil",      flag: "🇧🇷", cities: ["São Paulo", "Río de Janeiro", "Florianópolis", "Brasilia"] },
  EC: { name: "Ecuador",     flag: "🇪🇨", cities: ["Quito", "Guayaquil", "Cuenca"] },
  PA: { name: "Panamá",      flag: "🇵🇦", cities: ["Ciudad de Panamá"] },
  CR: { name: "Costa Rica",  flag: "🇨🇷", cities: ["San José"] },
  PY: { name: "Paraguay",    flag: "🇵🇾", cities: ["Asunción"] },
  BO: { name: "Bolivia",     flag: "🇧🇴", cities: ["La Paz", "Santa Cruz de la Sierra", "Cochabamba"] },
  NI: { name: "Nicaragua",   flag: "🇳🇮", cities: ["Managua", "León", "Granada", "Masaya"] },
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface DropdownOption { label: string; value: string }

function SelectDropdown({
  placeholder,
  selected,
  options,
  onSelect,
  disabled = false,
}: {
  placeholder: string;
  selected: DropdownOption | null;
  options: DropdownOption[];
  onSelect: (opt: DropdownOption) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={[
          "w-full h-14 px-4 flex items-center justify-between rounded-xl border text-sm transition-all duration-200",
          disabled
            ? "border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed"
            : open
            ? "border-accent/50 ring-2 ring-accent/10 bg-white text-zinc-900"
            : selected
            ? "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-400"
            : "border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300",
        ].join(" ")}
      >
        <span className={selected && !disabled ? "font-medium text-zinc-900" : ""}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={disabled ? "text-zinc-300" : "text-zinc-400"}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-xl border border-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.10)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = selected?.value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onSelect(opt); setOpen(false); }}
                className={[
                  "w-full px-4 py-3 flex items-center justify-between gap-3 text-left text-sm transition-colors duration-100 border-b border-zinc-50 last:border-none",
                  isSelected ? "bg-accent/5 text-zinc-900 font-medium" : "text-zinc-700 hover:bg-zinc-50",
                ].join(" ")}
              >
                <span>{opt.label}</span>
                {isSelected && <span className="text-accent flex-shrink-0"><CheckIcon /></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export function WeeklyStep1Location({ data, updateData, onNext }: Props) {
  const countryCode  = data.location?.countryCode ?? "";
  const city         = data.location?.city ?? "";
  const codigoPostal = data.weeklyDetails?.codigoPostal ?? "";

  const country = countryCode ? LOCATIONS[countryCode] : null;

  const canContinue = !!countryCode && !!city && codigoPostal.length >= 3;

  const countryOptions: DropdownOption[] = Object.entries(LOCATIONS).map(([code, loc]) => ({
    label: `${loc.flag}  ${loc.name}`,
    value: code,
  }));

  const cityOptions: DropdownOption[] = country
    ? country.cities.map((c) => ({ label: c, value: c }))
    : [];

  const selectedCountryOpt = countryCode
    ? { label: `${LOCATIONS[countryCode].flag}  ${LOCATIONS[countryCode].name}`, value: countryCode }
    : null;

  const selectedCityOpt = city ? { label: city, value: city } : null;

  const handleCountrySelect = (opt: DropdownOption) => {
    updateData({
      location: { name: LOCATIONS[opt.value].name, city: "", lat: 0, lng: 0, countryCode: opt.value },
      weeklyDetails: { ...data.weeklyDetails },
    });
  };

  const handleCitySelect = (opt: DropdownOption) => {
    updateData({
      location: {
        ...data.location!,
        city: opt.value,
        name: `${opt.value}, ${country!.name}`,
      },
    });
  };

  const handlePostal = (val: string) => {
    const numeric = val.replace(/\D/g, "").slice(0, 8);
    updateData({ weeklyDetails: { ...data.weeklyDetails, codigoPostal: numeric } });
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-serif text-3xl leading-tight text-zinc-900 mb-2">
        ¿Dónde cocinamos?
      </h2>
      <p className="text-sm text-zinc-500 mb-10">
        Tu chef llegará hasta aquí cada semana.
      </p>

      {/* País — siempre visible */}
      <div className="mb-6">
        <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2.5">País</p>
        <SelectDropdown
          placeholder="Seleccioná tu país"
          selected={selectedCountryOpt}
          options={countryOptions}
          onSelect={handleCountrySelect}
        />
      </div>

      {/* Ciudad — aparece tras seleccionar país */}
      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${countryCode ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className={`min-h-0 ${countryCode ? "overflow-visible" : "overflow-hidden"}`}>
          <div className="mb-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2.5">Ciudad</p>
            <SelectDropdown
              placeholder="Seleccioná tu ciudad"
              selected={selectedCityOpt}
              options={cityOptions}
              onSelect={handleCitySelect}
            />
          </div>
        </div>
      </div>

      {/* Código postal — aparece tras seleccionar ciudad */}
      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${city ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden min-h-0">
          <div className="mb-10">
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2.5">Código postal</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Ej: 1425"
              value={codigoPostal}
              onChange={(e) => handlePostal(e.target.value)}
              className="w-full h-14 px-4 rounded-xl border border-zinc-200 text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 hover:border-zinc-300 transition-all duration-200 bg-white"
            />
          </div>
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
