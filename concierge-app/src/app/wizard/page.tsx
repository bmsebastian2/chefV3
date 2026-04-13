"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { WizardData } from "@/components/wizard/types";
import { StepServiceType, StepLocation, StepOccasion, StepGuests, StepDate, StepCuisine, StepDietary, StepDetails, StepContact } from "@/components/wizard/Steps";

const stepsObj = [
  { id: "serviceType", component: StepServiceType, title: "¿Qué tipo de servicio de chef necesitas?" },
  { id: "occasion", component: StepOccasion, title: "¿Cuál es la ocasión?" },
  { id: "location", component: StepLocation, title: "¿Dónde será el evento?" },
  { id: "guests", component: StepGuests, title: "¿Para cuántas personas?" },
  { id: "date", component: StepDate, title: "¿Cuándo y a qué hora?" },
  { id: "cuisine", component: StepCuisine, title: "¿Qué te apetece?" },
  { id: "dietary", component: StepDietary, title: "¿Restricciones alimentarias?" },
  { id: "details", component: StepDetails, title: "Describe tu evento" },
  { id: "contact", component: StepContact, title: "¡Ya está!" },
];

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>({});
  const [submitted, setSubmitted] = useState(false);

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < stepsObj.length - 1) {
      setCurrentStep((p) => p + 1);
    } else {
      console.log("Enviando JSON a backend/Supabase:", data);
      setSubmitted(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((p) => p - 1);
    }
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
            En menos de 30 minutos, nuestros chefs diseñarán propuestas de menú específicas para tu evento en <strong>{data.location?.name}</strong>. Revisa pronto tu correo asociado.
          </p>
          <Link href="/" className="w-full h-14 bg-zinc-900 text-white rounded-md font-medium hover:bg-zinc-800 transition-colors shadow-sm flex items-center justify-center">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const CurrentComponent = stepsObj[currentStep].component;
  const progressPercent = ((currentStep + 1) / stepsObj.length) * 100;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <header className="h-20 border-b border-zinc-100 flex items-center justify-between px-6 md:px-12 sticky top-0 bg-white/90 backdrop-blur-md z-20">
        <div className="flex items-center w-1/3">
          {currentStep > 0 ? (
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
            Paso {currentStep + 1} de {stepsObj.length}
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
        <div className="w-full animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out" key={currentStep}>
          <h1 className="font-serif text-3xl md:text-5xl font-semibold text-zinc-900 mb-12 text-center leading-tight">
            {stepsObj[currentStep].title}
          </h1>
          <div className="w-full">
            <CurrentComponent data={data} updateData={updateData} nextStep={nextStep} />
          </div>
        </div>
      </main>
    </div>
  );
}
