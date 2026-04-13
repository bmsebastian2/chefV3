export interface WizardData {
  serviceType?: string;
  location?: {
    name: string;
    lat: number;
    lng: number;
  };
  occasion?: string;
  guests?: number;
  date?: Date;
  time?: string;
  cuisine?: string;
  dietaryRestrictions?: string[];
  details?: string;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  nextStep: () => void;
}
