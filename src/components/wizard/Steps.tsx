"use client";

import { useState, useEffect } from "react";
import { StepProps } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function StepServiceType({ data, updateData, nextStep }: StepProps) {
  const options = [
    { title: "Experiencia Culinaria Única", desc: "Un chef exclusivo para una comida o cena especial de un día." },
    { title: "Varios Servicios", desc: "Un chef disponible para múltiples comidas durante unas vacaciones o evento continuo." },
    { title: "Comidas Semanales", desc: "Un chef que prepara tus comidas cada semana." }
  ];

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
      <p className="text-zinc-500 mb-2 text-center font-sans">
        Define tu evento para ver chefs, menús y precios. ¡Te llevará <strong className="text-accent">menos de 2 minutos</strong>!
      </p>
      {options.map((opt) => (
        <button
          key={opt.title}
          type="button"
          onClick={() => { updateData({ serviceType: opt.title }); nextStep(); }}
          className={`flex flex-col items-start p-6 rounded-md border text-left transition-all ${data.serviceType === opt.title ? 'border-accent bg-accent/5' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}
        >
          <span className={`font-semibold text-lg mb-1 ${data.serviceType === opt.title ? 'text-accent' : 'text-zinc-900'}`}>{opt.title}</span>
          <span className="text-sm text-zinc-500 font-sans">{opt.desc}</span>
        </button>
      ))}
    </div>
  );
}
export function StepOccasion({ data, updateData, nextStep }: StepProps) {
  const options = ["Cena entre amigos", "Aniversario", "Cumpleaños", "Comida de negocios", "Familiar", "Otro"];
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


export function StepGuests({ data, updateData, nextStep }: StepProps) {
  const options = [2, 4, 6, 8, 10, 15];
  return (
    <div className="flex flex-col gap-8 items-center max-w-md mx-auto w-full">
      <div className="grid grid-cols-3 gap-4 w-full">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => { updateData({ guests: opt }); nextStep(); }}
            className={`h-14 rounded-md border text-lg transition-colors ${data.guests === opt ? 'border-accent bg-accent/5 text-accent' : 'border-zinc-200 hover:border-zinc-300 text-zinc-900'}`}
          >
            {opt}
          </button>
        ))}
      </div>
      <p className="text-sm text-zinc-500 text-center leading-relaxed">
        La tarifa del chef es fija e incluye compra, preparación y servicio de mesa. <br /> El precio por persona varía según el tamaño del grupo.
      </p>
    </div>
  );
}

export function StepDate({ data, updateData, nextStep }: StepProps) {
  return (
    <div className="flex flex-col gap-6 items-center max-w-md mx-auto w-full">
      <Popover>
        <PopoverTrigger className={`inline-flex items-center w-full h-14 justify-start rounded-md border text-left font-normal border-zinc-200 px-4 text-sm hover:bg-zinc-50 transition-colors ${!data.date && "text-muted-foreground"}`}>
          <CalendarIcon className="mr-3 h-5 w-5 text-zinc-400" />
          {data.date ? format(data.date, "PPP", { locale: es }) : <span className="text-base">Elige una fecha</span>}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar mode="single" selected={data.date} onSelect={(date) => updateData({ date })} initialFocus />
        </PopoverContent>
      </Popover>

      <Input
        type="time"
        value={data.time || ""}
        onChange={(e) => updateData({ time: e.target.value })}
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
    let current = data.dietaryRestrictions || [];
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

export function StepContact({ data, updateData, nextStep }: StepProps) {
  const isValid = data.contact?.name && data.contact?.email && data.contact?.phone;
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
      <Button disabled={!isValid} onClick={nextStep} size="lg" className="w-full h-14 bg-accent text-zinc-900 font-bold text-lg rounded-md mt-4 hover:bg-accent/90 shadow-[0_8px_20px_rgb(224,159,62,0.2)] transition-all">
        Ver Menús y Chefs Recomendados
      </Button>
      <p className="text-xs text-zinc-400 mt-2 text-center max-w-xs">
        Al continuar, aceptas nuestros Términos Legales y Política de Privacidad de Reserva Epicúrea.
      </p>
    </div>
  );
}
