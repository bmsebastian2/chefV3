"use client";

import { useState, useEffect, useRef } from "react";
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

// ── Shared active/idle card classes ──────────────────────────────────────────
const CARD_ACTIVE   = "border-accent bg-accent/5 shadow-[0_0_0_3px_rgba(224,159,62,0.12)]";
const CARD_IDLE     = "border-zinc-200 hover:border-accent/40 hover:bg-zinc-50 hover:shadow-sm";
const BTN_CONTINUE  = "w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200";

// ── Service type SVG icons ────────────────────────────────────────────────────

/** Cloche animada — hover: cúpula sube + vapor aparece */
function IconCloche() {
  return (
    <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
      {/* Plate shadow */}
      <ellipse cx="22" cy="38" rx="15" ry="2.2" fill="currentColor" fillOpacity="0.08" />
      {/* Plate rim */}
      <ellipse cx="22" cy="36.5" rx="13.5" ry="1.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeOpacity="0.22" />

      {/* Cloche dome — sube en hover */}
      <g
        className="transition-transform duration-300 ease-out group-hover:-translate-y-2.5"
        style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
      >
        <path
          d="M9 36 C9 19 14 11 22 10 C30 11 35 19 35 36"
          fill="currentColor" fillOpacity="0.07"
          stroke="currentColor" strokeWidth="1.6"
        />
        <line x1="7" y1="36" x2="37" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* Handle stem */}
        <rect x="20.5" y="8.5" width="3" height="3.5" rx="1.5" fill="currentColor" fillOpacity="0.35" />
        {/* Gold knob */}
        <circle cx="22" cy="7.5" r="3" fill="#E09F3E" />
        <circle cx="21" cy="6.6" r="0.9" fill="white" fillOpacity="0.65" />
      </g>

      {/* Vapor 1 — izquierda */}
      <path d="M14 31 Q12 25 15 21" stroke="#E09F3E" strokeWidth="1.6" strokeLinecap="round"
        className="opacity-0 group-hover:opacity-90 transition-opacity duration-300" />
      {/* Vapor 2 — centro */}
      <path d="M22 33 Q24 27 21 23" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
        className="opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
      {/* Vapor 3 — derecha */}
      <path d="M30 31 Q32 25 29 21" stroke="#E09F3E" strokeWidth="1.6" strokeLinecap="round"
        className="opacity-0 group-hover:opacity-90 transition-opacity duration-300 delay-150" />
    </svg>
  );
}

/** Tres tenedores — hover: se separan en abanico */
function IconMultiple() {
  return (
    <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
      {/* Tenedor izquierdo — aparece y se desplaza a la izq en hover */}
      <g className="opacity-30 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-x-3"
         style={{ transformBox: "fill-box", transformOrigin: "center center" }}>
        <line x1="11" y1="8" x2="11" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="9"  y1="8" x2="9"  y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="13" y1="8" x2="13" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="11" y1="22" x2="11" y2="36" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        {/* Cuchillo izq */}
        <line x1="15" y1="8" x2="15" y2="36" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M15 8 Q18 11 15 16" fill="currentColor" fillOpacity="0.25" />
      </g>

      {/* Tenedor central — siempre visible */}
      <line x1="22" y1="6" x2="22" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="6" x2="20" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="22" y1="6" x2="22" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="24" y1="6" x2="24" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="22" y1="20" x2="22" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Cuchillo central */}
      <line x1="27" y1="6" x2="27" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M27 6 Q31 9 27 15" fill="currentColor" fillOpacity="0.2" />
      {/* Punto dorado central */}
      <circle cx="22" cy="32" r="2.5" fill="#E09F3E"
        className="transition-all duration-300 group-hover:scale-110"
        style={{ transformBox: "fill-box", transformOrigin: "center center" }} />

      {/* Tenedor derecho — aparece y se desplaza a la der en hover */}
      <g className="opacity-30 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-3"
         style={{ transformBox: "fill-box", transformOrigin: "center center" }}>
        <line x1="33" y1="8" x2="33" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="31" y1="8" x2="31" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="33" y1="8" x2="33" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="35" y1="8" x2="35" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="33" y1="22" x2="33" y2="36" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Olla de cocina — hover: tapa sube + vapor + 7 puntos semanales se encienden */
function IconWeekly() {
  return (
    <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
      {/* Olla cuerpo */}
      <rect x="9" y="19" width="26" height="17" rx="4.5" fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeWidth="1.6" />
      {/* Asa izquierda */}
      <path d="M9 23 L5 23 L5 28 L9 28" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* Asa derecha */}
      <path d="M35 23 L39 23 L39 28 L35 28" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />

      {/* Tapa — sube en hover */}
      <g
        className="transition-transform duration-250 ease-out group-hover:-translate-y-2"
        style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
      >
        <rect x="8" y="14.5" width="28" height="5.5" rx="3" fill="currentColor" fillOpacity="0.09" stroke="currentColor" strokeWidth="1.5" />
        {/* Pomo dorado */}
        <circle cx="22" cy="12.5" r="3.2" fill="#E09F3E" />
        <circle cx="21" cy="11.5" r="0.9" fill="white" fillOpacity="0.6" />
      </g>

      {/* Vapor — aparece en hover */}
      <path d="M16 13 Q14 8 17 5" stroke="#E09F3E" strokeWidth="1.5" strokeLinecap="round"
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <path d="M22 13 Q24 8 21 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        className="opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
      <path d="M28 13 Q30 8 27 5" stroke="#E09F3E" strokeWidth="1.5" strokeLinecap="round"
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100" />

      {/* 7 puntos semanales */}
      {([0,1,2,3,4,5,6] as const).map((i) => (
        <circle
          key={i}
          cx={7 + i * 5}
          cy={41}
          r={1.6}
          fill="#E09F3E"
          fillOpacity={i < 5 ? 0.25 : 0.1}
          className={`transition-all duration-200 group-hover:fill-[#E09F3E] group-hover:opacity-100`}
          style={{ transitionDelay: `${i * 40}ms` }}
        />
      ))}
    </svg>
  );
}

export function StepServiceType({ data, updateData, nextStep, onService3Selected, onServiceTypeSelected }: StepProps) {
  const options = [
    {
      id: 1,
      title: "Experiencia Culinaria Única",
      desc: "Un chef exclusivo para una comida o cena especial de un día.",
      svgIcon: <IconCloche />,
    },
    {
      id: 2,
      title: "Varios Servicios",
      desc: "Un chef disponible para múltiples comidas durante unas vacaciones o evento continuo.",
      svgIcon: <IconMultiple />,
    },
    {
      id: 3,
      title: "Comidas Semanales",
      desc: "Un chef que prepara tus comidas cada semana.",
      svgIcon: <IconWeekly />,
    },
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
    <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
      <p className="text-zinc-500 mb-3 text-center font-sans text-sm">
        Define tu evento para ver chefs, menús y precios. ¡Te llevará{" "}
        <strong className="text-accent">menos de 2 minutos</strong>!
      </p>
      {options.map((opt) => {
        const active = data.serviceType === opt.id.toString();
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleSelectService(opt.id)}
            className={`group flex items-center gap-5 p-5 rounded-2xl border text-left transition-all duration-200 ${
              active ? CARD_ACTIVE : CARD_IDLE
            }`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200 overflow-hidden ${
              active ? "bg-accent/10 text-accent" : "bg-zinc-50 text-zinc-500"
            }`}>
              {opt.svgIcon}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`font-semibold text-base mb-0.5 transition-colors duration-200 ${
                active ? "text-accent" : "text-zinc-900"
              }`}>
                {opt.title}
              </span>
              <span className="text-sm text-zinc-500 font-sans leading-snug">{opt.desc}</span>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
              active ? "border-accent bg-accent" : "border-zinc-200 bg-white"
            }`}>
              {active && (
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5.5L3.5 7.5L8.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const OCCASION_OPTIONS_2 = [
  { value: "Reunión familiar",   label: "Reunión familiar",   Icon: Home      },
  { value: "Reunión con amigos", label: "Reunión con amigos", Icon: Smile     },
  { value: "Cena romántica",     label: "Cena romántica",     Icon: Heart     },
  { value: "Evento corporativo", label: "Evento corporativo", Icon: Briefcase },
  { value: "Otra",               label: "Otra",               Icon: HelpCircle},
] as const;

export function StepOccasion({ data, updateData, nextStep }: StepProps) {
  return (
    <div className="flex flex-col gap-3 max-w-xl mx-auto w-full">
      <p className="text-center text-zinc-500 text-sm mb-2">
        Esto nos ayuda a transmitir a nuestros chefs el ambiente ideal del evento.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OCCASION_OPTIONS_2.map(({ value, label, Icon }) => {
          const active = data.occasion === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => { updateData({ occasion: value }); nextStep(); }}
              className={`flex items-center gap-4 px-5 h-16 rounded-xl border text-left transition-all duration-200 ${
                active ? CARD_ACTIVE : CARD_IDLE
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                active ? "bg-accent/15" : "bg-zinc-100"
              }`}>
                <Icon className={`w-4 h-4 ${active ? "text-accent" : "text-zinc-600"}`} />
              </div>
              <span className={`flex-1 text-sm font-medium ${active ? "text-accent" : "text-zinc-700"}`}>{label}</span>
              <RadioCircle active={active} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StepLocation({ data, updateData, nextStep }: StepProps) {
  const [query, setQuery] = useState(data.location?.name || "");
  const [results, setResults] = useState<{ place_name: string; center: [number, number]; context?: { id: string; short_code?: string }[] }[]>([]);
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
        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&autocomplete=true&language=es&types=address,place&limit=5`;
        if (userCoords) {
          url += `&proximity=${userCoords.lon},${userCoords.lat}`;
        }
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error("Network Error");
        const json = await res.json();
        setResults(json.features || []);
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== 'AbortError') {
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

  const selectLocation = (name: string, city: string, lat: number, lng: number, countryCode?: string) => {
    setQuery(name);
    updateData({ location: { name, city, lat, lng, countryCode } });
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
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
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
          className="h-14 text-lg w-full shadow-sm pl-12 pr-12 rounded-xl border-zinc-200 focus:border-accent/60 transition-colors"
        />
        {loading && (
          <div className="absolute right-4 w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        )}

        {results.length > 0 && (
          <div className="absolute top-16 left-0 w-full bg-white border border-zinc-200 shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {results.map((r, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectLocation(
                  r.place_name,
                  r.place_name.split(",")[1]?.trim() || r.place_name.split(",")[0],
                  r.center[1],
                  r.center[0],
                  r.context?.find(c => c.id.startsWith("country."))?.short_code?.toUpperCase()
                )}
                className="w-full text-left px-4 py-3 hover:bg-accent/5 border-b border-zinc-100 last:border-none focus:outline-none transition-colors"
              >
                <div className="font-medium text-zinc-900">{r.place_name.split(",")[0]}</div>
                <div className="text-xs text-zinc-500">
                  {r.place_name.split(",").slice(1).join(",").trim()}
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
        className={BTN_CONTINUE}
      >
        Continuar
      </Button>
    </div>
  );
}

// ── CounterRow ────────────────────────────────────────────────────────────────
interface CounterRowProps {
  label: string; subtitle: string; value: number; min?: number;
  onDecrement: () => void; onIncrement: () => void;
}
function CounterRow({ label, subtitle, value, min = 0, onDecrement, onIncrement }: CounterRowProps) {
  return (
    <div className="flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-2xl transition-colors hover:border-zinc-300">
      <div>
        <p className="font-semibold text-zinc-900 text-base">{label}</p>
        <p className="text-sm text-accent mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1 bg-zinc-50 rounded-full p-1 border border-zinc-200">
        <button
          type="button"
          onClick={onDecrement}
          disabled={value <= min}
          className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-600 text-lg font-light hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
        >−</button>
        <span className="w-8 text-center text-base font-semibold text-zinc-900 select-none">{value}</span>
        <button
          type="button"
          onClick={onIncrement}
          className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-600 text-lg font-light hover:bg-white hover:shadow-sm transition-all duration-150"
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
    <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
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
      <Button onClick={handleContinue} size="lg" className={BTN_CONTINUE + " mt-2"}>
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
    if (minTime && value < minTime) return;
    updateData({ time: value });
  };

  return (
    <div className="flex flex-col gap-4 items-center max-w-md mx-auto w-full">
      <Popover>
        <PopoverTrigger className={`inline-flex items-center w-full h-14 justify-start rounded-xl border text-left font-normal px-4 text-sm hover:bg-zinc-50 transition-colors ${
          !data.date ? "text-muted-foreground border-zinc-200" : "border-zinc-300 text-zinc-900"
        }`}>
          <CalendarIcon className="mr-3 h-5 w-5 text-zinc-400" />
          {data.date ? format(data.date, "PPP", { locale: es }) : <span className="text-base text-zinc-400">Elige una fecha</span>}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-zinc-200" align="center">
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
        className="h-14 text-base w-full border-zinc-200 rounded-xl font-medium focus:border-accent/60 transition-colors"
      />

      <Button
        disabled={!data.date || !data.time}
        onClick={nextStep}
        size="lg"
        className={BTN_CONTINUE + " mt-2"}
      >
        Continuar
      </Button>
    </div>
  );
}

const CUISINE_OPTIONS = [
  { value: "local",         label: "Local",              Icon: Store      },
  { value: "italian",       label: "Italiana",           Icon: Pizza      },
  { value: "mediterranean", label: "Mediterránea",       Icon: Leaf       },
  { value: "seafood",       label: "Mariscos/Pescados",  Icon: Fish       },
  { value: "french",        label: "Francesa",           Icon: Croissant  },
  { value: "japanese",      label: "Japonesa",           Icon: Soup       },
  { value: "fusion",        label: "Fusión",             Icon: Layers     },
  { value: "chefs_special", label: "Especial del chef",  Icon: ChefHat    },
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
              className={`flex items-center gap-4 px-5 h-16 rounded-xl border text-left transition-all duration-200 ${
                active ? CARD_ACTIVE : CARD_IDLE
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                active ? "bg-accent/15" : "bg-zinc-100"
              }`}>
                <Icon className={`w-4 h-4 ${active ? "text-accent" : "text-zinc-600"}`} />
              </div>
              <span className={`text-sm font-medium flex-1 ${active ? "text-accent" : "text-zinc-700"}`}>{label}</span>
              {active && (
                <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5.5L3.5 7.5L8.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
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
      <div className="grid grid-cols-2 gap-3">
        {options.map(opt => {
          const active = (data.dietaryRestrictions || []).includes(opt);
          return (
            <button
              key={opt}
              onClick={() => toggleRestriction(opt)}
              className={`min-h-[56px] px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                active
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                  : "border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <Button
        disabled={!(data.dietaryRestrictions || []).length}
        onClick={nextStep}
        size="lg"
        className={BTN_CONTINUE}
      >
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
        className="w-full min-h-[160px] p-4 text-base border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 resize-none font-sans shadow-sm transition-all"
        value={data.details || ""}
        onChange={(e) => updateData({ details: e.target.value })}
      />
      <Button onClick={nextStep} size="lg" className={BTN_CONTINUE}>
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
  defaultCountryCode,
}: {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  hasError?: boolean;
  defaultCountryCode?: string;
}) {
  const { country: initCountry, local: initLocal } = parsePhone(value);
  const resolvedCountry = !value && defaultCountryCode
    ? (PHONE_COUNTRIES.find(c => c.isoCode === defaultCountryCode) ?? initCountry)
    : initCountry;
  const [country, setCountry] = useState<PhoneCountry>(resolvedCountry);
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
    <div className={`flex items-center h-14 border rounded-xl overflow-hidden bg-white transition-all duration-200 ${
      hasError ? 'border-red-400' : 'border-zinc-200 focus-within:border-accent/50 focus-within:shadow-[0_0_0_3px_rgba(224,159,62,0.10)]'
    }`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="flex items-center gap-1.5 px-3 h-full border-r border-zinc-100 bg-zinc-50 hover:bg-zinc-100 transition-colors shrink-0 rounded-none">
          <span className="text-lg leading-none">{country.flag}</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700">{country.code}</span>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 rounded-xl shadow-xl border-zinc-200" align="start">
          <Input
            placeholder="Buscar país..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm mb-2 rounded-lg"
            autoFocus
          />
          <div className="max-h-56 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.isoCode}
                type="button"
                onClick={() => handleCountrySelect(c)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors text-left ${
                  c.isoCode === country.isoCode ? 'bg-accent/10 text-accent' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
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
      <p className="text-zinc-500 text-sm text-center mb-1 leading-relaxed">
        Ahora, sólo tienes que añadir tus datos de contacto y te enviaremos propuestas de menú
        personalizadas y gratuitas en menos de 20 minutos.
      </p>

      <div>
        <label className="block text-sm font-semibold text-zinc-800 mb-1.5">
          Nombre <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="John Doe"
          className="h-14 text-base border-zinc-200 rounded-xl focus:border-accent/50 transition-colors"
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
          className={`h-14 text-base rounded-xl transition-colors ${
            touched.email && !emailValid
              ? "border-red-400 focus:ring-red-400"
              : "border-zinc-200 focus:border-accent/50"
          }`}
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
          defaultCountryCode={data.location?.countryCode}
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
        className="w-auto mx-auto px-10 h-14 bg-accent text-zinc-900 font-bold text-base rounded-2xl mt-2 hover:bg-accent/90 hover:scale-[1.02] shadow-[0_8px_20px_rgba(224,159,62,0.2)] hover:shadow-[0_12px_28px_rgba(224,159,62,0.3)] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
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
        <a href="/terms" className="underline hover:text-zinc-600 transition-colors">Términos</a>{" "}
        y reconoces la{" "}
        <a href="/privacy" className="underline hover:text-zinc-600 transition-colors">Declaración de privacidad global</a>.
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

      <div className="w-full border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
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
        <div className="w-full bg-accent/5 border border-accent/20 p-4 rounded-2xl">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Inicio</p>
              <p className="text-lg font-semibold text-zinc-900 mt-1">
                {format(state.startDate, "dd MMM yyyy", { locale: es })}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Fin</p>
              <p className="text-lg font-semibold text-zinc-900 mt-1">
                {format(state.endDate, "dd MMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
        </div>
      )}

      <Button disabled={!isValid} onClick={nextStep} size="lg" className={BTN_CONTINUE}>
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
      className={`w-24 text-center py-4 cursor-pointer transition-colors select-none ${
        active ? "bg-green-50 hover:bg-green-100" : "bg-red-50 hover:bg-red-100"
      }`}
    >
      {active
        ? <Check className="w-5 h-5 text-green-500 mx-auto" strokeWidth={2.5} />
        : <X     className="w-5 h-5 text-red-400  mx-auto" strokeWidth={2.5} />
      }
    </td>
  );

  return (
    <div className="flex flex-col gap-6 items-center max-w-2xl mx-auto w-full">
      <div className="w-full border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="max-h-[380px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-zinc-200">
                <th className="py-3 px-4 text-left text-xs font-bold text-zinc-400 tracking-widest uppercase w-24">Fecha</th>
                <th className="py-3 text-center text-xs font-bold text-zinc-400 tracking-widest uppercase w-24">Desayuno</th>
                <th className="py-3 text-center text-xs font-bold text-zinc-400 tracking-widest uppercase w-24">Comida</th>
                <th className="py-3 text-center text-xs font-bold text-zinc-400 tracking-widest uppercase w-24">Cena</th>
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

      <HintBox text="Desactiva las casillas para los días en los que no necesites un servicio. Desliza hacia abajo para ver todas las fechas." />

      <Button disabled={!isValid} onClick={nextStep} size="lg" className={BTN_CONTINUE}>
        Continuar
      </Button>
    </div>
  );
}

// ── HintBox reutilizable ──────────────────────────────────────────────────────
function HintBox({ text = "¿No estás seguro? ¡Puedes cambiarlo más adelante!" }: { text?: string }) {
  return (
    <div className="w-full flex items-start gap-3 bg-accent/5 border border-accent/15 rounded-xl px-5 py-3.5">
      <span className="text-accent text-base leading-none mt-0.5 flex-shrink-0 select-none">✦</span>
      <p className="text-sm text-zinc-600 leading-relaxed">{text}</p>
    </div>
  );
}

// ── RadioCircle reutilizable ──────────────────────────────────────────────────
function RadioCircle({ active }: { active: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
      active ? "border-accent bg-accent" : "border-zinc-200 bg-white"
    }`}>
      {active && (
        <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5.5L3.5 7.5L8.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
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
              className={`flex items-center gap-4 px-5 h-16 rounded-xl border text-left transition-all duration-200 ${
                active ? CARD_ACTIVE : CARD_IDLE
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                active ? "bg-accent/15" : "bg-zinc-100"
              }`}>
                <Icon className={`w-4 h-4 ${active ? "text-accent" : "text-zinc-600"}`} />
              </div>
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
  { value: "2",    label: "2 personas",       price: "$210" },
  { value: "3-6",  label: "3 a 6 personas",   price: "$189" },
  { value: "7-12", label: "7 a 12 personas",  price: "$147" },
  { value: "13+",  label: "13+ personas",     price: "$147" },
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
            className={`flex items-center gap-4 px-5 h-16 rounded-xl border transition-all duration-200 ${
              active ? CARD_ACTIVE : CARD_IDLE
            }`}
          >
            <div className="flex-1 text-left">
              <span className={`text-sm font-bold block ${active ? "text-zinc-900" : "text-zinc-800"}`}>{label}</span>
              <span className="text-xs text-zinc-400 font-normal">desde {price} por persona</span>
            </div>
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
    <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto w-full">
      {options.map(({ value, label, Icon }) => {
        const active = data.mealTime === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => { updateData({ mealTime: value }); nextStep(); }}
            className={`flex flex-col items-center justify-center gap-3 h-32 rounded-2xl border-2 transition-all duration-200 ${
              active
                ? "border-accent bg-accent/5 shadow-[0_0_0_3px_rgba(224,159,62,0.12)]"
                : "border-zinc-200 hover:border-accent/40 hover:bg-zinc-50 hover:shadow-sm"
            }`}
          >
            <Icon className={`w-10 h-10 transition-colors duration-200 ${active ? "text-accent" : "text-zinc-300"}`} strokeWidth={1.5} />
            <span className={`text-sm font-semibold transition-colors duration-200 ${active ? "text-accent" : "text-zinc-600"}`}>
              {label}
            </span>
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
      <div className="w-full border border-zinc-200 rounded-2xl overflow-x-auto bg-white p-4 shadow-sm">
        <Calendar
          mode="single"
          selected={data.date}
          onSelect={(date) => {
            if (!date) {
              if (data.date) nextStep();
              return;
            }
            updateData({ date });
            nextStep();
          }}
          disabled={(date) => {
            const today = new Date();
            return new Date(date.getFullYear(), date.getMonth(), date.getDate()) <=
              new Date(today.getFullYear(), today.getMonth(), today.getDate());
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

// ── StepBudgetTier ────────────────────────────────────────────────────────────
function getBasePrice(guestsRange: string | undefined): number {
  if (guestsRange === "2")   return 210;
  if (guestsRange === "3-6") return 189;
  return 147; // '7-12', '13+', or undefined
}

function getBudgetOptions(guestsRange: string | undefined) {
  const base = getBasePrice(guestsRange);
  return [
    {
      value: "casual"    as const,
      label: "Casual",
      desc:  "Crear vínculos en torno a la buena comida.",
      range: `$${base} - $${base + 42}`,
    },
    {
      value: "gourmet"   as const,
      label: "Gourmet",
      desc:  "Menús brillantes para impresionar a tus invitados.",
      range: `$${base + 42} - $${base + 84}`,
    },
    {
      value: "exclusive" as const,
      label: "Selección exclusiva",
      desc:  "Lo mejor de lo mejor para tu evento.",
      range: `$${base + 84} - $${base + 147}`,
    },
  ];
}

export function StepBudgetTier({ data, updateData, nextStep }: StepProps) {
  const budgetOptions = getBudgetOptions(data.guestsRange);
  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto w-full">
      <p className="text-center text-zinc-500 text-sm mb-2">
        Los precios varían según la experiencia del chef y la complejidad del menú. ¡Elige el que más te convenga!
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {budgetOptions.map(({ value, label, desc, range }) => {
          const active = data.budgetTier === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => { updateData({ budgetTier: value }); nextStep(); }}
              className={`flex flex-col items-start p-5 rounded-2xl border text-left transition-all duration-200 h-full ${
                active ? CARD_ACTIVE : CARD_IDLE
              }`}
            >
              <div className="flex w-full justify-between items-start mb-2">
                <span className={`font-semibold text-base ${active ? "text-accent" : "text-zinc-900"}`}>{label}</span>
                <RadioCircle active={active} />
              </div>
              <p className="text-xs text-zinc-500 mb-4 flex-1 leading-relaxed">{desc}</p>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors duration-200 ${
                active
                  ? "bg-accent/15 text-accent border-accent/30"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200"
              }`}>
                {range} por persona
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── StepBudgetMultiple ────────────────────────────────────────────────────────
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
              className={`flex flex-col items-start p-5 rounded-2xl border text-left transition-all duration-200 h-full ${
                active ? CARD_ACTIVE : CARD_IDLE
              }`}
            >
              <div className="flex w-full justify-between items-start mb-2">
                <span className={`font-semibold text-base ${active ? "text-accent" : "text-zinc-900"}`}>{label}</span>
                <RadioCircle active={active} />
              </div>
              <p className="text-xs text-zinc-500 mb-4 flex-1 leading-relaxed">{desc}</p>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border w-full text-center transition-colors duration-200 ${
                active
                  ? "bg-accent/15 text-accent border-accent/30"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200"
              }`}>
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

// ── StepDietarySimple ─────────────────────────────────────────────────────────
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
        <p className="text-center text-zinc-500 text-sm mb-2 leading-relaxed">
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
              className={`flex items-center justify-between px-5 h-16 rounded-xl border transition-all duration-200 ${CARD_IDLE}`}
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

  const notasRef = useRef<HTMLTextAreaElement>(null);

  const handleNotas = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateData({ dietaryOtras: e.target.value });
    if (notasRef.current) {
      notasRef.current.style.height = "auto";
      notasRef.current.style.height = notasRef.current.scrollHeight + "px";
    }
  };

  return (
    <div className="flex flex-col max-w-md mx-auto w-full">
      <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">
        Restricciones dietéticas
      </p>
      <div className="flex flex-wrap gap-2 mb-8">
        {RESTRICTION_OPTIONS.map(({ value, label }) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleRestriction(value)}
              className={[
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 select-none",
                active
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-transparent",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-zinc-100 mb-8" />

      <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">
        Preferencias y notas
      </p>
      <div className="relative mb-1">
        <textarea
          ref={notasRef}
          placeholder="Otras restricciones o preferencias culinarias..."
          value={data.dietaryOtras ?? ""}
          onChange={handleNotas}
          rows={3}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 pb-7 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 hover:border-zinc-300 transition-all duration-200 bg-white resize-none overflow-hidden leading-relaxed"
        />
        <span className="absolute bottom-3 right-3 text-[10px] text-zinc-400 tabular-nums pointer-events-none">
          {(data.dietaryOtras ?? "").length}
        </span>
      </div>
      <p className="text-[10px] text-zinc-400 mb-8">Opcional</p>

      <Button onClick={nextStep} size="lg" className={BTN_CONTINUE}>
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
      <p className="text-zinc-500 text-sm text-center mb-1 leading-relaxed">
        Ahora, sólo tienes que añadir tus datos de contacto y te enviaremos propuestas de menú
        personalizadas y gratuitas en menos de 20 minutos.
      </p>

      <div>
        <label className="block text-sm font-semibold text-zinc-800 mb-1.5">
          Nombre <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="John Doe"
          className="h-14 text-base border-zinc-200 rounded-xl focus:border-accent/50 transition-colors"
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
          className={`h-14 text-base rounded-xl transition-colors ${
            touched.email && !emailValid
              ? "border-red-400 focus:ring-red-400"
              : "border-zinc-200 focus:border-accent/50"
          }`}
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
          defaultCountryCode={data.location?.countryCode}
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
        className="w-auto mx-auto px-10 h-14 bg-accent text-zinc-900 font-bold text-base rounded-2xl mt-2 hover:bg-accent/90 hover:scale-[1.02] shadow-[0_8px_20px_rgba(224,159,62,0.2)] hover:shadow-[0_12px_28px_rgba(224,159,62,0.3)] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
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
        <a href="/terms" className="underline hover:text-zinc-600 transition-colors">Términos</a>{" "}
        y reconoces la{" "}
        <a href="/privacy" className="underline hover:text-zinc-600 transition-colors">Declaración de privacidad global</a>.
      </p>
    </div>
  );
}
