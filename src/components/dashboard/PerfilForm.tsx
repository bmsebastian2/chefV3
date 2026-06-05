"use client";

import { useActionState, useState } from "react";
import { savePerfilProfesional } from "@/app/dashboard/perfil/actions";
import {
  AlertCircle, CheckCircle2,
  Globe, AtSign, Link2, Play, Briefcase,
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

export type PerfilInitialData = {
  tagline:            string | null
  acerca_de_mi:       string | null
  para_mi_cocinar_es: string | null
  aprendi_a_cocinar:  string | null
  mi_secreto_cocina:  string | null
  experience_years:   number | null
  sitio_web:          string | null
  instagram:          string | null
  facebook:           string | null
  youtube:            string | null
  linkedin:           string | null
  languages:          string[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function Textarea({
  name,
  label,
  placeholder,
  defaultValue,
  rows = 3,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent resize-none transition-all duration-150"
      />
    </div>
  );
}

// ── Formulario principal ───────────────────────────────────────────────────────

export function PerfilForm({ initialData }: { initialData: PerfilInitialData }) {
  const [state, action, isPending] = useActionState(savePerfilProfesional, null);
  const [tagline, setTagline] = useState(initialData.tagline ?? "");
  const MAX = 150;

  return (
    <form action={action} className="space-y-10">

      {/* ── Bio ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Tu Bio</SectionTitle>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          Contale a los clientes quién sos y qué hace especial tu cocina.
        </p>
        <div className="space-y-5">

          {/* Tagline con contador */}
          <div>
            <FieldLabel>Preséntate en una frase</FieldLabel>
            <textarea
              name="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={MAX}
              rows={3}
              placeholder="Ej: Chef especializado en cocina mediterránea con 10 años de experiencia..."
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent resize-none transition-all duration-150"
            />
            <p className={`text-[11px] text-right mt-1.5 tabular-nums ${tagline.length >= MAX ? "text-red-500 font-semibold" : "text-zinc-400"}`}>
              {tagline.length} / {MAX}
            </p>
          </div>

          <Textarea
            name="acerca_de_mi"
            label="Sobre mí"
            rows={5}
            defaultValue={initialData.acerca_de_mi ?? ""}
            placeholder="Cuéntanos tu historia, tu trayectoria y lo que te apasiona de la cocina..."
          />
          <Textarea
            name="para_mi_cocinar_es"
            label="Para mí, cocinar es…"
            defaultValue={initialData.para_mi_cocinar_es ?? ""}
            placeholder="Ej: una forma de expresar emociones y conectar con las personas..."
          />
          <Textarea
            name="aprendi_a_cocinar"
            label="Aprendí a cocinar…"
            defaultValue={initialData.aprendi_a_cocinar ?? ""}
            placeholder="Ej: de mi abuela en la cocina familiar, cuando tenía 8 años..."
          />
          <Textarea
            name="mi_secreto_cocina"
            label="Mi secreto en la cocina"
            defaultValue={initialData.mi_secreto_cocina ?? ""}
            placeholder="Ej: siempre uso ingredientes locales de temporada..."
          />
        </div>
      </section>

      <div className="border-t border-zinc-100" />

      {/* ── Idiomas ──────────────────────────────────────────── */}
      <section>
        <SectionTitle>Idiomas en los que trabajo</SectionTitle>
        <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
          Selecciona los idiomas en los que podés atender a tus clientes.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {LANGUAGES.map((lang) => (
            <label
              key={lang.code}
              className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-all duration-150 bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 has-[:checked]:bg-accent/8 has-[:checked]:border-accent has-[:checked]:text-accent"
            >
              <input
                type="checkbox"
                name={`lang_${lang.code}`}
                defaultChecked={initialData.languages.includes(lang.code)}
                className="sr-only"
              />
              <span className="text-sm font-medium select-none">{lang.label}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="border-t border-zinc-100" />

      {/* ── Experiencia ──────────────────────────────────────── */}
      <section>
        <SectionTitle>Experiencia</SectionTitle>
        <div className="max-w-xs">
          <FieldLabel>Años de experiencia</FieldLabel>
          <input
            type="number"
            name="experience_years"
            defaultValue={initialData.experience_years ?? ""}
            min={0}
            max={60}
            placeholder="Ej: 10"
            className="w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
          />
        </div>
      </section>

      <div className="border-t border-zinc-100" />

      {/* ── Redes sociales ───────────────────────────────────── */}
      <section>
        <SectionTitle>Redes Sociales &amp; Web</SectionTitle>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          Opcional. Aparecerán en tu perfil público para que los clientes te sigan.
        </p>
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
                  defaultValue={(initialData[field.name] as string) ?? ""}
                  placeholder={field.placeholder}
                  className="w-full h-11 pl-10 pr-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feedback ─────────────────────────────────────────── */}
      {state?.error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3.5">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">¡Perfil guardado correctamente!</p>
        </div>
      )}

      {/* ── Submit ──────────────────────────────────────────────── */}
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
