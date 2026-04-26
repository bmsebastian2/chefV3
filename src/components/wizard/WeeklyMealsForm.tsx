"use client";

import { WizardData } from "./types";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface WeeklyMealsFormProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onSubmit: () => void;
}

export function WeeklyMealsForm({ data, updateData, onSubmit }: WeeklyMealsFormProps) {
  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full">
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
        <h2 className="font-semibold text-accent mb-2">Formulario de Comidas Semanales</h2>
        <p className="text-zinc-600 text-sm">
          Aquí irá el formulario específico para contratos de comidas semanales recurrentes.
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/" className="flex-1">
          <Button variant="outline" size="lg" className="w-full h-14">
            Cancelar
          </Button>
        </Link>
        <Button onClick={onSubmit} size="lg" className="flex-1 h-14 bg-accent text-zinc-900 font-bold text-lg hover:bg-accent/90">
          Enviar Solicitud
        </Button>
      </div>
    </div>
  );
}
