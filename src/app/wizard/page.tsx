"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X, UtensilsCrossed } from "lucide-react";
import { WizardData } from "@/components/wizard/types";
import { StepServiceType, StepLocation, StepOccasion, StepGuests, StepDateRange, StepMealSlots, StepCuisine, StepDetails, StepContact, StepOccasion1, StepGuestsStatic, StepMealTime, StepDateCalendar, StepBudgetTier, StepBudgetMultiple, StepDietarySimple, StepContact1 } from "@/components/wizard/Steps";
import { WeeklyMealsForm } from "@/components/wizard/WeeklyMealsForm";
import { submitServiceRequest } from "@/app/wizard/actions";
import { ClientExtras } from "@/components/wizard/types";
import { createClient } from "@/utils/supabase/clients";

const baseSteps = [
  { id: "serviceType", component: StepServiceType, title: "¿Qué tipo de servicio de chef necesitas?" },
];

const stepsService1 = [
  { id: "serviceType", component: StepServiceType,  title: "¿Qué tipo de servicio de chef necesitas?" },
  { id: "occasion",    component: StepOccasion1,    title: "¿Cuál es la ocasión?" },
  { id: "location",    component: StepLocation,     title: "¿Dónde será el evento?" },
  { id: "guests",      component: StepGuestsStatic, title: "¿Para cuántas personas?" },
  { id: "mealTime",    component: StepMealTime,     title: "¿A qué hora?" },
  { id: "cuisine",     component: StepCuisine,      title: "¿Qué te apetece?" },
  { id: "date",        component: StepDateCalendar, title: "¿Cuándo?" },
  { id: "budget",      component: StepBudgetTier,   title: "¿Cuál es tu presupuesto para esta experiencia?" },
  { id: "dietary",     component: StepDietarySimple, title: "¿Alguna restricción alimentaria?" },
  { id: "details",     component: StepDetails,      title: "Por último, describe tu evento" },
  { id: "contact",     component: StepContact1,     title: "¡Ya está!" },
];

const stepsService2 = [
  { id: "serviceType", component: StepServiceType,    title: "¿Qué tipo de servicio de chef necesitas?" },
  { id: "occasion",    component: StepOccasion,       title: "¿Cuál es la ocasión?" },
  { id: "location",    component: StepLocation,       title: "¿Dónde será el evento?" },
  { id: "dateRange",   component: StepDateRange,      title: "¿Cuándo necesitarás el servicio?" },
  { id: "mealSlots",   component: StepMealSlots,      title: "Quiero disfrutar del servicio los días" },
  { id: "guests",      component: StepGuests,         title: "Somos" },
  { id: "budget",      component: StepBudgetMultiple, title: "¿Cuál es tu presupuesto para esta experiencia?" },
  { id: "dietary",     component: StepDietarySimple,  title: "¿Alguna restricción alimentaria?" },
  { id: "details",     component: StepDetails,        title: "Describe tu evento" },
  { id: "contact",     component: StepContact,        title: "¡Ya está!" },
];

const getStepsForService = (serviceType?: string) => {
  if (serviceType === "1") return stepsService1;
  if (serviceType === "2") return stepsService2;
  return baseSteps;
};

export default function WizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>(() => {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    const name  = params.get("name");
    const email = params.get("email");
    const phone = params.get("phone");
    if (name || email || phone) {
      return {
        contact: {
          ...(name  ? { name }  : {}),
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          prefilled: true,
        },
      };
    }
    return {};
  });
  const [submitted, setSubmitted] = useState<false | "active" | "pending">(false);
  const [showWeeklyForm, setShowWeeklyForm] = useState(false);
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

  const stepsObj = getStepsForService(data.serviceType);

  const updateData = (updates: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...updates }));

  const nextStep = () => {
    if (currentStep < stepsObj.length - 1) setCurrentStep((p) => p + 1);
  };

  const prevStep = () => {
    if (showWeeklyForm) { setShowWeeklyForm(false); return; }
    if (currentStep > 0) setCurrentStep((p) => p - 1);
  };

  const handleFinalSubmit = async (userId: string, extras?: ClientExtras) => {
    setSubmitError(null);
    const result = await submitServiceRequest(data, userId, extras);
    if (result.error) { setSubmitError(result.error); return; }
    setSubmitted(extras?.isNewUser ? "pending" : "active");
  };

  const handleService3Selected  = () => setShowWeeklyForm(true);
  const handleServiceTypeSelected = () => setCurrentStep(1);
  const handleWeeklyFormSubmit   = (status: "active" | "pending") => setSubmitted(status);

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted === "active") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-3xl" />
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
            className="w-full h-13 bg-accent text-zinc-900 rounded-xl font-bold text-sm hover:bg-amber-400 transition-all duration-200 shadow-[0_8px_24px_rgba(224,159,62,0.25)] hover:shadow-[0_12px_32px_rgba(224,159,62,0.35)] hover:scale-[1.02] flex items-center justify-center py-4"
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
          <div className="w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-3xl" />
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
            className="w-full h-13 bg-accent text-zinc-900 rounded-xl font-bold text-sm hover:bg-amber-400 transition-all duration-200 shadow-[0_8px_24px_rgba(224,159,62,0.25)] hover:shadow-[0_12px_32px_rgba(224,159,62,0.35)] hover:scale-[1.02] flex items-center justify-center py-4"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const CurrentComponent = stepsObj[currentStep].component;
  const progressPercent  = showWeeklyForm ? 30 : ((currentStep + 1) / stepsObj.length) * 100;
  const titleText        = showWeeklyForm ? "Cuéntanos sobre tus comidas semanales" : stepsObj[currentStep].title;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="h-18 border-b border-zinc-100 flex items-center justify-between px-6 md:px-12 sticky top-0 bg-white/95 backdrop-blur-md z-20">

        {/* Back */}
        <div className="flex items-center w-1/3">
          {currentStep > 0 || showWeeklyForm ? (
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
          {!showWeeklyForm && (
            <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-500 tracking-wider">
              {currentStep + 1} / {stepsObj.length}
            </span>
          )}
          {showWeeklyForm && (
            <span className="hidden md:inline text-xs text-zinc-400 font-medium">
              Comidas Semanales
            </span>
          )}
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
        <div
          className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
          key={showWeeklyForm ? "weekly" : currentStep}
        >
          {/* Step indicator + title */}
          <div className="text-center mb-12">
            {!showWeeklyForm && (
              <div className="flex items-center justify-center gap-2.5 mb-5">
                <div className="h-px w-8 bg-zinc-200" />
                <span className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase select-none">
                  {String(currentStep + 1).padStart(2, "0")}
                </span>
                <div className="h-px w-8 bg-zinc-200" />
              </div>
            )}
            <h1 className="font-serif text-3xl md:text-[2.75rem] font-semibold text-zinc-900 leading-tight">
              {titleText}
            </h1>
          </div>

          {/* Step component */}
          <div className="w-full">
            {showWeeklyForm ? (
              <WeeklyMealsForm data={data} updateData={updateData} onSubmit={handleWeeklyFormSubmit} />
            ) : (
              <>
                <CurrentComponent
                  data={data}
                  updateData={updateData}
                  nextStep={nextStep}
                  onService3Selected={handleService3Selected}
                  onServiceTypeSelected={handleServiceTypeSelected}
                  onFinalSubmit={handleFinalSubmit}
                />
                {submitError && (
                  <p className="text-red-500 text-sm text-center mt-4">{submitError}</p>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
