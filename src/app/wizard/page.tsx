"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X, UtensilsCrossed } from "lucide-react";
import { WizardData } from "@/components/wizard/types";
import { getStepsForService } from "@/components/wizard/flows";
import { WizardSummaryBar } from "@/components/wizard/WizardSummaryBar";
import { submitServiceRequest, submitWeeklyRequest } from "@/app/wizard/actions";
import { ClientExtras } from "@/components/wizard/types";
import { createClient } from "@/utils/supabase/clients";

// Estado inicial del wizard a partir de los query params.
// Incluye el contacto (comportamiento previo) y el pre-llenado que envía
// el asistente de búsqueda de la home (servicio, ocasión, personas, cocina,
// restricciones). Cuando el tipo de servicio ya viene elegido, se arranca
// saltando ese primer paso.
function parseInitialState(
  params: { get(key: string): string | null }
): { data: WizardData; step: number } {
  const data: WizardData = {};

  const name  = params.get("name");
  const email = params.get("email");
  const phone = params.get("phone");
  if (name || email || phone) {
    data.contact = {
      ...(name  ? { name }  : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      prefilled: true,
    };
  }

  // Pre-llenado del asistente de la home
  const service  = params.get("service");   // "1" | "2" | "3"
  const occasion = params.get("occasion");  // enum de ocasión
  const guests   = params.get("guests");    // "2" | "3-6" | "7-12" | "13+"
  const cuisine  = params.get("cuisine");   // enum de cocina
  const dietary  = params.get("dietary");   // CSV de restricciones (valores del wizard)

  if (service)  data.serviceType = service;
  if (occasion) data.occasion    = occasion;
  // Personas: el asistente envía un rango, pero el flujo unificado trabaja con
  // número exacto (guestsAdults). Se siembra con el representante histórico de
  // cada rango (los mismos valores que persistía el flujo viejo), editable en
  // el wizard.
  const GUESTS_RANGE_SEED: Record<string, number> = { "2": 2, "3-6": 4, "7-12": 9, "13+": 13 };
  if (guests && GUESTS_RANGE_SEED[guests]) data.guestsAdults = GUESTS_RANGE_SEED[guests];
  if (cuisine)  data.cuisine     = cuisine;

  // Origen para medición: solo aceptamos el valor conocido del piloto para que
  // la columna quede limpia (no free-text arbitrario desde la URL).
  if (params.get("source") === "assistant") data.source = "assistant";
  // "none" = el asistente ya preguntó y la respuesta fue "sin restricciones";
  // se siembra como ["Ninguna"] (mismo valor que escribe StepDietarySimple)
  // para que el paso se salte igual que cuando hay restricciones.
  if (dietary === "none") {
    data.dietaryRestrictions = ["Ninguna"];
  } else if (dietary) {
    const list = dietary.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length) data.dietaryRestrictions = ["Sí", ...list];
  }

  // Comidas semanales: sembrar el step de volumen con lo elegido en el asistente
  // (editable en el stepper). Se clampan a los rangos del wizard.
  if (service === "3") {
    const wd: NonNullable<WizardData["weeklyDetails"]> = {};
    const meals = params.get("meals"); // "4" | "5" | "7"
    if (meals) {
      const n = parseInt(meals, 10);
      if (Number.isFinite(n)) wd.comidasPorSemana = Math.min(14, Math.max(4, n));
    }
    if (guests) {
      const raciones: Record<string, number> = { "2": 2, "3-6": 6, "7-12": 10, "13+": 10 };
      if (raciones[guests]) wd.racionesPorComida = raciones[guests];
      // Rango crudo del asistente para confirmar el número exacto en el wizard.
      if (data.source === "assistant" && raciones[guests]) data.assistantGuests = guests;
    }
    if (Object.keys(wd).length) data.weeklyDetails = wd;
  }

  // Con el tipo ya elegido (venga del asistente o de un link directo), se
  // arranca saltando el primer paso — los tres servicios viven en el motor.
  const step = service === "1" || service === "2" || service === "3" ? 1 : 0;

  return { data, step };
}

function WizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initial] = useState(() => parseInitialState(searchParams));
  const [currentStep, setCurrentStep] = useState(initial.step);
  const [data, setData] = useState<WizardData>(initial.data);

  // Pasos a saltar porque el asistente de la home ya los respondió.
  // Se calcula del pre-llenado inicial (no del estado vivo) para que el flujo
  // sea estable aunque el usuario edite valores en el resumen.
  const skipStepIds = useMemo(() => {
    const ids = new Set<string>();
    if (initial.data.occasion)                       ids.add("occasion");
    // Las personas del asistente solo saltean el paso en el servicio único
    // (el servicio múltiple desglosa adultos/adolescentes/niños).
    if (initial.data.guestsAdults !== undefined && data.serviceType === "1") ids.add("guests");
    if (initial.data.cuisine)                        ids.add("cuisine");
    if (initial.data.dietaryRestrictions?.length)    ids.add("dietary");
    return ids;
  }, [initial, data.serviceType]);
  const [submitted, setSubmitted] = useState<false | "active" | "pending">(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (submitted !== "pending") return;
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
        router.push("/client-dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [submitted, router]);

  const stepsObj = getStepsForService(data.serviceType).filter(
    (s) => !skipStepIds.has(s.id)
  );

  const updateData = (updates: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...updates }));

  const nextStep = () => {
    if (currentStep < stepsObj.length - 1) setCurrentStep((p) => p + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((p) => p - 1);
  };

  const handleFinalSubmit = async (userId: string, extras?: ClientExtras) => {
    setSubmitError(null);
    // El semanal tiene su propio submit (weekly_meal_details); los servicios
    // de evento comparten submitServiceRequest. Mismo contacto para los tres.
    const submit = data.serviceType === "3" ? submitWeeklyRequest : submitServiceRequest;
    const result = await submit(data, userId, extras);
    if (result.error) { setSubmitError(result.error); return; }
    setSubmitted(extras?.isNewUser ? "pending" : "active");
  };

  const handleServiceTypeSelected = () => setCurrentStep(1);

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted === "active") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full bg-green-500/5 blur-3xl" />
        </div>

        <div className="relative max-w-md w-full bg-zinc-900 rounded-2xl p-10 text-center border border-zinc-800 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
          {/* Animated check */}
          <div className="w-24 h-24 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
            <svg
              className="w-12 h-12 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-6 bg-zinc-700" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-accent uppercase">GetChef</span>
            <div className="h-px w-6 bg-zinc-700" />
          </div>

          <h2 className="font-serif text-4xl font-semibold text-white mb-4 leading-tight">
            ¡Solicitud recibida!
          </h2>
          <p className="font-sans text-zinc-400 mb-10 leading-relaxed text-sm">
            En menos de 30 minutos, nuestros chefs diseñarán propuestas de menú exclusivas para tu evento en{" "}
            <span className="text-white font-medium">{data.location?.name || "tu ubicación"}</span>.
            Revisa pronto tu correo.
          </p>
          <Link
            href="/client-dashboard"
            className="w-full h-13 bg-accent text-zinc-900 rounded-xl font-bold text-sm hover:bg-green-500 transition-all duration-200 shadow-[0_8px_24px_rgba(34,197,94,0.25)] hover:shadow-[0_12px_32px_rgba(34,197,94,0.35)] hover:scale-[1.02] flex items-center justify-center py-4"
          >
            Ver mi solicitud
          </Link>
          <Link href="/" className="block mt-4 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // ── Pending screen ──────────────────────────────────────────────────────────
  if (submitted === "pending") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full bg-green-500/5 blur-3xl" />
        </div>

        <div className="relative max-w-md w-full bg-zinc-900 rounded-2xl p-10 text-center border border-zinc-800 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
          {/* Email icon */}
          <div className="w-24 h-24 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
            <svg
              className="w-11 h-11 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-6 bg-zinc-700" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-accent uppercase">GetChef</span>
            <div className="h-px w-6 bg-zinc-700" />
          </div>

          <h2 className="font-serif text-4xl font-semibold text-white mb-4 leading-tight">
            ¡Revisa tu email!
          </h2>
          <p className="font-sans text-zinc-400 mb-3 leading-relaxed text-sm">
            Te enviamos un enlace de confirmación a{" "}
            <span className="text-white font-medium">{data.contact?.email}</span>.
          </p>
          <p className="font-sans text-zinc-600 text-xs mb-10 leading-relaxed">
            Al confirmar tu email, tu solicitud se activará y empezarás a recibir
            propuestas en menos de 30 minutos.
          </p>
          <Link
            href="/"
            className="w-full h-13 bg-accent text-zinc-900 rounded-xl font-bold text-sm hover:bg-green-500 transition-all duration-200 shadow-[0_8px_24px_rgba(34,197,94,0.25)] hover:shadow-[0_12px_32px_rgba(34,197,94,0.35)] hover:scale-[1.02] flex items-center justify-center py-4"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const CurrentComponent = stepsObj[currentStep].component;
  const progressPercent  = ((currentStep + 1) / stepsObj.length) * 100;
  const titleText        = stepsObj[currentStep].title;

  // Resumen progresivo: persiste hasta el paso final en los tres servicios.
  const showSummary = !!data.serviceType;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="h-18 border-b border-zinc-100 flex items-center justify-between px-6 md:px-12 sticky top-0 bg-white/95 backdrop-blur-md z-20">

        {/* Back */}
        <div className="flex items-center w-1/3">
          {currentStep > 0 ? (
            <button
              onClick={prevStep}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-500 hover:text-zinc-900 cursor-pointer border-none bg-transparent"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            </button>
          ) : (
            <Link
              href="/"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-500 hover:text-zinc-900"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            </Link>
          )}
        </div>

        {/* Logo */}
        <div className="w-1/3 flex justify-center">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-zinc-900 group">
            <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <UtensilsCrossed className="w-3.5 h-3.5 text-accent" />
            </div>
            <span>GetChef</span>
          </Link>
        </div>

        {/* Step counter + close */}
        <div className="w-1/3 flex justify-end items-center gap-3">
          <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-500 tracking-wider">
            {currentStep + 1} / {stepsObj.length}
          </span>
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-700"
            title="Cerrar"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
      </header>

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      <div className="w-full h-1.5 bg-zinc-100">
        <div
          className="h-full bg-accent rounded-r-full transition-all duration-700 ease-in-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col pt-16 md:pt-24 px-6 pb-16">
        <div className="w-full max-w-3xl mx-auto">

          {/* Resumen progresivo dentro del recuadro (Servicios 1, 2 y 3). Persiste
              hasta el paso final para que el usuario vea su pedido completo.
              Va fuera del bloque animado para persistir entre pasos. */}
          {showSummary && <WizardSummaryBar data={data} />}

          <div
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
            key={currentStep}
          >
            {/* Title */}
            <div className="text-center mb-12">
              <h1 className="font-serif text-4xl md:text-5xl text-zinc-900 leading-tight">
                {titleText}
              </h1>
            </div>

          {/* Step component */}
          <div className="w-full">
            <CurrentComponent
              data={data}
              updateData={updateData}
              nextStep={nextStep}
              onServiceTypeSelected={handleServiceTypeSelected}
              onFinalSubmit={handleFinalSubmit}
            />
            {submitError && (
              <p className="text-red-500 text-sm text-center mt-4">{submitError}</p>
            )}
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function WizardPage() {
  return (
    <Suspense fallback={null}>
      <WizardContent />
    </Suspense>
  );
}
