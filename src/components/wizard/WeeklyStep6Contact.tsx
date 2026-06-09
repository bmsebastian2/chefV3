"use client";

import { useState, useRef, useEffect } from "react";
import { WizardData, ClientExtras } from "./types";
import { registerOrVerifyClient, submitWeeklyRequest } from "@/app/wizard/actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PHONE_CODES: Record<string, { flag: string; dialCode: string; name: string }> = {
  AR: { flag: "🇦🇷", dialCode: "+54",  name: "Argentina" },
  MX: { flag: "🇲🇽", dialCode: "+52",  name: "México" },
  CO: { flag: "🇨🇴", dialCode: "+57",  name: "Colombia" },
  CL: { flag: "🇨🇱", dialCode: "+56",  name: "Chile" },
  PE: { flag: "🇵🇪", dialCode: "+51",  name: "Perú" },
  UY: { flag: "🇺🇾", dialCode: "+598", name: "Uruguay" },
  BR: { flag: "🇧🇷", dialCode: "+55",  name: "Brasil" },
  EC: { flag: "🇪🇨", dialCode: "+593", name: "Ecuador" },
  PA: { flag: "🇵🇦", dialCode: "+507", name: "Panamá" },
  CR: { flag: "🇨🇷", dialCode: "+506", name: "Costa Rica" },
  PY: { flag: "🇵🇾", dialCode: "+595", name: "Paraguay" },
  BO: { flag: "🇧🇴", dialCode: "+591", name: "Bolivia" },
  NI: { flag: "🇳🇮", dialCode: "+505", name: "Nicaragua" },
};

const DAY_NAMES: Record<number, string> = {
  1: "Lun", 2: "Mar", 3: "Mié",
  4: "Jue", 5: "Vie", 6: "Sáb", 7: "Dom",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
  );
}

interface Props {
  data: WizardData;
  onNext: (status: "active" | "pending") => void;
}

export function WeeklyStep6Contact({ data, onNext }: Props) {
  const defaultCountry = data.location?.countryCode && data.location.countryCode in PHONE_CODES
    ? data.location.countryCode
    : "AR";

  const [name,        setName]        = useState(data.contact?.name  ?? "");
  const [email,       setEmail]       = useState(data.contact?.email ?? "");
  const [prefix,      setPrefix]      = useState(defaultCountry);
  const [phoneNum,    setPhoneNum]    = useState("");
  const [emailError,  setEmailError]  = useState("");
  const [loading,     setLoading]     = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [prefixOpen,  setPrefixOpen]  = useState(false);

  const prefixRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prefixOpen) return;
    const handler = (e: MouseEvent) => {
      if (prefixRef.current && !prefixRef.current.contains(e.target as Node))
        setPrefixOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [prefixOpen]);

  const nameValid  = name.trim().length >= 2;
  const emailValid = EMAIL_RE.test(email);
  const phoneValid = phoneNum.replace(/\D/g, "").length >= 6;
  const canSubmit  = nameValid && emailValid && phoneValid && !loading;

  const currentPrefix = PHONE_CODES[prefix];
  const fullPhone     = `${currentPrefix.dialCode} ${phoneNum}`.trim();

  const handleEmailBlur = () => {
    if (email && !emailValid) setEmailError("Ingresá un email válido");
    else setEmailError("");
  };

  const handlePhoneInput = (val: string) =>
    setPhoneNum(val.replace(/[^\d\s\-]/g, ""));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setSubmitError("");

    const regResult = await registerOrVerifyClient(name, email, fullPhone);
    if (regResult.error) {
      setSubmitError(regResult.error);
      setLoading(false);
      return;
    }

    const extras: ClientExtras = {
      isNewUser:        regResult.isNewUser  ?? false,
      tempPassword:     regResult.tempPassword,
      confirmationLink: regResult.confirmationLink,
    };

    const submitResult = await submitWeeklyRequest(
      { ...data, contact: { name, email, phone: fullPhone } },
      regResult.userId!,
      extras
    );

    if (submitResult.error) {
      setSubmitError(submitResult.error);
      setLoading(false);
      return;
    }

    onNext(extras.isNewUser ? "pending" : "active");
  };

  // Summary values
  const comidas  = data.weeklyDetails?.comidasPorSemana  ?? 7;
  const personas = data.weeklyDetails?.racionesPorComida ?? 2;
  const dias     = (data.weeklyDetails?.frecuenciaCocina ?? [])
    .map((d) => DAY_NAMES[d])
    .join(" · ");
  const ciudad   = data.location?.city ?? "";
  const pais     = PHONE_CODES[data.location?.countryCode ?? ""]?.name ?? "";
  const fechaStr = data.date
    ? format(new Date(data.date), "d 'de' MMMM", { locale: es })
    : "";

  return (
    <div className="flex flex-col w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-serif text-3xl leading-tight text-zinc-900 mb-2">
        Casi listo.
      </h2>
      <p className="text-sm text-zinc-500 mb-6">
        Completá tus datos para enviar la solicitud.
      </p>

      {/* Resumen del pedido */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-8">
        <p className="text-sm font-medium text-zinc-800">
          {comidas} comidas · {personas} {personas === 1 ? "persona" : "personas"}
          {dias ? ` · ${dias}` : ""}
        </p>
        {(ciudad || pais) && (
          <p className="text-xs text-zinc-500 mt-1">
            {[ciudad, pais].filter(Boolean).join(", ")}
            {fechaStr ? ` · Inicio ${fechaStr}` : ""}
          </p>
        )}
      </div>

      {/* Nombre */}
      <div className="mb-5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2.5">
          Nombre completo
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          className="w-full h-14 px-4 rounded-xl border border-zinc-200 text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 hover:border-zinc-300 transition-all duration-200 bg-white"
        />
      </div>

      {/* Email */}
      <div className="mb-5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2.5">Email</p>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
          onBlur={handleEmailBlur}
          placeholder="tu@email.com"
          className={[
            "w-full h-14 px-4 rounded-xl border text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-all duration-200 bg-white",
            emailError
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-zinc-200 hover:border-zinc-300 focus:border-accent/50 focus:ring-accent/10",
          ].join(" ")}
        />
        {emailError && (
          <p className="text-xs text-red-500 mt-1.5">{emailError}</p>
        )}
      </div>

      {/* Teléfono */}
      <div className="mb-10">
        <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2.5">Teléfono</p>
        <div className="flex h-14 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10 transition-all duration-200">

          {/* Selector de prefijo */}
          <div ref={prefixRef} className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setPrefixOpen((o) => !o)}
              className="h-full px-3 flex items-center gap-1.5 text-sm text-zinc-700 hover:bg-zinc-50 rounded-l-xl transition-colors border-r border-zinc-200"
            >
              <span>{currentPrefix.flag}</span>
              <span className="font-medium tabular-nums">{currentPrefix.dialCode}</span>
              <span className="text-zinc-400"><ChevronIcon open={prefixOpen} /></span>
            </button>

            {prefixOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 min-w-[190px] bg-white rounded-xl border border-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.10)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto">
                {Object.entries(PHONE_CODES).map(([code, { flag, name: countryName, dialCode }]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => { setPrefix(code); setPrefixOpen(false); }}
                    className={[
                      "w-full px-3 py-2.5 flex items-center gap-2.5 text-left text-sm transition-colors border-b border-zinc-50 last:border-none",
                      code === prefix
                        ? "bg-accent/5 text-zinc-900 font-medium"
                        : "text-zinc-700 hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    <span>{flag}</span>
                    <span className="flex-1 truncate">{countryName}</span>
                    <span className="text-zinc-400 tabular-nums text-xs">{dialCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Número */}
          <input
            type="tel"
            value={phoneNum}
            onChange={(e) => handlePhoneInput(e.target.value)}
            placeholder="Número"
            className="flex-1 h-full px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none bg-transparent rounded-r-xl"
          />
        </div>
      </div>

      {/* Error de submit */}
      {submitError && (
        <p className="text-sm text-red-500 text-center mb-4">{submitError}</p>
      )}

      {/* Botón de envío */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner /><span>Enviando…</span></> : "Enviar solicitud"}
      </button>
    </div>
  );
}
