"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { WizardData } from "@/components/wizard/types";
import { StepServiceType, StepLocation, StepOccasion, StepGuests, StepDateRange, StepMealSlots, StepCuisine, StepDietary, StepDetails, StepContact, StepOccasion1, StepGuestsStatic, StepMealTime, StepDateCalendar, StepBudgetTier, StepDietarySimple, StepContact1 } from "@/components/wizard/Steps";
import { WeeklyMealsForm } from "@/components/wizard/WeeklyMealsForm";
import { submitServiceRequest } from "@/app/wizard/actions";

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
  { id: "dietary",     component: StepDietarySimple,title: "¿Alguna restricción alimentaria?" },
  { id: "details",     component: StepDetails,      title: "Por último, describe tu evento a nuestros chefs" },
  { id: "contact",     component: StepContact1,     title: "¡Ya está!" },
];

const stepsService2 = [
  { id: "serviceType", component: StepServiceType, title: "¿Qué tipo de servicio de chef necesitas?" },
  { id: "occasion", component: StepOccasion, title: "¿Cuál es la ocasión?" },
  { id: "location", component: StepLocation, title: "¿Dónde será el evento?" },
  { id: "dateRange", component: StepDateRange, title: "¿Cuándo necesitarás el servicio?" },
  { id: "mealSlots", component: StepMealSlots, title: "Quiero disfrutar del servicio los días" },
  { id: "guests", component: StepGuests, title: "Somos" },
  { id: "cuisine", component: StepCuisine, title: "¿Qué te apetece?" },
  { id: "dietary", component: StepDietary, title: "¿Restricciones alimentarias?" },
  { id: "details", component: StepDetails, title: "Describe tu evento" },
  { id: "contact", component: StepContact, title: "¡Ya está!" },
];

const getStepsForService = (serviceType?: string) => {
  if (serviceType === "1") return stepsService1;
  if (serviceType === "2") return stepsService2;
  return baseSteps;
};

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>({});
  const [submitted, setSubmitted] = useState(false);
  const [showWeeklyForm, setShowWeeklyForm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stepsObj = getStepsForService(data.serviceType);

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < stepsObj.length - 1) {
      setCurrentStep((p) => p + 1);
    }
  };

  const prevStep = () => {
    if (showWeeklyForm) {
      setShowWeeklyForm(false);
      return;
    }
    if (currentStep > 0) {
      setCurrentStep((p) => p - 1);
    }
  };

  const handleFinalSubmit = async (userId: string) => {
    setSubmitError(null);
    const result = await submitServiceRequest(data, userId);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    setSubmitted(true);
  };

  const handleService3Selected = () => {
    setShowWeeklyForm(true);
  };

  const handleServiceTypeSelected = () => {
    setCurrentStep(1);
  };

  const handleWeeklyFormSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] p-10 text-center border border-zinc-100">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-serif text-4xl font-semibold text-zinc-900 mb-4">¡Solicitud recibida!</h2>
          <p className="font-sans text-zinc-600 mb-10 leading-relaxed">
            En menos de 30 minutos, nuestros chefs diseñarán propuestas de menú específicas para tu evento en <strong>{data.location?.name || "tu ubicación"}</strong>. Revisa pronto tu correo asociado.
          </p>
          <Link href="/" className="w-full h-14 bg-zinc-900 text-white rounded-md font-medium hover:bg-zinc-800 transition-colors shadow-sm flex items-center justify-center">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const CurrentComponent = stepsObj[currentStep].component;
  const progressPercent = showWeeklyForm ? 30 : ((currentStep + 1) / stepsObj.length) * 100;
  const titleText = showWeeklyForm ? "Cuéntanos sobre tus comidas semanales" : stepsObj[currentStep].title;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <header className="h-20 border-b border-zinc-100 flex items-center justify-between px-6 md:px-12 sticky top-0 bg-white/90 backdrop-blur-md z-20">
        <div className="flex items-center w-1/3">
          {currentStep > 0 || showWeeklyForm ? (
            <button onClick={prevStep} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-900 cursor-pointer border-none bg-transparent">
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
          ) : (
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-900">
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Link>
          )}
        </div>
        <div className="w-1/3 text-center">
          <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-zinc-900">
            Reserva Servicio
          </Link>
        </div>
        <div className="w-1/3 flex justify-end items-center gap-4">
          <span className="hidden md:inline text-xs text-zinc-400 font-bold tracking-widest uppercase">
            {showWeeklyForm ? "Formulario Comidas Semanales" : `Paso ${currentStep + 1} de ${stepsObj.length}`}
          </span>
          <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-900" title="Cerrar y volver al inicio">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </Link>
        </div>
      </header>

      <div className="w-full h-1 bg-zinc-100 overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-700 ease-in-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <main className="flex-1 flex flex-col pt-12 md:pt-20 px-6">
        <div className="w-full animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out" key={showWeeklyForm ? "weekly" : currentStep}>
          <h1 className="font-serif text-3xl md:text-5xl font-semibold text-zinc-900 mb-12 text-center leading-tight">
            {titleText}
          </h1>
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
