"use client";

import { useActionState, useEffect, useState } from "react";
import { saveNombre } from "@/app/client-dashboard/configuracion/actions";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export type NombreInitialData = {
  first_name: string | null;
  first_surname: string | null;
  second_surname: string | null;
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 mb-2">
      {children}
      {required && <span className="text-red-400 ml-1 normal-case tracking-normal font-normal">*</span>}
    </label>
  );
}

const inputClass =
  "w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150";

export function ClientNombreForm({ initialData }: { initialData: NombreInitialData }) {
  const [state, action, isPending] = useActionState(saveNombre, null);

  const [firstName, setFirstName] = useState(initialData.first_name ?? "");
  const [firstSurname, setFirstSurname] = useState(initialData.first_surname ?? "");
  const [secondSurname, setSecondSurname] = useState(initialData.second_surname ?? "");

  // Valores de referencia para detectar cambios; se actualizan al guardar con éxito.
  const [saved, setSaved] = useState({
    first_name: initialData.first_name ?? "",
    first_surname: initialData.first_surname ?? "",
    second_surname: initialData.second_surname ?? "",
  });

  useEffect(() => {
    if (state?.success) {
      setSaved({
        first_name: firstName.trim(),
        first_surname: firstSurname.trim(),
        second_surname: secondSurname.trim(),
      });
    }
    // Solo cuando cambia el resultado del action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const isDirty =
    firstName.trim() !== saved.first_name ||
    firstSurname.trim() !== saved.first_surname ||
    secondSurname.trim() !== saved.second_surname;

  const isEmpty = firstName.trim() === "";

  return (
    <form action={action} className="space-y-5 max-w-md">
      <div>
        <FieldLabel required>Nombre</FieldLabel>
        <input
          type="text"
          name="first_name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Tu nombre"
          className={inputClass}
        />
      </div>

      <div>
        <FieldLabel>Primer apellido</FieldLabel>
        <input
          type="text"
          name="first_surname"
          value={firstSurname}
          onChange={(e) => setFirstSurname(e.target.value)}
          placeholder="Tu primer apellido"
          className={inputClass}
        />
      </div>

      <div>
        <FieldLabel>Segundo apellido</FieldLabel>
        <input
          type="text"
          name="second_surname"
          value={secondSurname}
          onChange={(e) => setSecondSurname(e.target.value)}
          placeholder="Tu segundo apellido"
          className={inputClass}
        />
      </div>

      {/* Feedback */}
      {state?.error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3.5">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}
      {state?.success && !isDirty && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">¡Nombre guardado correctamente!</p>
        </div>
      )}

      <div className="pt-1">
        <button
          type="submit"
          disabled={isPending || !isDirty || isEmpty}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold text-sm h-11 px-8 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
