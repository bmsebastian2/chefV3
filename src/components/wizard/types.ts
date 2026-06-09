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
    city: string;
    lat: number;
    lng: number;
    countryCode?: string;
  };
  occasion?: string;
  // Service 1 — static guest range
  guestsRange?: string;       // '2' | '3-6' | '7-12' | '13+'
  // Service 2 — individual counters
  guestsAdults?: number;
  guestsTeens?: number;
  guestsKids?: number;
  date?: Date;
  // Service 1 — meal time selection
  mealTime?: 'lunch' | 'dinner';
  // Service 1 — budget tier
  budgetTier?: 'casual' | 'gourmet' | 'exclusive';
  time?: string;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  cuisine?: string;
  dietaryRestrictions?: string[];
  dietaryOtras?: string;
  mealSlots?: MealSlot[];
  details?: string;
  weeklyDetails?: {
    codigoPostal?: string;
    comidasPorSemana?: number;
    racionesPorComida?: number;
    frecuenciaCocina?: number[];
    preferenciaChef?: string;
    preferenciasCulinarias?: string;
  };
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    comoNosConociste?: string;
    prefilled?: boolean;
  };
}

export interface ClientExtras {
  isNewUser: boolean;
  tempPassword?: string;
  confirmationLink?: string;
}

export interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  nextStep: () => void;
  onService3Selected?: () => void;
  onServiceTypeSelected?: (serviceType: string) => void;
  onFinalSubmit?: (userId: string, extras?: ClientExtras) => Promise<void>;
}
