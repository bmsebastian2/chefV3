"use client";

import { useActionState, useState } from "react";
import { savePerfilProfesional } from "@/app/dashboard/perfil/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-5">
      {children}
    </h2>
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
      <label className="block text-sm font-medium text-zinc-700 mb-1.5">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none transition-colors"
      />
    </div>
  );
}

export function PerfilForm({ initialData }: { initialData: PerfilInitialData }) {
  const [state, action, isPending] = useActionState(savePerfilProfesional, null);
  const [tagline, setTagline] = useState(initialData.tagline ?? "");
  const MAX = 150;

  return (
    <form action={action} className="space-y-10">

      {/* ── Bio ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Tu Bio</SectionTitle>
        <div className="space-y-5">

          {/* Tagline con contador */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Preséntate en una frase
            </label>
            <textarea
              name="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={MAX}
              rows={3}
              placeholder="Ej: Chef especializado en cocina mediterránea con 10 años de experiencia..."
              className="w-full px-3 py-2.5 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none transition-colors"
            />
            <p className={`text-xs text-right mt-1 ${tagline.length >= MAX ? "text-red-500" : "text-muted-foreground"}`}>
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
            label="Para mí, cocinar es..."
            defaultValue={initialData.para_mi_cocinar_es ?? ""}
            placeholder="Ej: una forma de expresar emociones y conectar con las personas..."
          />
          <Textarea
            name="aprendi_a_cocinar"
            label="Aprendí a cocinar..."
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

      <hr className="border-zinc-100" />

      {/* ── Idiomas ──────────────────────────────────────────── */}
      <section>
        <SectionTitle>Idiomas en los que trabajo</SectionTitle>
        <p className="text-sm text-muted-foreground mb-4">
          Selecciona los idiomas en los que puedes atender a tus clientes
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {LANGUAGES.map((lang) => (
            <label key={lang.code} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                name={`lang_${lang.code}`}
                defaultChecked={initialData.languages.includes(lang.code)}
                className="w-4 h-4 rounded border-zinc-300 text-accent focus:ring-accent cursor-pointer"
              />
              <span className="text-sm text-zinc-700 group-hover:text-zinc-900 transition-colors">
                {lang.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      <hr className="border-zinc-100" />

      {/* ── Experiencia ──────────────────────────────────────── */}
      <section>
        <SectionTitle>Experiencia</SectionTitle>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Años de experiencia
          </label>
          <Input
            type="number"
            name="experience_years"
            defaultValue={initialData.experience_years ?? ""}
            min={0}
            max={60}
            placeholder="Ej: 10"
          />
        </div>
      </section>

      <hr className="border-zinc-100" />

      {/* ── Redes sociales ───────────────────────────────────── */}
      <section>
        <SectionTitle>Redes Sociales &amp; Web</SectionTitle>
        <div className="space-y-4 max-w-lg">
          {SOCIAL_FIELDS.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                {field.label}
              </label>
              <Input
                type="text"
                name={field.name}
                defaultValue={(initialData[field.name] as string) ?? ""}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Feedback ─────────────────────────────────────────── */}
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}
      {state?.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3">
          <p className="text-sm text-emerald-700 font-medium">¡Perfil guardado correctamente!</p>
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
