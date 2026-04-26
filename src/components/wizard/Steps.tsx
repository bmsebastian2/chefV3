"use client";

import { useState, useEffect } from "react";
import { StepProps, MealSlot } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerOrVerifyClient } from "@/app/wizard/actions";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange, RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "./daterange.css";

export function StepServiceType({ data, updateData, nextStep, onService3Selected, onServiceTypeSelected }: StepProps) {
  const options = [
    { id: 1, title: "Experiencia Culinaria Única", desc: "Un chef exclusivo para una comida o cena especial de un día." },
    { id: 2, title: "Varios Servicios", desc: "Un chef disponible para múltiples comidas durante unas vacaciones o evento continuo." },
    { id: 3, title: "Comidas Semanales", desc: "Un chef que prepara tus comidas cada semana." }
  ];

  const handleSelectService = (id: number) => {
    updateData({ serviceType: id.toString() });
    
    if (id === 3 && onService3Selected) {
      onService3Selected();
    } else if (onServiceTypeSelected) {
      onServiceTypeSelected(id.toString());
    } else {
      nextStep();
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
      <p className="text-zinc-500 mb-2 text-center font-sans">
        Define tu evento para ver chefs, menús y precios. ¡Te llevará <strong className="text-accent">menos de 2 minutos</strong>!
      </p>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => handleSelectService(opt.id)}
          className={`flex flex-col items-start p-6 rounded-md border text-left transition-all ${data.serviceType === opt.id.toString() ? 'border-accent bg-accent/5' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}
        >
          <span className={`font-semibold text-lg mb-1 ${data.serviceType === opt.id.toString() ? 'text-accent' : 'text-zinc-900'}`}>{opt.title}</span>
          <span className="text-sm text-zinc-500 font-sans">{opt.desc}</span>
        </button>
      ))}
    </div>
  );
}
export function StepOccasion({ data, updateData, nextStep }: StepProps) {
  let options: string[] = [];

  if (data.serviceType === "1") {
    options = ["Cumpleaños", "Reunión familiar", "Despedida de soltero/a", "Reunión con amigos", "Cena romántica", "Evento corporativo", "Aventura gastronómica", "Otra"];
  } else if (data.serviceType === "2") {
    options = ["Reunión familiar", "Reunión con amigos", "Cena romántica", "Evento corporativo", "Otra"];
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto w-full">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => { updateData({ occasion: opt }); nextStep(); }}
          className={`h-16 rounded-md border text-base font-medium transition-all ${data.occasion === opt ? 'border-accent bg-accent/5 text-accent scale-[0.98]' : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function StepLocation({ data, updateData, nextStep }: StepProps) {
  const [query, setQuery] = useState(data.location?.name || "");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number, lon: number } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      }, () => console.log("Geolocalización denegada"));
    }
  }, []);

  useEffect(() => {
    if (!query || query.length < 3 || query === data.location?.name) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(query)}&f=json&maxLocations=5`;
        if (userCoords) {
          url += `&location=${userCoords.lon},${userCoords.lat}&distance=50000`;
        }
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error("Network Error");
        const json = await res.json();
        setResults(json.candidates || []);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          // El API devolvió un timeout o límite. Vaciamos en modo silencioso.
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, userCoords, data.location?.name]);

  const selectLocation = (name: string, state: string, country: string, lat: number, lng: number) => {
    const fullName = [name, state, country].filter(Boolean).join(", ");
    setQuery(fullName);
    updateData({
      location: {
        name: fullName,
        lat,
        lng
      }
    });
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && data.location?.name) {
      e.preventDefault();
      nextStep();
    }
  };

  return (
    <div className="flex flex-col gap-6 items-center w-full max-w-md mx-auto">
      <div className="relative w-full flex items-center">
        <div className="absolute left-4 text-zinc-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
        </div>
        <Input
          autoFocus
          placeholder="Busca tu ciudad..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            updateData({ location: undefined });
          }}
          onKeyDown={handleKeyDown}
          className="h-14 text-lg w-full shadow-sm pl-12 pr-12"
        />
        {loading && <div className="absolute right-4 w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>}

        {results.length > 0 && (
          <div className="absolute top-16 left-0 w-full bg-white border border-zinc-200 shadow-xl rounded-md z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {results.map((r, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectLocation(r.address, "", "", r.location.y, r.location.x)}
                className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-zinc-100 last:border-none focus:outline-none focus:bg-zinc-50 transition-colors"
              >
                <div className="font-medium text-zinc-900">{r.address.split(",")[0]}</div>
                <div className="text-xs text-zinc-500">
                  {r.address.split(",").slice(1).join(",").trim()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <Button
        onClick={nextStep}
        disabled={!data.location?.name}
        size="lg"
        className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md shadow-sm transition-all"
      >
        Continuar
      </Button>
    </div>
  );
}


interface CounterRowProps {
  label: string; subtitle: string; value: number; min?: number;
  onDecrement: () => void; onIncrement: () => void;
}
function CounterRow({ label, subtitle, value, min = 0, onDecrement, onIncrement }: CounterRowProps) {
  return (
    <div className="flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-xl">
      <div>
        <p className="font-semibold text-zinc-900 text-lg">{label}</p>
        <p className="text-sm text-accent">{subtitle}</p>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onDecrement}
          disabled={value <= min}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-300 text-zinc-700 text-xl font-light hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >−</button>
        <span className="w-6 text-center text-lg font-semibold text-zinc-900">{value}</span>
        <button
          type="button"
          onClick={onIncrement}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-300 text-zinc-700 text-xl font-light hover:bg-zinc-100 transition-colors"
        >+</button>
      </div>
    </div>
  );
}

export function StepGuests({ data, updateData, nextStep }: StepProps) {
  const [adults, setAdults] = useState(data.guestsAdults ?? 1);
  const [teens,  setTeens]  = useState(data.guestsTeens  ?? 0);
  const [kids,   setKids]   = useState(data.guestsKids   ?? 0);

  const handleContinue = () => {
    updateData({ guestsAdults: adults, guestsTeens: teens, guestsKids: kids });
    nextStep();
  };

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
      <CounterRow
        label="Adultos" subtitle="Mayores de 16 años"
        value={adults} min={1}
        onDecrement={() => setAdults(v => Math.max(1, v - 1))}
        onIncrement={() => setAdults(v => v + 1)}
      />
      <CounterRow
        label="Adolescentes" subtitle="12 - 15 años"
        value={teens}
        onDecrement={() => setTeens(v => Math.max(0, v - 1))}
        onIncrement={() => setTeens(v => v + 1)}
      />
      <CounterRow
        label="Niños" subtitle="2 - 11 años"
        value={kids}
        onDecrement={() => setKids(v => Math.max(0, v - 1))}
        onIncrement={() => setKids(v => v + 1)}
      />
      <Button
        onClick={handleContinue}
        size="lg"
        className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md mt-2 shadow-sm transition-all"
      >
        Continuar
      </Button>
    </div>
  );
}

export function StepDate({ data, updateData, nextStep }: StepProps) {
  const getMinTime = (): string | undefined => {
    if (!data.date) return undefined;
    const today = new Date();
    const selected = new Date(data.date);
    const isToday =
      selected.getFullYear() === today.getFullYear() &&
      selected.getMonth() === today.getMonth() &&
      selected.getDate() === today.getDate();
    if (!isToday) return undefined;
    const min = new Date(today.getTime() + 60 * 60 * 1000);
    return `${String(min.getHours()).padStart(2, '0')}:${String(min.getMinutes()).padStart(2, '0')}`;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const minTime = getMinTime();
    // Lexicographic comparison works correctly for HH:MM strings
    if (minTime && value < minTime) return;
    updateData({ time: value });
  };

  return (
    <div className="flex flex-col gap-6 items-center max-w-md mx-auto w-full">
      <Popover>
        <PopoverTrigger className={`inline-flex items-center w-full h-14 justify-start rounded-md border text-left font-normal border-zinc-200 px-4 text-sm hover:bg-zinc-50 transition-colors ${!data.date && "text-muted-foreground"}`}>
          <CalendarIcon className="mr-3 h-5 w-5 text-zinc-400" />
          {data.date ? format(data.date, "PPP", { locale: es }) : <span className="text-base">Elige una fecha</span>}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={data.date}
            onSelect={(date) => updateData({ date })}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </PopoverContent>
      </Popover>

      <Input
        type="time"
        value={data.time || ""}
        onChange={handleTimeChange}
        min={getMinTime()}
        className="h-14 text-base w-full border-zinc-200 font-medium"
      />

      <Button disabled={!data.date || !data.time} onClick={nextStep} size="lg" className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md mt-4 shadow-md transition-all">
        Continuar
      </Button>
    </div>
  );
}

export function StepCuisine({ data, updateData, nextStep }: StepProps) {
  const options = ["Mediterránea", "Asiática", "Fusión", "Italiana", "Mexicana", "Sorpréndeme"];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto w-full">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => { updateData({ cuisine: opt }); nextStep(); }}
          className={`h-16 rounded-md border text-base font-medium transition-all ${data.cuisine === opt ? 'border-accent bg-accent/5 scale-[0.98]' : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function StepDietary({ data, updateData, nextStep }: StepProps) {
  const options = ["Ninguna", "Vegetariana", "Vegana", "Sin Gluten", "Sin Lácteos", "Otras (Conversar con Chef)"];

  const toggleRestriction = (opt: string) => {
    const current = data.dietaryRestrictions || [];
    if (opt === "Ninguna") {
      updateData({ dietaryRestrictions: ["Ninguna"] });
      return;
    }
    const safeCurrent = current.filter(x => x !== "Ninguna");
    const newArr = safeCurrent.includes(opt) ? safeCurrent.filter(x => x !== opt) : [...safeCurrent, opt];
    updateData({ dietaryRestrictions: newArr });
  };

  return (
    <div className="flex flex-col gap-8 max-w-xl mx-auto w-full">
      <div className="grid grid-cols-2 gap-4">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggleRestriction(opt)}
            className={`min-h-[56px] px-3 py-2 rounded-md border text-sm transition-all ${(data.dietaryRestrictions || []).includes(opt) ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'}`}
          >
            {opt}
          </button>
        ))}
      </div>
      <Button disabled={!(data.dietaryRestrictions || []).length} onClick={nextStep} size="lg" className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md shadow-sm">
        Confirmar
      </Button>
    </div>
  );
}

export function StepDetails({ data, updateData, nextStep }: StepProps) {
  return (
    <div className="flex flex-col gap-6 items-center max-w-md mx-auto w-full">
      <textarea
        placeholder="Opcional: Comparte detalles sobre la ocasión, especificaciones de tu cocina o evento que el Chef deba saber..."
        className="w-full min-h-[160px] p-4 text-base border border-zinc-200 rounded-md outline-none focus:ring-1 focus:ring-zinc-900 resize-none font-sans shadow-sm"
        value={data.details || ""}
        onChange={(e) => updateData({ details: e.target.value })}
      />
      <Button onClick={nextStep} size="lg" className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md mt-2 shadow-sm">
        Revisar mi Solicitud
      </Button>
    </div>
  );
}

export function StepContact({ data, updateData, onFinalSubmit }: StepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid = !!(data.contact?.name && data.contact?.email && data.contact?.phone);

  const handleSubmit = async () => {
    if (!data.contact?.name || !data.contact?.email || !data.contact?.phone) return;

    setLoading(true);
    setError("");

    const result = await registerOrVerifyClient(
      data.contact.name,
      data.contact.email,
      data.contact.phone
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.userId && onFinalSubmit) {
      await onFinalSubmit(result.userId);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-5 items-center max-w-md mx-auto w-full">
      <p className="text-zinc-600 mb-2 text-center font-sans">
        Sólo un paso más. Añade tus datos y recibirás menús personalizados de nuestra red élite en menos de 30 minutos.
      </p>
      <Input
        placeholder="Nombre completo"
        className="h-14 font-medium text-base border-zinc-200"
        value={data.contact?.name || ""}
        onChange={(e) => updateData({ contact: { ...data.contact, name: e.target.value } })}
      />
      <Input
        placeholder="Correo electrónico"
        type="email"
        className="h-14 font-medium text-base border-zinc-200"
        value={data.contact?.email || ""}
        onChange={(e) => updateData({ contact: { ...data.contact, email: e.target.value } })}
      />
      <Input
        placeholder="Teléfono (ej: +34...)"
        type="tel"
        className="h-14 font-medium text-base border-zinc-200"
        value={data.contact?.phone || ""}
        onChange={(e) => updateData({ contact: { ...data.contact, phone: e.target.value } })}
      />
      {error && (
        <p className="text-red-500 text-sm text-center w-full">{error}</p>
      )}
      <Button
        disabled={!isValid || loading}
        onClick={handleSubmit}
        size="lg"
        className="w-full h-14 bg-accent text-zinc-900 font-bold text-lg rounded-md mt-4 hover:bg-accent/90 shadow-[0_8px_20px_rgb(224,159,62,0.2)] transition-all disabled:opacity-50"
      >
        {loading ? "Verificando..." : "Ver Menús y Chefs Recomendados"}
      </Button>
      <p className="text-xs text-zinc-400 mt-2 text-center max-w-xs">
        Al continuar, aceptas nuestros Términos Legales y Política de Privacidad de Reserva Epicúrea.
      </p>
    </div>
  );
}

export function StepDateRange({ data, updateData, nextStep }: StepProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const [state, setState] = useState({
    startDate: data.dateRangeStart || tomorrow,
    endDate: data.dateRangeEnd || new Date(tomorrow.getTime() + 7 * 24 * 60 * 60 * 1000),
    key: "selection",
  });

  const handleSelect = (ranges: RangeKeyDict) => {
    const sel = ranges.selection;
    setState({ startDate: sel.startDate!, endDate: sel.endDate!, key: "selection" });
    updateData({ dateRangeStart: sel.startDate, dateRangeEnd: sel.endDate });
  };

  const isValid = state.startDate && state.endDate;

  return (
    <div className="flex flex-col gap-6 items-center max-w-2xl mx-auto w-full">
      <p className="text-zinc-600 text-center font-sans text-sm mb-2">
        Selecciona el período durante el cual necesitarás el servicio del chef
      </p>

      <div className="w-full border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <DateRange
          ranges={[state]}
          onChange={handleSelect}
          locale={es}
          months={2}
          direction="horizontal"
          showMonthAndYearPickers={true}
          minDate={tomorrow}
          startDatePlaceholder="Inicio"
          endDatePlaceholder="Fin"
          className="rdr-custom"
        />
      </div>

      <div className="w-full bg-zinc-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-zinc-500 uppercase font-semibold">Inicio</p>
            <p className="text-lg font-semibold text-zinc-900 mt-1">
              {format(state.startDate, "dd MMM yyyy", { locale: es })}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase font-semibold">Fin</p>
            <p className="text-lg font-semibold text-zinc-900 mt-1">
              {format(state.endDate, "dd MMM yyyy", { locale: es })}
            </p>
          </div>
        </div>
      </div>

      <Button disabled={!isValid} onClick={nextStep} size="lg" className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md shadow-md transition-all">
        Continuar
      </Button>
    </div>
  );
}

export function StepMealSlots({ data, updateData, nextStep }: StepProps) {
  const toYMD = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const generateSlots = (): MealSlot[] => {
    if (!data.dateRangeStart || !data.dateRangeEnd) return [];
    const slots: MealSlot[] = [];
    const current = new Date(data.dateRangeStart);
    const end = new Date(data.dateRangeEnd);
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    while (current <= end) {
      slots.push({ fecha: toYMD(current), desayuno: true, almuerzo: true, cena: true });
      current.setDate(current.getDate() + 1);
    }
    return slots;
  };

  useEffect(() => {
    if (!data.mealSlots || data.mealSlots.length === 0) {
      updateData({ mealSlots: generateSlots() });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slots: MealSlot[] = data.mealSlots && data.mealSlots.length > 0
    ? data.mealSlots
    : generateSlots();

  const toggle = (fecha: string, meal: keyof Omit<MealSlot, "fecha">) => {
    updateData({
      mealSlots: slots.map(s =>
        s.fecha === fecha ? { ...s, [meal]: !s[meal] } : s
      ),
    });
  };

  const isValid = slots.some(s => s.desayuno || s.almuerzo || s.cena);

  const Cell = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
    <td
      onClick={onClick}
      className={`w-24 text-center py-4 cursor-pointer transition-colors select-none
        ${active ? "bg-green-50" : "bg-zinc-50 hover:bg-zinc-100"}`}
    >
      {active && <Check className="w-5 h-5 text-green-500 mx-auto" strokeWidth={2.5} />}
    </td>
  );

  return (
    <div className="flex flex-col gap-6 items-center max-w-2xl mx-auto w-full">
      <div className="w-full border border-zinc-200 rounded-lg overflow-hidden">
        <div className="max-h-[380px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-zinc-200">
                <th className="py-3 px-4 text-left text-xs font-bold text-zinc-500 tracking-widest uppercase w-24">
                  Fecha
                </th>
                <th className="py-3 text-center text-xs font-bold text-zinc-500 tracking-widest uppercase w-24">
                  Desayuno
                </th>
                <th className="py-3 text-center text-xs font-bold text-zinc-500 tracking-widest uppercase w-24">
                  Comida
                </th>
                <th className="py-3 text-center text-xs font-bold text-zinc-500 tracking-widest uppercase w-24">
                  Cena
                </th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, i) => (
                <tr key={slot.fecha} className={i < slots.length - 1 ? "border-b border-zinc-100" : ""}>
                  <td className="py-4 px-4 text-sm font-semibold text-zinc-700">
                    {slot.fecha.slice(5).replace("-", "-")}
                  </td>
                  <Cell active={slot.desayuno} onClick={() => toggle(slot.fecha, "desayuno")} />
                  <Cell active={slot.almuerzo} onClick={() => toggle(slot.fecha, "almuerzo")} />
                  <Cell active={slot.cena}     onClick={() => toggle(slot.fecha, "cena")} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-full bg-accent/5 border border-accent/20 rounded-lg px-4 py-3">
        <p className="text-sm text-zinc-600">
          Desactiva las casillas para los días en los que no necesites un servicio.
          Desliza hacia abajo la tabla para ver todas las fechas.
        </p>
      </div>

      <Button
        disabled={!isValid}
        onClick={nextStep}
        size="lg"
        className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md shadow-md transition-all"
      >
        Continuar
      </Button>
    </div>
  );
}
