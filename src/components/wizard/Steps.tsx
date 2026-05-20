"use client";

import { useState, useEffect } from "react";
import { StepProps, MealSlot } from "./types";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { registerOrVerifyClient } from "@/app/wizard/actions";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, X, Fish, Leaf, ChefHat, Layers, Store, Pizza, Croissant, Soup, Cake, PartyPopper, Heart, Briefcase, Smile, HelpCircle, Sun, Moon, Home, Users, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { es as esRDP } from "react-day-picker/locale";
import { DateRange, RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "./daterange.css";
import { Country as LibCountry } from "country-state-city";

export function StepServiceType({ data, updateData, nextStep, onService3Selected, onServiceTypeSelected }: StepProps) {
  const options = [
    { id: 1, title: "Experiencia Culinaria Única", desc: "Un chef exclusivo para una comida o cena especial de un día.", icon: "/unico.png" },
    { id: 2, title: "Varios Servicios", desc: "Un chef disponible para múltiples comidas durante unas vacaciones o evento continuo.", icon: "/varios 4.png" },
    { id: 3, title: "Comidas Semanales", desc: "Un chef que prepara tus comidas cada semana.", icon: "/date 1.png" }
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
          className={`flex items-center gap-4 p-6 rounded-md border text-left transition-all ${data.serviceType === opt.id.toString() ? 'border-accent bg-accent/5' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}
        >
          {opt.icon && (
            <Image src={opt.icon} alt="" width={48} height={48} className="shrink-0" />
          )}
          <div className="flex flex-col">
            <span className={`font-semibold text-lg mb-1 ${data.serviceType === opt.id.toString() ? 'text-accent' : 'text-zinc-900'}`}>{opt.title}</span>
            <span className="text-sm text-zinc-500 font-sans">{opt.desc}</span>
          </div>
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
        let url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(query)}&f=json&maxLocations=5&outFields=City,Region`;
        if (userCoords) {
          url += `&location=${userCoords.lon},${userCoords.lat}&distance=50000`;
        }
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error("Network Error");
        const json = await res.json();
        setResults(json.candidates || []);
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== 'AbortError') {
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

  const selectLocation = (name: string, city: string, lat: number, lng: number) => {
    setQuery(name);
    updateData({
      location: { name, city, lat, lng }
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
                onClick={() => selectLocation(r.address, r.attributes?.City || r.attributes?.Region || r.address.split(",")[0], r.location.y, r.location.x)}
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

const CUISINE_OPTIONS = [
  { value: "local",        label: "Local",             Icon: Store      },
  { value: "italian",      label: "Italiana",          Icon: Pizza      },
  { value: "mediterranean",label: "Mediterránea",      Icon: Leaf       },
  { value: "seafood",      label: "Mariscos/Pescados", Icon: Fish       },
  { value: "french",       label: "Francesa",          Icon: Croissant  },
  { value: "japanese",     label: "Japonesa",          Icon: Soup       },
  { value: "fusion",       label: "Fusión",            Icon: Layers     },
  { value: "chefs_special",label: "Especial del chef", Icon: ChefHat   },
] as const;

export function StepCuisine({ data, updateData, nextStep }: StepProps) {
  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
      <p className="text-center text-zinc-500 text-sm -mt-2 mb-1">
        Si necesitas más inspiración, prueba el especial del chef.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CUISINE_OPTIONS.map(({ value, label, Icon }) => {
          const active = data.cuisine === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => { updateData({ cuisine: value }); nextStep(); }}
              className={`flex items-center gap-4 px-5 h-16 rounded-xl border text-left transition-all ${
                active
                  ? "border-accent bg-accent/5 text-accent"
                  : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-accent" : "text-zinc-900"}`} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>
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

// ── PhoneInput ────────────────────────────────────────────────────────────────
type PhoneCountry = { name: string; isoCode: string; flag: string; code: string };

const PHONE_COUNTRIES: PhoneCountry[] = LibCountry.getAllCountries()
  .map(c => {
    const raw = c.phonecode;
    const base = raw.startsWith('+') ? raw.slice(1) : raw;
    const code = '+' + base.split(/[-\s]/)[0].split('and')[0].trim();
    return { name: c.name, isoCode: c.isoCode, flag: c.flag, code };
  })
  .filter(c => /^\+\d+$/.test(c.code));

const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES.find(c => c.isoCode === 'UY') ?? PHONE_COUNTRIES[0];

function parsePhone(val: string): { country: PhoneCountry; local: string } {
  if (!val) return { country: DEFAULT_PHONE_COUNTRY, local: '' };
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (val.startsWith(c.code)) return { country: c, local: val.slice(c.code.length) };
  }
  return { country: DEFAULT_PHONE_COUNTRY, local: '' };
}

function PhoneInput({
  value,
  onChange,
  onBlur,
  hasError,
}: {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  hasError?: boolean;
}) {
  const { country: initCountry, local: initLocal } = parsePhone(value);
  const [country, setCountry] = useState<PhoneCountry>(initCountry);
  const [local, setLocal] = useState(initLocal);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search
    ? PHONE_COUNTRIES.filter(
        c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.includes(search)
      )
    : PHONE_COUNTRIES;

  const handleCountrySelect = (c: PhoneCountry) => {
    setCountry(c);
    setOpen(false);
    setSearch('');
    onChange(`${c.code}${local}`);
  };

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d\s\-\(\)]/g, '');
    setLocal(val);
    onChange(`${country.code}${val}`);
  };

  return (
    <div className={`flex items-center h-14 border rounded-lg overflow-hidden bg-white transition-colors ${hasError ? 'border-red-400' : 'border-zinc-200 focus-within:border-zinc-400'}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="flex items-center gap-1.5 px-3 h-full border-r border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors shrink-0 rounded-none">
          <span className="text-lg leading-none">{country.flag}</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700">{country.code}</span>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <Input
            placeholder="Buscar país..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm mb-2"
            autoFocus
          />
          <div className="max-h-56 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.isoCode}
                type="button"
                onClick={() => handleCountrySelect(c)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors text-left ${c.isoCode === country.isoCode ? 'bg-accent/10 text-accent' : 'text-zinc-700 hover:bg-zinc-50'}`}
              >
                <span>{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-zinc-400 shrink-0">{c.code}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <input
        type="tel"
        placeholder="000-000-000"
        value={local}
        onChange={handleLocalChange}
        onBlur={onBlur}
        className="flex-1 h-full px-4 text-base outline-none bg-transparent text-zinc-900 placeholder:text-zinc-400 font-medium"
      />
    </div>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function StepContact({ data, updateData, onFinalSubmit }: StepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const email = data.contact?.email ?? "";
  const emailValid  = EMAIL_REGEX.test(email);
  const { local: phoneLocal } = parsePhone(data.contact?.phone ?? '');
  const phoneValid  = phoneLocal.replace(/\D/g, '').length >= 6;
  const isValid = !!(data.contact?.name && emailValid && phoneValid);

  const blur = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");

    const result = await registerOrVerifyClient(
      data.contact!.name!,
      data.contact!.email!,
      data.contact!.phone!
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.userId && onFinalSubmit) {
      await onFinalSubmit(result.userId, {
        isNewUser:        result.isNewUser ?? false,
        tempPassword:     result.tempPassword,
        confirmationLink: result.confirmationLink,
      });
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-5 max-w-md mx-auto w-full">
      <p className="text-zinc-500 text-sm text-center mb-1">
        Ahora, sólo tienes que añadir tus datos de contacto y te enviaremos propuestas de menú
        personalizadas y gratuitas en menos de 20 minutos.
      </p>

      <div>
        <label className="block text-sm font-semibold text-zinc-800 mb-1.5">
          Nombre <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="John Doe"
          className="h-14 text-base border-zinc-200"
          value={data.contact?.name ?? ""}
          onChange={(e) => updateData({ contact: { ...data.contact, name: e.target.value } })}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-800 mb-1.5">
          Email <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="example@mail.com"
          type="email"
          className={`h-14 text-base ${touched.email && !emailValid ? "border-red-400 focus:ring-red-400" : "border-zinc-200"}`}
          value={email}
          onChange={(e) => updateData({ contact: { ...data.contact, email: e.target.value } })}
          onBlur={() => blur("email")}
        />
        {touched.email && !emailValid && (
          <p className="text-xs text-red-500 mt-1">Ingresá un email válido.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-800 mb-1.5">
          Teléfono <span className="text-red-400">*</span>
        </label>
        <PhoneInput
          value={data.contact?.phone ?? ""}
          onChange={(val) => updateData({ contact: { ...data.contact, phone: val } })}
          onBlur={() => blur("phone")}
          hasError={touched.phone && !phoneValid}
        />
        {touched.phone && !phoneValid && (
          <p className="text-xs text-red-500 mt-1">Ingresá un número de teléfono válido.</p>
        )}
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <Button
        disabled={!isValid || loading}
        onClick={handleSubmit}
        size="lg"
        className="w-auto mx-auto px-10 h-14 bg-accent text-zinc-900 font-bold text-base rounded-2xl mt-2 hover:bg-accent/90 shadow-[0_8px_20px_rgb(224,159,62,0.2)] transition-all disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Enviando...
          </span>
        ) : "Solicitar chefs y menús"}
      </Button>

      <p className="text-xs text-zinc-400 text-center">
        Al enviar este formulario, aceptas nuestros{" "}
        <a href="/terms" className="underline">Términos</a>{" "}
        y reconoces la{" "}
        <a href="/privacy" className="underline">Declaración de privacidad global</a>.
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
    endDate:   data.dateRangeEnd   || tomorrow,
    key: "selection",
  });

  const handleSelect = (ranges: RangeKeyDict) => {
    const sel = ranges.selection;
    setState({ startDate: sel.startDate!, endDate: sel.endDate!, key: "selection" });
    updateData({ dateRangeStart: sel.startDate, dateRangeEnd: sel.endDate });
  };

  const isValid = state.startDate && state.endDate && state.endDate > state.startDate;

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

      {isValid && (
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
      )}

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
        ${active ? "bg-green-50" : "bg-red-50 hover:bg-red-100"}`}
    >
      {active
        ? <Check className="w-5 h-5 text-green-500 mx-auto" strokeWidth={2.5} />
        : <X     className="w-5 h-5 text-red-400  mx-auto" strokeWidth={2.5} />
      }
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

// ── Hint box reutilizable ─────────────────────────────────────────────────────
function HintBox({ text = "¿No estás seguro? Puedes cambiarlo más adelante! 😊" }: { text?: string }) {
  return (
    <div className="w-full bg-amber-50 border border-amber-100 rounded-xl px-5 py-3 text-sm font-medium text-zinc-700 text-center">
      {text}
    </div>
  );
}

// ── Radio circle reutilizable ─────────────────────────────────────────────────
function RadioCircle({ active }: { active: boolean }) {
  return (
    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
      active ? "border-accent bg-accent" : "border-zinc-300 bg-white"
    }`}>
      {active && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
    </div>
  );
}

// ── StepOccasion1: con íconos + radio para servicio único ─────────────────────
const OCCASION_OPTIONS_1 = [
  { value: "birthday",          label: "Cumpleaños",              Icon: Cake         },
  { value: "family_reunion",    label: "Reunión familiar",        Icon: Home         },
  { value: "bachelor_party",    label: "Despedida de soltera/o",  Icon: PartyPopper  },
  { value: "friends_gathering", label: "Reunión con amigos",      Icon: Smile        },
  { value: "romantic_dinner",   label: "Cena romántica",          Icon: Heart        },
  { value: "corporate",         label: "Evento corporativo",      Icon: Briefcase    },
  { value: "gastronomic",       label: "Aventura gastronómica",   Icon: Users        },
  { value: "other",             label: "Otra",                    Icon: HelpCircle   },
] as const;

export function StepOccasion1({ data, updateData, nextStep }: StepProps) {
  return (
    <div className="flex flex-col gap-3 max-w-xl mx-auto w-full">
      <p className="text-center text-zinc-500 text-sm mb-2">
        Esto nos ayuda a transmitir a nuestros chefs el ambiente ideal del evento.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OCCASION_OPTIONS_1.map(({ value, label, Icon }) => {
          const active = data.occasion === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => { updateData({ occasion: value }); nextStep(); }}
              className={`flex items-center gap-4 px-5 h-16 rounded-xl border text-left transition-all ${
                active
                  ? "border-accent bg-accent/5"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-accent" : "text-zinc-900"}`} />
              <span className={`flex-1 text-sm font-medium ${active ? "text-accent" : "text-zinc-700"}`}>{label}</span>
              <RadioCircle active={active} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── StepGuestsStatic: rangos fijos con precio desde ──────────────────────────
const GUESTS_OPTIONS = [
  { value: "2",    label: "2 personas",       price: "$2.772" },
  { value: "3-6",  label: "3 a 6 personas",   price: "$1.733" },
  { value: "7-12", label: "7 a 12 personas",  price: "$1.213" },
  { value: "13+",  label: "13+ personas",     price: "$1.213" },
] as const;

export function StepGuestsStatic({ data, updateData, nextStep }: StepProps) {
  return (
    <div className="flex flex-col gap-3 max-w-xs mx-auto w-full">
      <p className="text-center text-zinc-500 text-sm mb-2">
        La tarifa del chef es fija, por lo que el precio por persona varía según el tamaño del grupo.
      </p>
      {GUESTS_OPTIONS.map(({ value, label, price }) => {
        const active = data.guestsRange === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => { updateData({ guestsRange: value }); nextStep(); }}
            className={`flex items-center gap-4 px-5 h-16 rounded-xl border transition-all ${
              active
                ? "border-accent bg-accent/5"
                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <span className={`flex-1 text-sm font-semibold text-left ${active ? "text-zinc-900" : "text-zinc-800"}`}>
              <span className="font-bold">{label}</span>
              <span className="font-normal text-zinc-500"> desde {price}</span>
            </span>
            <RadioCircle active={active} />
          </button>
        );
      })}
      <HintBox />
    </div>
  );
}

// ── StepMealTime: Comida / Cena ───────────────────────────────────────────────
export function StepMealTime({ data, updateData, nextStep }: StepProps) {
  const options = [
    { value: "lunch"  as const, label: "Comida", Icon: Sun  },
    { value: "dinner" as const, label: "Cena",   Icon: Moon },
  ];

  return (
    <div className="flex flex-col gap-3 max-w-xs mx-auto w-full">
      {options.map(({ value, label, Icon }) => {
        const active = data.mealTime === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => { updateData({ mealTime: value }); nextStep(); }}
            className={`flex items-center gap-4 px-5 h-16 rounded-xl border transition-all ${
              active
                ? "border-accent bg-accent/5"
                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-accent" : "text-zinc-900"}`} />
            <span className={`flex-1 text-sm font-medium text-left ${active ? "text-accent" : "text-zinc-700"}`}>{label}</span>
            <RadioCircle active={active} />
          </button>
        );
      })}
    </div>
  );
}

// ── StepDateCalendar: calendario inline ───────────────────────────────────────
export function StepDateCalendar({ data, updateData, nextStep }: StepProps) {
  return (
    <div className="flex flex-col gap-4 items-center max-w-4xl mx-auto w-full">
      <div className="w-full border border-zinc-200 rounded-xl overflow-x-auto bg-white p-4">
        <Calendar
          mode="single"
          selected={data.date}
          onSelect={(date) => {
            if (!date) return;
            updateData({ date });
            nextStep();
          }}
          disabled={(date) => {
            const today = new Date()
            return new Date(date.getFullYear(), date.getMonth(), date.getDate()) <=
              new Date(today.getFullYear(), today.getMonth(), today.getDate())
          }}
          numberOfMonths={3}
          locale={esRDP}
          className="mx-auto"
          classNames={{ day_button: "cursor-pointer" }}
        />
      </div>
      <HintBox />
    </div>
  );
}

// ── StepBudgetTier: Casual / Gourmet / Selección exclusiva ───────────────────
const BUDGET_OPTIONS = [
  {
    value:   "casual"    as const,
    label:   "Casual",
    desc:    "Crear vínculos en torno a la buena comida.",
    range:   "$2.772 - $3.119",
  },
  {
    value:   "gourmet"   as const,
    label:   "Gourmet",
    desc:    "Menús brillantes para impresionar a tus invitados.",
    range:   "$3.119 - $3.465",
  },
  {
    value:   "exclusive" as const,
    label:   "Selección exclusiva",
    desc:    "Lo mejor de lo mejor para tu evento.",
    range:   "$3.465 - $4.158",
  },
] as const;

export function StepBudgetTier({ data, updateData, nextStep }: StepProps) {
  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto w-full">
      <p className="text-center text-zinc-500 text-sm mb-2">
        Los precios varían según la experiencia del chef y la complejidad del menú. ¡Elige el que más te convenga!
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BUDGET_OPTIONS.map(({ value, label, desc, range }) => {
          const active = data.budgetTier === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => { updateData({ budgetTier: value }); nextStep(); }}
              className={`flex flex-col items-start p-5 rounded-xl border text-left transition-all h-full ${
                active
                  ? "border-accent bg-accent/5"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <div className="flex w-full justify-between items-start mb-2">
                <span className={`font-semibold text-base ${active ? "text-accent" : "text-zinc-900"}`}>{label}</span>
                <RadioCircle active={active} />
              </div>
              <p className="text-xs text-zinc-500 mb-4 flex-1">{desc}</p>
              <span className="text-xs font-semibold bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-md">
                {range} por persona
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── StepBudgetMultiple: presupuesto para Varios Servicios ────────────────────
const BUDGET_MULTIPLE_OPTIONS = [
  {
    value:   "casual"    as const,
    label:   "Casual",
    desc:    "Crear vínculos en torno a la buena comida.",
    range:   "$27.213 - $31.295",
  },
  {
    value:   "gourmet"   as const,
    label:   "Gourmet",
    desc:    "Menús brillantes para impresionar a tus invitados.",
    range:   "$31.295 - $35.989",
  },
  {
    value:   "exclusive" as const,
    label:   "Selección exclusiva",
    desc:    "Lo mejor de lo mejor para tu evento.",
    range:   "$35.989 - $45.354",
  },
] as const;

export function StepBudgetMultiple({ data, updateData, nextStep }: StepProps) {
  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {BUDGET_MULTIPLE_OPTIONS.map(({ value, label, desc, range }) => {
          const active = data.budgetTier === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => { updateData({ budgetTier: value }); nextStep(); }}
              className={`flex flex-col items-start p-5 rounded-xl border text-left transition-all h-full ${
                active
                  ? "border-accent bg-accent/5"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <div className="flex w-full justify-between items-start mb-2">
                <span className={`font-semibold text-base ${active ? "text-accent" : "text-zinc-900"}`}>{label}</span>
                <RadioCircle active={active} />
              </div>
              <p className="text-xs text-zinc-500 mb-4 flex-1">{desc}</p>
              <span className="text-xs font-semibold bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-md w-full text-center">
                {range} servicio de Chef
              </span>
            </button>
          );
        })}
      </div>
      <div className="space-y-1.5 text-xs text-zinc-400 max-w-2xl mx-auto w-full">
        <p>* Este precio no incluye el coste de materias primas, que serán abonados directamente al presentar los tickets de compra.</p>
        <p>** Precios desde $4.535 por persona y servicio.</p>
      </div>
    </div>
  );
}

// ── StepDietarySimple: Ninguna / Sí → si Sí, muestra picker ─────────────────
const RESTRICTION_OPTIONS = [
  { value: "Vegetariano",  label: "Vegetariano"  },
  { value: "Vegano",       label: "Vegano"        },
  { value: "Gluten",       label: "Gluten"        },
  { value: "Frutos Secos", label: "Frutos Secos"  },
  { value: "Marisco",      label: "Marisco"       },
  { value: "Lácteos",      label: "Lácteos"       },
] as const;

export function StepDietarySimple({ data, updateData, nextStep }: StepProps) {
  const hasRestrictions = (data.dietaryRestrictions ?? [])[0] === "Sí";

  const toggleRestriction = (val: string) => {
    const current = (data.dietaryRestrictions ?? []).filter(r => r !== "Sí" && r !== "Ninguna");
    const next = current.includes(val)
      ? current.filter(r => r !== val)
      : [...current, val];
    updateData({ dietaryRestrictions: ["Sí", ...next] });
  };

  const selected = (data.dietaryRestrictions ?? []).filter(r => r !== "Sí" && r !== "Ninguna");

  if (!hasRestrictions) {
    return (
      <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
        <p className="text-center text-zinc-500 text-sm mb-2">
          Si necesitas comprobarlo con sus invitados, no hay problema. Puedes informar a tu chef más tarde.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[{ value: "Ninguna", label: "Ninguna" }, { value: "Sí", label: "Sí" }].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                updateData({ dietaryRestrictions: [value] });
                if (value === "Ninguna") nextStep();
              }}
              className="flex items-center justify-between px-5 h-16 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
            >
              <span className="text-sm font-medium text-zinc-700">{label}</span>
              <RadioCircle active={false} />
            </button>
          ))}
        </div>
        <HintBox />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
      <p className="text-center text-zinc-500 text-sm mb-1">
        Con esta información, nuestros chefs elaborarán menús personalizados adaptados a tus necesidades.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {RESTRICTION_OPTIONS.map(({ value, label }) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleRestriction(value)}
              className={`h-16 rounded-xl border text-sm font-medium transition-all ${
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <textarea
        placeholder="Otras restricciones..."
        value={data.dietaryOtras ?? ""}
        onChange={(e) => updateData({ dietaryOtras: e.target.value })}
        className="w-full min-h-[120px] p-4 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 resize-y font-sans"
      />

      <Button
        onClick={nextStep}
        size="lg"
        className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md shadow-sm"
      >
        Continuar
      </Button>
    </div>
  );
}

export function StepContact1({ data, updateData, onFinalSubmit }: StepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const email = data.contact?.email ?? "";

  const emailValid  = EMAIL_REGEX.test(email);
  const { local: phoneLocal } = parsePhone(data.contact?.phone ?? '');
  const phoneValid  = phoneLocal.replace(/\D/g, '').length >= 6;
  const isValid = !!(
    data.contact?.name &&
    emailValid &&
    phoneValid
  );

  const blur = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");

    const result = await registerOrVerifyClient(
      data.contact!.name!,
      data.contact!.email!,
      data.contact!.phone!
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.userId && onFinalSubmit) {
      await onFinalSubmit(result.userId, {
        isNewUser:        result.isNewUser ?? false,
        tempPassword:     result.tempPassword,
        confirmationLink: result.confirmationLink,
      });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-5 max-w-md mx-auto w-full">
      <p className="text-zinc-500 text-sm text-center mb-1">
        Ahora, sólo tienes que añadir tus datos de contacto y te enviaremos propuestas de menú
        personalizadas y gratuitas en menos de 20 minutos.
      </p>

      <div>
        <label className="block text-sm font-semibold text-zinc-800 mb-1.5">
          Nombre <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="John Doe"
          className="h-14 text-base border-zinc-200"
          value={data.contact?.name ?? ""}
          onChange={(e) => updateData({ contact: { ...data.contact, name: e.target.value } })}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-800 mb-1.5">
          Email <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="example@mail.com"
          type="email"
          className={`h-14 text-base ${touched.email && !emailValid ? "border-red-400 focus:ring-red-400" : "border-zinc-200"}`}
          value={email}
          onChange={(e) => updateData({ contact: { ...data.contact, email: e.target.value } })}
          onBlur={() => blur("email")}
        />
        {touched.email && !emailValid && (
          <p className="text-xs text-red-500 mt-1">Ingresá un email válido.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-800 mb-1.5">
          Teléfono <span className="text-red-400">*</span>
        </label>
        <PhoneInput
          value={data.contact?.phone ?? ""}
          onChange={(val) => updateData({ contact: { ...data.contact, phone: val } })}
          onBlur={() => blur("phone")}
          hasError={touched.phone && !phoneValid}
        />
        {touched.phone && !phoneValid && (
          <p className="text-xs text-red-500 mt-1">Ingresá un número de teléfono válido.</p>
        )}
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <Button
        disabled={!isValid || loading}
        onClick={handleSubmit}
        size="lg"
        className="w-auto mx-auto px-10 h-14 bg-accent text-zinc-900 font-bold text-base rounded-2xl mt-2 hover:bg-accent/90 shadow-[0_8px_20px_rgb(224,159,62,0.2)] transition-all disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Enviando...
          </span>
        ) : "Solicitar chefs y menús"}
      </Button>

      <p className="text-xs text-zinc-400 text-center">
        Al enviar este formulario, aceptas nuestros{" "}
        <a href="/terms" className="underline">Términos</a>{" "}
        y reconoces la{" "}
        <a href="/privacy" className="underline">Declaración de privacidad global</a>.
      </p>
    </div>
  );
}
