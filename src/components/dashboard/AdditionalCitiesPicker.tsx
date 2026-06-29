"use client";

import { useState } from "react";
import { getCatalogCities } from "@/lib/maps/cities";
import { normalizeCity } from "@/lib/maps/normalizeCity";
import { MapPin, Plus, Check, Search } from "lucide-react";

/**
 * Selector de ciudades adicionales del chef (dentro de su mismo país).
 *
 * Self-contained: maneja su propio estado, emite un <input hidden
 * name="additional_cities"> con el JSON de CLAVES NORMALIZADAS para que el server
 * action lo persista, y se valida contra el catálogo del país (no texto libre).
 *
 * La ciudad base (`city`) y el `country` se editan en Perfil → Ubicación; acá
 * llegan como solo-lectura para anclar la cobertura y excluir la ciudad base.
 * Si el país no tiene catálogo, no renderiza nada (la función no aplica todavía).
 */
export function AdditionalCitiesPicker({
  city,
  country,
  initialKeys,
}: {
  city:        string | null;
  country:     string | null;
  initialKeys: string[];
}) {
  const catalog = getCatalogCities(country);
  const primaryKey = normalizeCity(city);
  const primaryName = city ?? "";

  // Estado: solo claves válidas del catálogo y distintas de la ciudad base.
  const validKeys = new Set((catalog ?? []).map((c) => c.key));
  const [additionalKeys, setAdditionalKeys] = useState<string[]>(() =>
    Array.from(
      new Set(
        (initialKeys ?? [])
          .map((k) => normalizeCity(k))
          .filter((k): k is string => !!k && validKeys.has(k) && k !== primaryKey)
      )
    )
  );
  const [query, setQuery] = useState("");

  function toggle(key: string) {
    setAdditionalKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  // Cabecera reutilizable de la sección.
  const header = (
    <>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="h-px w-5 bg-accent/60 rounded-full" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          Ciudades que cubrís
        </h2>
      </div>
      <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
        Recibí solicitudes de tu ciudad y de otras donde estés dispuesto a trabajar.
        Todas dentro de tu país.
      </p>
    </>
  );

  // Sin catálogo: el país del chef no tiene lista de ciudades todavía (hoy solo
  // Nicaragua). En vez de ocultar la sección, se explica por qué no está disponible.
  if (!catalog) {
    return (
      <section>
        {header}
        <div className="flex items-start gap-2.5 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3.5">
          <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-500">
            {country
              ? <>Esta función todavía no está disponible para <span className="font-medium text-zinc-700">{country}</span>. Por ahora solo cubre Nicaragua.</>
              : <>Definí tu país en <a href="/dashboard/ubicacion" className="text-accent font-medium hover:text-accent/80 underline underline-offset-2">Perfil → Ubicación</a> para habilitar las ciudades de cobertura.</>}
          </p>
        </div>
      </section>
    );
  }

  const options = catalog.filter((c) => c.key !== primaryKey);
  const filtered = query
    ? options.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selectedSet = new Set(additionalKeys);
  const coveredNames = [
    primaryName,
    ...catalog.filter((c) => selectedSet.has(c.key)).map((c) => c.name),
  ].filter(Boolean);
  const coveredCount = coveredNames.length;

  return (
    <section>
      {/* Input que viaja con el form al server action */}
      <input type="hidden" name="additional_cities" value={JSON.stringify(additionalKeys)} />

      {header}

      {!primaryName ? (
        <div className="flex items-center gap-2.5 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3.5">
          <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
          <p className="text-sm text-zinc-500">
            Definí primero tu ciudad base en{" "}
            <a href="/dashboard/ubicacion" className="text-accent font-medium hover:text-accent/80 underline underline-offset-2">
              Perfil → Ubicación
            </a>{" "}
            para sumar ciudades adicionales.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Ciudad base — chip fijo, se edita en Ubicación */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-2">
              Tu ciudad
            </p>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold ring-1 ring-accent/20">
              <MapPin className="w-3.5 h-3.5" />
              {primaryName}
            </span>
          </div>

          {/* Adicionales */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                Ciudades adicionales
              </p>
              {additionalKeys.length > 0 && (
                <span className="text-[11px] font-medium text-accent tabular-nums">
                  {additionalKeys.length} seleccionada{additionalKeys.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Buscador */}
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar ciudad…"
                className="w-full h-11 pl-10 pr-4 border border-zinc-200 rounded-xl text-sm bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
              />
            </div>

            {/* Chips */}
            {filtered.length === 0 ? (
              <p className="text-sm text-zinc-400 px-1 py-2">Sin resultados.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filtered.map((c) => {
                  const active = selectedSet.has(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggle(c.key)}
                      className={[
                        "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-all duration-150",
                        active
                          ? "bg-accent text-white border-accent shadow-sm shadow-accent/20"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:text-zinc-800",
                      ].join(" ")}
                    >
                      {active ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-zinc-400" />}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumen de cobertura */}
          <div className="bg-zinc-50/70 border border-zinc-100 rounded-xl px-4 py-3">
            <p className="text-sm text-zinc-600">
              <span className="font-semibold text-zinc-800">
                {coveredCount} ciudad{coveredCount !== 1 ? "es" : ""} cubierta{coveredCount !== 1 ? "s" : ""}
              </span>
              <span className="text-zinc-400"> · </span>
              {coveredNames.join(", ")}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
