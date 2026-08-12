"use client";

import { useActionState, useEffect, useState } from "react";
import { savePerfilProfesional } from "@/app/dashboard/perfil/actions";
import {
  AlertCircle, CheckCircle2, ChevronLeft, Pencil,
  Globe, AtSign, Link2, Play, Briefcase, Plus,
} from "lucide-react";

const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "it", label: "Italiano" },
];

const SOCIAL_FIELDS = [
  { name: "sitio_web",  label: "Sitio Web",  placeholder: "https://tuweb.com" },
  { name: "instagram",  label: "Instagram",  placeholder: "@tuusuario" },
  { name: "facebook",   label: "Facebook",   placeholder: "facebook.com/tupagina" },
  { name: "youtube",    label: "YouTube",    placeholder: "youtube.com/tucanal" },
  { name: "linkedin",   label: "LinkedIn",   placeholder: "linkedin.com/in/tuperfil" },
] as const;

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  sitio_web: <Globe      className="w-4 h-4" />,
  instagram: <AtSign     className="w-4 h-4" />,
  facebook:  <Link2      className="w-4 h-4" />,
  youtube:   <Play       className="w-4 h-4" />,
  linkedin:  <Briefcase  className="w-4 h-4" />,
};

const STEPS = [
  { title: "Preséntate en una frase",  desc: "Lo primero que va a leer un cliente sobre vos." },
  { title: "Contá tu historia",        desc: "Tu trayectoria y lo que te apasiona de la cocina." },
  { title: "Tu experiencia",           desc: "Años en la cocina e idiomas en los que atendés." },
  { title: "Redes y web",              desc: "Opcional — para que los clientes te sigan." },
] as const;

const DRAFT_KEY = "getchef:perfil-draft:v1";
const TAGLINE_MAX = 150;

export type PerfilInitialData = {
  tagline:            string | null
  acerca_de_mi:       string | null
  experience_years:   number | null
  sitio_web:          string | null
  instagram:          string | null
  facebook:           string | null
  youtube:            string | null
  linkedin:           string | null
  languages:          string[]
}

type FormValues = {
  tagline:            string
  acerca_de_mi:       string
  experience_years:   string
  languages:          string[]
  sitio_web:          string
  instagram:          string
  facebook:           string
  youtube:            string
  linkedin:           string
}

type Draft = FormValues & { step: number; showSocial: boolean }

function valuesFromInitial(initialData: PerfilInitialData): FormValues {
  return {
    tagline:            initialData.tagline ?? "",
    acerca_de_mi:       initialData.acerca_de_mi ?? "",
    experience_years:   initialData.experience_years?.toString() ?? "",
    languages:          initialData.languages,
    sitio_web:          initialData.sitio_web ?? "",
    instagram:          initialData.instagram ?? "",
    facebook:           initialData.facebook ?? "",
    youtube:            initialData.youtube ?? "",
    linkedin:           initialData.linkedin ?? "",
  };
}

// ── Helpers de UI ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 mb-2">
      {children}
    </label>
  );
}

function StepPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={active ? "block animate-in fade-in slide-in-from-bottom-2 duration-400" : "hidden"}>
      {children}
    </div>
  );
}

// ── Formulario principal ───────────────────────────────────────────────────────

export function PerfilForm({ initialData }: { initialData: PerfilInitialData }) {
  const [state, action, isPending] = useActionState(savePerfilProfesional, null);
  const hasExistingData = !!(initialData.tagline || initialData.acerca_de_mi);
  const [mode, setMode] = useState<"summary" | "wizard">(hasExistingData ? "summary" : "wizard");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(() => valuesFromInitial(initialData));
  const [showSocial, setShowSocial] = useState(
    !!(initialData.sitio_web || initialData.instagram || initialData.facebook || initialData.youtube || initialData.linkedin)
  );

  const editStep = (target: number) => {
    setStep(target);
    setMode("wizard");
  };

  // Restaurar borrador (solo en cliente, después del montaje inicial, para no
  // pisar el HTML del servidor y evitar un mismatch de hidratación).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      setValues({
        tagline:          draft.tagline          ?? "",
        acerca_de_mi:     draft.acerca_de_mi      ?? "",
        experience_years: draft.experience_years  ?? "",
        languages:        draft.languages         ?? [],
        sitio_web:        draft.sitio_web         ?? "",
        instagram:        draft.instagram         ?? "",
        facebook:         draft.facebook          ?? "",
        youtube:          draft.youtube           ?? "",
        linkedin:         draft.linkedin          ?? "",
      });
      setStep(draft.step ?? 0);
      setShowSocial(draft.showSocial ?? showSocial);
      // Había una edición en curso sin guardar — se retoma ahí, no se tapa
      // con el resumen (perdería de vista que quedó a mitad de camino).
      setMode("wizard");
    } catch {
      // borrador corrupto o sessionStorage no disponible — se ignora
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar borrador mientras el chef navega, para no perder lo escrito si
  // cierra la pestaña o navega por error.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const draft: Draft = { ...values, step, showSocial };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // sessionStorage no disponible (modo privado, etc.) — se ignora
      }
    }, 300);
    return () => clearTimeout(id);
  }, [values, step, showSocial]);

  // Al guardar con éxito, el borrador ya no representa cambios pendientes.
  useEffect(() => {
    if (state?.success) {
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
      setMode("summary");
    }
  }, [state?.success]);

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const toggleLanguage = (code: string) =>
    setValues((v) => ({
      ...v,
      languages: v.languages.includes(code)
        ? v.languages.filter((c) => c !== code)
        : [...v.languages, code],
    }));

  const isLastStep = step === STEPS.length - 1;
  const progressPercent = ((step + 1) / STEPS.length) * 100;

  if (mode === "summary") {
    const languageLabels = values.languages
      .map((code) => LANGUAGES.find((l) => l.code === code)?.label)
      .filter(Boolean)
      .join(", ");
    const socialLabels = SOCIAL_FIELDS
      .filter((f) => values[f.name])
      .map((f) => f.label)
      .join(", ");

    const rows: { label: string; value: string; empty?: boolean; step: number }[] = [
      { label: "Preséntate en una frase", value: values.tagline || "Sin completar", empty: !values.tagline, step: 0 },
      { label: "Sobre mí", value: values.acerca_de_mi || "Sin completar", empty: !values.acerca_de_mi, step: 1 },
      {
        label: "Experiencia",
        value: [
          values.experience_years ? `${values.experience_years} años de experiencia` : null,
          languageLabels || null,
        ].filter(Boolean).join(" · ") || "Sin completar",
        empty: !values.experience_years && !languageLabels,
        step: 2,
      },
      { label: "Redes y web", value: socialLabels || "No agregaste redes", empty: !socialLabels, step: 3 },
    ];

    return (
      <div className="space-y-8">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-3.5 py-1.5 text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Perfil completo
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400 mb-1.5">
                  {row.label}
                </p>
                <p className={`text-sm leading-relaxed line-clamp-2 ${row.empty ? "text-zinc-400 italic" : "text-zinc-700"}`}>
                  {row.value}
                </p>
              </div>
              <button
                type="button"
                onClick={() => editStep(row.step)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => editStep(0)}
          className="text-xs font-semibold text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Editar todo desde el principio
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-8">

      {/* ── Progreso ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-zinc-400 tracking-wide">
            Paso {step + 1} de {STEPS.length}
          </span>
          {hasExistingData && (
            <button
              type="button"
              onClick={() => setMode("summary")}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Volver al resumen
            </button>
          )}
        </div>
        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── Encabezado del paso actual ──────────────────────────────────── */}
      <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-400">
        <h2 className="font-serif text-2xl font-semibold text-zinc-900 mb-1.5">
          {STEPS[step].title}
        </h2>
        <p className="text-sm text-zinc-500 leading-relaxed">{STEPS[step].desc}</p>
      </div>

      {/* ── Paso 1: Tagline ─────────────────────────────────────────────── */}
      <StepPanel active={step === 0}>
        <div>
          <FieldLabel>Preséntate en una frase</FieldLabel>
          <textarea
            name="tagline"
            value={values.tagline}
            onChange={(e) => setField("tagline", e.target.value)}
            maxLength={TAGLINE_MAX}
            rows={3}
            placeholder="Ej: Chef especializado en cocina mediterránea con 10 años de experiencia..."
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent resize-none transition-all duration-150"
          />
          <p className={`text-[11px] text-right mt-1.5 tabular-nums ${values.tagline.length >= TAGLINE_MAX ? "text-red-500 font-semibold" : "text-zinc-400"}`}>
            {values.tagline.length} / {TAGLINE_MAX}
          </p>
        </div>
      </StepPanel>

      {/* ── Paso 2: Sobre mí ────────────────────────────────────────────── */}
      <StepPanel active={step === 1}>
        <div>
          <FieldLabel>Sobre mí</FieldLabel>
          <textarea
            name="acerca_de_mi"
            value={values.acerca_de_mi}
            onChange={(e) => setField("acerca_de_mi", e.target.value)}
            rows={7}
            placeholder="Cuéntanos tu historia, tu trayectoria y lo que te apasiona de la cocina..."
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent resize-none transition-all duration-150"
          />
        </div>
      </StepPanel>

      {/* ── Paso 3: Experiencia + idiomas ───────────────────────────────── */}
      <StepPanel active={step === 2}>
        <div className="space-y-7">
          <div className="max-w-xs">
            <FieldLabel>Años de experiencia</FieldLabel>
            <input
              type="number"
              name="experience_years"
              value={values.experience_years}
              onChange={(e) => setField("experience_years", e.target.value)}
              min={0}
              max={60}
              placeholder="Ej: 10"
              className="w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
            />
          </div>
          <div>
            <FieldLabel>Idiomas en los que trabajo</FieldLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {LANGUAGES.map((lang) => (
                <label
                  key={lang.code}
                  className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-all duration-150 bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 has-[:checked]:bg-accent/8 has-[:checked]:border-accent has-[:checked]:text-accent"
                >
                  <input
                    type="checkbox"
                    name={`lang_${lang.code}`}
                    checked={values.languages.includes(lang.code)}
                    onChange={() => toggleLanguage(lang.code)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium select-none">{lang.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </StepPanel>

      {/* ── Paso 4: Redes sociales ───────────────────────────────────────── */}
      <StepPanel active={step === 3}>
        <div>
          {!showSocial ? (
            <button
              type="button"
              onClick={() => setShowSocial(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-500 hover:border-accent hover:text-accent transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              Agregar redes sociales
            </button>
          ) : (
            <div className="space-y-4 max-w-lg">
              {SOCIAL_FIELDS.map((field) => (
                <div key={field.name}>
                  <FieldLabel>{field.label}</FieldLabel>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none">
                      {SOCIAL_ICONS[field.name]}
                    </div>
                    <input
                      type="text"
                      name={field.name}
                      value={values[field.name]}
                      onChange={(e) => setField(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full h-11 pl-10 pr-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Feedback ─────────────────────────────────────────── */}
        {state?.error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3.5 mt-7">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}
        {state?.success && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3.5 mt-7">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">¡Perfil guardado correctamente!</p>
          </div>
        )}
      </StepPanel>

      {/* ── Navegación ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 pb-10">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-900 h-11 px-4 rounded-xl transition-colors duration-150"
          >
            <ChevronLeft className="w-4 h-4" />
            Atrás
          </button>
        ) : (
          <span />
        )}

        {isLastStep ? (
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold text-sm h-11 px-8 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold text-sm h-11 px-8 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5"
          >
            Continuar
          </button>
        )}
      </div>
    </form>
  );
}
