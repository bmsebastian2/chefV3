"use client";

import { useState } from "react";
import { WizardData } from "./types";
import { WeeklyStep1Location } from "./WeeklyStep1Location";
import { WeeklyStep2Confirmation } from "./WeeklyStep2Confirmation";
import { WeeklyStep3Volume } from "./WeeklyStep3Volume";
import { WeeklyStep4Preferences } from "./WeeklyStep4Preferences";
import { WeeklyStep5Schedule } from "./WeeklyStep5Schedule";
import { WeeklyStep6Contact } from "./WeeklyStep6Contact";

interface WeeklyMealsFormProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onSubmit: (status: "active" | "pending") => void;
}

export function WeeklyMealsForm(props: WeeklyMealsFormProps) {
  const { data, updateData, onSubmit } = props;
  const [step, setStep] = useState(0);

  if (step === 0) {
    return (
      <WeeklyStep1Location
        data={data}
        updateData={updateData}
        onNext={() => setStep(1)}
      />
    );
  }

  if (step === 1) {
    return <WeeklyStep2Confirmation onNext={() => setStep(2)} />;
  }

  if (step === 2) {
    return <WeeklyStep3Volume data={data} updateData={updateData} onNext={() => setStep(3)} />;
  }

  if (step === 3) {
    return <WeeklyStep4Preferences data={data} updateData={updateData} onNext={() => setStep(4)} />;
  }

  if (step === 4) {
    return <WeeklyStep5Schedule data={data} updateData={updateData} onNext={() => setStep(5)} />;
  }

  if (step === 5) {
    return <WeeklyStep6Contact data={data} onNext={(status) => onSubmit(status)} />;
  }

  return null;
}
