"use client";

// ============================================================================
// Editor de la cuenta de pago del chef (datos bancarios · DATO SENSIBLE)
//
// Tres bloques: titular · cuenta bancaria · dirección fiscal.
// Guarda vía server action → RPC SECURITY DEFINER (save_chef_payout_account).
//
// Cambiar la cuenta de depósito es una acción sensible: si ya había datos
// cargados, el guardado pasa por un diálogo de confirmación que muestra la
// cuenta anterior contra la nueva. La primera carga guarda directo.
// ============================================================================

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Country } from "country-state-city";
import { savePayoutAccount } from "@/app/dashboard/pagos/actions";
import { AlertCircle, CheckCircle2, ChevronDown, ShieldCheck, X } from "lucide-react";

// ── Catálogos ────────────────────────────────────────────────────────────────

const LEGAL_STATUS = [
  { value: "self_employed", label: "Trabajador por cuenta propia" },
  { value: "individual",    label: "Particular" },
  { value: "company",       label: "Compañía" },
];

const DOCUMENT_TYPES = [
  { value: "cedula",     label: "Cédula de identidad" },
  { value: "passport",   label: "Pasaporte" },
  { value: "residencia", label: "Cédula de residencia" },
  { value: "ruc",        label: "RUC" },
];

const ACCOUNT_TYPES = [
  { value: "ahorro",    label: "Ahorro" },
  { value: "corriente", label: "Corriente" },
];

const CURRENCIES = [
  { value: "USD", label: "Dólares (USD)" },
  { value: "NIO", label: "Córdobas (NIO)" },
];

// Sugerencias, no lista cerrada: el chef puede escribir cualquier banco. Están
// para que quien usa uno de estos lo escriba siempre igual y el admin no lea
// seis grafías del mismo banco.
const BANK_SUGGESTIONS = [
  "BAC Credomatic",
  "Banpro",
  "LAFISE Bancentro",
  "Ficohsa",
  "Avanz",
  "Banco Atlántida",
];

// ── Tipos ────────────────────────────────────────────────────────────────────

export type PayoutInitialData = {
  legal_status:    string | null;
  account_holder:  string | null;
  document_type:   string | null;
  document_id:     string | null;
  bank_name:       string | null;
  account_type:    string | null;
  currency:        string | null;
  account_number:  string | null;
  address_line:    string | null;
  address_city:    string | null;
  address_country: string | null;
  postal_code:     string | null;
};

type Fields = Record<keyof PayoutInitialData, string>;

const FIELD_KEYS: (keyof PayoutInitialData)[] = [
  "legal_status", "account_holder", "document_type", "document_id",
  "bank_name", "account_type", "currency", "account_number",
  "address_line", "address_city", "address_country", "postal_code",
];

function toFields(d: PayoutInitialData): Fields {
  return Object.fromEntries(FIELD_KEYS.map((k) => [k, d[k] ?? ""])) as Fields;
}

// ── Piezas de UI (mismo lenguaje visual que UbicacionForm) ───────────────────

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

const inputClass =
  "w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150";

const selectClass =
  "w-full h-11 appearance-none px-4 pr-10 border border-zinc-200 rounded-xl text-sm text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150 cursor-pointer";

function Select({
  name,
  value,
  onChange,
  options,
  placeholder,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
    </div>
  );
}

// Muestra los últimos 4 dígitos: alcanza para que el chef reconozca la cuenta
// en el diálogo de confirmación sin repetir el número completo en pantalla.
function maskAccount(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (digits.length <= 4) return digits || "—";
  return `···· ${digits.slice(-4)}`;
}

// ── Formulario ───────────────────────────────────────────────────────────────

export function PayoutAccountForm({
  initialData,
  hasExisting,
}: {
  initialData: PayoutInitialData;
  hasExisting: boolean;
}) {
  const [state, action, isPending] = useActionState(savePayoutAccount, null);

  const [fields, setFields] = useState<Fields>(() => toFields(initialData));
  const [saved, setSaved]   = useState<Fields>(() => toFields(initialData));
  const [confirmOpen, setConfirmOpen] = useState(false);

  const set = (key: keyof Fields, value: string) =>
    setFields((f) => ({ ...f, [key]: value }));

  // Al guardar con éxito, la referencia de "sin cambios" pasa a ser lo enviado.
  useEffect(() => {
    if (state?.success) {
      setSaved(fields);
      setConfirmOpen(false);
    }
    // Solo cuando cambia el resultado del action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Una compañía cobra con RUC, no con documento personal (el RPC lo exige).
  useEffect(() => {
    if (fields.legal_status === "company" && fields.document_type !== "ruc") {
      set("document_type", "ruc");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.legal_status]);

  const isCompany = fields.legal_status === "company";

  const countryOptions = useMemo(
    () =>
      Country.getAllCountries().map((c) => ({
        value: c.name,
        label: `${c.flag ?? ""} ${c.name}`.trim(),
      })),
    []
  );

  const documentOptions = isCompany
    ? DOCUMENT_TYPES.filter((d) => d.value === "ruc")
    : DOCUMENT_TYPES;

  const isDirty = FIELD_KEYS.some((k) => fields[k].trim() !== saved[k].trim());

  // postal_code es el único opcional: en Nicaragua es de uso marginal.
  const isComplete = FIELD_KEYS.filter((k) => k !== "postal_code").every(
    (k) => fields[k].trim() !== ""
  );

  const canSubmit = !isPending && isDirty && isComplete;

  return (
    <>
      <form id="payout-form" action={action} className="space-y-10">
        {/* ── Titular ─────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Datos del titular</SectionTitle>
          <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
            Estos datos identifican a quien recibe el depósito. Deben coincidir con
            los que figuran en la cuenta bancaria.
          </p>

          <div className="space-y-5 max-w-md">
            <div>
              <FieldLabel required>Estatus legal</FieldLabel>
              <Select
                name="legal_status"
                value={fields.legal_status}
                onChange={(v) => set("legal_status", v)}
                options={LEGAL_STATUS}
                placeholder="Seleccioná una opción"
              />
            </div>

            <div>
              <FieldLabel required>{isCompany ? "Razón social" : "Nombre y apellido"}</FieldLabel>
              <input
                type="text"
                name="account_holder"
                value={fields.account_holder}
                onChange={(e) => set("account_holder", e.target.value)}
                placeholder={isCompany ? "Nombre legal de la empresa" : "Como figura en tu cuenta bancaria"}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Tipo de documento</FieldLabel>
                <Select
                  name="document_type"
                  value={fields.document_type}
                  onChange={(v) => set("document_type", v)}
                  options={documentOptions}
                  placeholder="Seleccioná"
                />
              </div>
              <div>
                <FieldLabel required>Número</FieldLabel>
                <input
                  type="text"
                  name="document_id"
                  value={fields.document_id}
                  onChange={(e) => set("document_id", e.target.value)}
                  placeholder={
                    fields.document_type === "passport" ? "D098342" : "001-010101-0001A"
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-zinc-100" />

        {/* ── Cuenta bancaria ─────────────────────────────────────── */}
        <section>
          <SectionTitle>Cuenta bancaria</SectionTitle>
          <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
            Depositamos tus ganancias acá después de cada servicio completado.
          </p>

          <div className="space-y-5 max-w-md">
            <div>
              <FieldLabel required>Banco</FieldLabel>
              <input
                type="text"
                name="bank_name"
                list="bank-suggestions"
                value={fields.bank_name}
                onChange={(e) => set("bank_name", e.target.value)}
                placeholder="Escribí el nombre de tu banco"
                className={inputClass}
              />
              <datalist id="bank-suggestions">
                {BANK_SUGGESTIONS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Tipo de cuenta</FieldLabel>
                <Select
                  name="account_type"
                  value={fields.account_type}
                  onChange={(v) => set("account_type", v)}
                  options={ACCOUNT_TYPES}
                  placeholder="Seleccioná"
                />
              </div>
              <div>
                <FieldLabel required>Moneda</FieldLabel>
                <Select
                  name="currency"
                  value={fields.currency}
                  onChange={(v) => set("currency", v)}
                  options={CURRENCIES}
                  placeholder="Seleccioná"
                />
              </div>
            </div>

            <div>
              <FieldLabel required>Número de cuenta</FieldLabel>
              <input
                type="text"
                name="account_number"
                inputMode="numeric"
                value={fields.account_number}
                onChange={(e) => set("account_number", e.target.value)}
                placeholder="Solo números"
                className={`${inputClass} font-mono`}
              />
              <p className="text-xs text-zinc-400 mt-2">
                Revisá el número con calma: un dígito equivocado hace que el banco
                rechace el depósito.
              </p>
            </div>
          </div>

          {/* El titular que no coincide es la causa #1 de depósito rechazado, y el
              chef es el único que puede prevenirlo. */}
          <div className="flex items-start gap-3 bg-amber-50/70 border border-amber-100 rounded-xl px-4 py-3.5 mt-6 max-w-md">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 leading-relaxed">
              El nombre del titular debe coincidir <strong>exactamente</strong> con el
              de la cuenta bancaria. Si no coincide, el banco rechaza el depósito.
            </p>
          </div>
        </section>

        <div className="border-t border-zinc-100" />

        {/* ── Dirección fiscal ────────────────────────────────────── */}
        <section>
          <SectionTitle>Dirección fiscal</SectionTitle>
          <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
            Dirección asociada al titular de la cuenta. No se envía nada a este
            domicilio: el pago es por depósito bancario.
          </p>

          <div className="space-y-5 max-w-md">
            <div>
              <FieldLabel required>Dirección</FieldLabel>
              <input
                type="text"
                name="address_line"
                value={fields.address_line}
                onChange={(e) => set("address_line", e.target.value)}
                placeholder="Calle, número, referencia"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Ciudad</FieldLabel>
                <input
                  type="text"
                  name="address_city"
                  value={fields.address_city}
                  onChange={(e) => set("address_city", e.target.value)}
                  placeholder="Ciudad"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Código postal</FieldLabel>
                <input
                  type="text"
                  name="postal_code"
                  value={fields.postal_code}
                  onChange={(e) => set("postal_code", e.target.value)}
                  placeholder="Opcional"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <FieldLabel required>País</FieldLabel>
              <Select
                name="address_country"
                value={fields.address_country}
                onChange={(v) => set("address_country", v)}
                options={countryOptions}
                placeholder="Seleccioná un país"
              />
            </div>
          </div>
        </section>

        {/* ── Feedback ────────────────────────────────────────────── */}
        {state?.error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3.5 max-w-md">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}
        {state?.success && !isDirty && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3.5 max-w-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">
              ¡Datos de pago guardados correctamente!
            </p>
          </div>
        )}

        {/* ── Submit ──────────────────────────────────────────────── */}
        <div className="pt-2 pb-10 flex items-center gap-4 flex-wrap">
          {hasExisting ? (
            // Ya hay una cuenta cargada → confirmación antes de reemplazarla.
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold text-sm h-11 px-8 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none"
            >
              Guardar cambios
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold text-sm h-11 px-8 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none"
            >
              {isPending ? "Guardando…" : "Guardar datos de pago"}
            </button>
          )}

          <p className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Solo vos y el equipo de GetChef vemos estos datos.
          </p>
        </div>
      </form>

      {confirmOpen && (
        <ConfirmDialog
          isPending={isPending}
          previous={saved}
          next={fields}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}

// ── Diálogo de confirmación ──────────────────────────────────────────────────
// Vive FUERA del <form> y envía con el atributo form="payout-form", así el
// useActionState del formulario sigue manejando el envío.

function ConfirmDialog({
  isPending,
  previous,
  next,
  onClose,
}: {
  isPending: boolean;
  previous: Fields;
  next: Fields;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) onClose();
    }
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [isPending, onClose]);

  const changedAccount =
    previous.account_number.replace(/\D/g, "") !== next.account_number.replace(/\D/g, "") ||
    previous.bank_name.trim() !== next.bank_name.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !isPending && onClose()}
        aria-hidden
      />

      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payout-confirm-title"
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          aria-label="Cerrar"
          className="absolute top-4 right-4 p-1 text-zinc-300 hover:text-zinc-500 transition-colors disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        <h3
          id="payout-confirm-title"
          className="font-serif text-xl font-semibold text-zinc-900 mb-2 pr-6"
        >
          ¿Confirmás el cambio?
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-5">
          {changedAccount
            ? "Estás cambiando la cuenta donde recibís tus ganancias. Los próximos depósitos van a ir a la cuenta nueva."
            : "Vas a actualizar tus datos de pago."}
        </p>

        {changedAccount && (
          <div className="rounded-xl border border-zinc-100 divide-y divide-zinc-100 mb-6">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Antes</span>
              <span className="text-sm text-zinc-500">
                {previous.bank_name || "—"} · <span className="font-mono">{maskAccount(previous.account_number)}</span>
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-accent/5">
              <span className="text-xs uppercase tracking-wider text-accent">Ahora</span>
              <span className="text-sm font-medium text-zinc-900">
                {next.bank_name || "—"} · <span className="font-mono">{maskAccount(next.account_number)}</span>
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 h-11 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="payout-form"
            disabled={isPending}
            className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {isPending ? "Guardando…" : "Sí, confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
