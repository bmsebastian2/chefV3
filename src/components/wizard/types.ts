export interface MealSlot {
  fecha: string; // 'YYYY-MM-DD'
  desayuno: boolean;
  almuerzo: boolean;
  cena: boolean;
}

export interface WizardData {
  userId?: string;
  serviceType?: string;
  location?: {
    name: string;
    lat: number;
    lng: number;
  };
  occasion?: string;
  guestsAdults?: number;
  guestsTeens?: number;
  guestsKids?: number;
  date?: Date;
  time?: string;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  cuisine?: string;
  dietaryRestrictions?: string[];
  mealSlots?: MealSlot[];
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
  onService3Selected?: () => void;
  onServiceTypeSelected?: (serviceType: string) => void;
  onFinalSubmit?: (userId: string) => Promise<void>;
}
