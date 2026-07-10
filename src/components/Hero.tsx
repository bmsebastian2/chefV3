import ReactDOM from "react-dom";
import Link from "next/link";
import { ChefHat, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroVideo } from "@/components/HeroVideo";

// Posiciones de los chefs en el radar (en %)
const chefPins = [
  { top: "30%", left: "34%", delay: "0s" },
  { top: "24%", left: "64%", delay: ".5s" },
  { top: "62%", left: "28%", delay: "1s" },
  { top: "66%", left: "60%", delay: ".7s" },
  { top: "46%", left: "80%", delay: "1.3s" },
];

// Banner gastronómico con video — comunica el servicio de chef/comida.
// Se renderiza en dos posiciones: arriba en móvil (primera pantalla) y en la
// columna derecha en desktop; `videoWhen` limita en cuál instancia corre el video.
function HeroVideoCard({ className, videoWhen }: { className: string; videoWhen: string }) {
  return (
    <Link
      href="/asistente"
      className={`hero-anim group relative block overflow-hidden rounded-2xl shadow-lg shadow-zinc-900/10 ring-1 ring-black/5 transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-900/15 hover:ring-amber-300/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
      style={{ animationDelay: "560ms" }}
    >
      <div className="relative h-56 w-full sm:h-72">
        <HeroVideo when={videoWhen} />
        {/* Velado para legibilidad del texto — se aclara un punto al hover (la señal cobra vida) */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-900/90 via-zinc-900/45 to-transparent transition-opacity duration-500 group-hover:opacity-85" />

        {/* Visor de cámara — encuadra la toma en vivo al pasar el cursor */}
        <div
          className="pointer-events-none absolute inset-3 z-10 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 motion-reduce:transition-none"
          aria-hidden="true"
        >
          <span className="absolute left-0 top-0 h-6 w-6 -translate-x-1.5 -translate-y-1.5 rounded-tl-md border-l-2 border-t-2 border-amber-300/90 transition-transform duration-500 ease-out group-hover:translate-x-0 group-hover:translate-y-0 motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0" />
          <span className="absolute right-0 top-0 h-6 w-6 translate-x-1.5 -translate-y-1.5 rounded-tr-md border-r-2 border-t-2 border-amber-300/90 transition-transform duration-500 ease-out group-hover:translate-x-0 group-hover:translate-y-0 motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0" />
          <span className="absolute bottom-0 left-0 h-6 w-6 -translate-x-1.5 translate-y-1.5 rounded-bl-md border-b-2 border-l-2 border-amber-300/90 transition-transform duration-500 ease-out group-hover:translate-x-0 group-hover:translate-y-0 motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0" />
          <span className="absolute bottom-0 right-0 h-6 w-6 translate-x-1.5 translate-y-1.5 rounded-br-md border-b-2 border-r-2 border-amber-300/90 transition-transform duration-500 ease-out group-hover:translate-x-0 group-hover:translate-y-0 motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0" />
        </div>

        {/* Contenido */}
        <div className="absolute inset-0 flex flex-col justify-center gap-1.5 p-5">
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300">
            <ChefHat className="h-3.5 w-3.5" />
            Catering & cenas privadas
          </span>
          
          <h2 className="font-serif text-xl font-semibold leading-tight text-white sm:text-2xl">
            Comida de chef, en tu mesa
            
          </h2>
          <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90">
            Reserva experiencia
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Hero() {
  // El poster del <video> de abajo es el candidato a LCP, pero el preload scanner
  // del navegador no lo descubre mirando el HTML (tiene que parsear el <video>
  // primero). Lo precargamos explícito con prioridad alta para que la imagen LCP
  // sea descubrible de inmediato y no quede detrás en la cola de descargas.
  ReactDOM.preload("/banner-chef.webp", { as: "image", fetchPriority: "high" });

  return (
    <section className="relative overflow-hidden bg-[#FAFAFA]">
      {/* Animaciones CSS puras del hero (respetan prefers-reduced-motion) */}
      <style>{`
        @keyframes heroFade {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes radarSweep { to { transform: rotate(360deg); } }
        @keyframes radarPing {
          0%        { transform: scale(.5); opacity: .7; }
          70%, 100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes heroCaret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .hero-anim { opacity: 0; animation: heroFade .7s cubic-bezier(.22,.61,.36,1) both; }
        .hero-caret { animation: heroCaret 1.1s step-end infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-anim { animation: none; opacity: 1; transform: none; }
          .radar-sweep, .chef-pin > span, .hero-caret { animation: none !important; }
        }
      `}</style>

      {/* Subtle grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />

      {/* Warm glows */}
      <div className="pointer-events-none absolute -left-40 top-10 h-[480px] w-[480px] rounded-full bg-amber-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-green-100/30 blur-3xl" />

      <div className="container mx-auto max-w-[1280px] px-6 relative z-10">
        <div className="grid grid-cols-1 items-stretch gap-12 pt-28 pb-14 lg:grid-cols-2 lg:gap-14">

          {/* ── Texto (columna izquierda, alineado arriba) ── */}
          <div className="flex flex-col justify-start">

            {/* Eyebrow */}
            <div className="hero-anim flex items-center justify-center sm:justify-start gap-3 mb-4" style={{ animationDelay: "0ms" }}>
              <span className="h-px w-10 bg-amber-500/70" aria-hidden="true" />
              <svg
                viewBox="0 0 21 14"
                className="w-[18px] h-3 rounded-[2px] flex-shrink-0"
                aria-label="Bandera de Nicaragua"
              >
                <rect width="21" height="4.67" y="0" fill="#3E6EB4" />
                <rect width="21" height="4.66" y="4.67" fill="#FFFFFF" />
                <rect width="21" height="4.67" y="9.33" fill="#3E6EB4" />
              </svg>
              <span className="text-[11px] font-semibold tracking-[0.28em] uppercase text-amber-700">
                Chefs privados en tu hogar
                
              </span>
              
            </div>

            {/* Titular display */}
            <h1
              className="hero-anim font-serif text-5xl md:text-6xl lg:text-[4rem] font-semibold text-zinc-900 tracking-tight mb-6 leading-[1.05] text-center sm:text-left"
              style={{ animationDelay: "120ms" }}
            >
              
              Alta cocina.
              <br />
              Donde tú estés.
               
            </h1>

            {/* Subtítulo */}
            <p
              className="hero-anim font-sans text-base md:text-lg text-zinc-500 mb-8 max-w-md font-light leading-relaxed text-center sm:text-left mx-auto sm:mx-0"
              style={{ animationDelay: "240ms" }}
            >
              Disfruta experiencias gastronómicas únicas con chefs de élite, sin
              salir de casa.
            </p>

            {/* CTAs */}
            <div
              className="hero-anim flex flex-col sm:flex-row gap-4 items-stretch sm:items-center"
              style={{ animationDelay: "360ms" }}
            >
              <Link href="/asistente" className="w-fit mx-auto sm:mx-0 sm:w-auto">
                <Button
                  size="lg"
                  className="group/cta relative w-auto overflow-hidden rounded-full border-none bg-accent text-white h-12 px-8 text-base font-medium shadow-xl shadow-green-500/25 ring-1 ring-inset ring-white/10 transform-gpu transition-all duration-300 ease-out hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-green-500/40"
                >
                  {/* Brillo superior — acabado pulido y tactil */}
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent"
                    aria-hidden="true"
                  />
                  {/* Sheen diagonal — destello de pulido que cruza el pill al hover */}
                  <span
                    className="pointer-events-none absolute inset-0 -translate-x-[120%] -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transform-gpu will-change-transform transition-transform duration-700 ease-out group-hover/cta:translate-x-[120%]"
                    aria-hidden="true"
                  />
                  <span className="relative z-10 flex items-center">
                    Solicitar un chef
                    {/* Cloche de servicio — la tapa se levanta y revela un destello al hover */}
                    <span className="relative ml-2.5 inline-flex h-6 w-6 items-center justify-center">
                      <svg
                        className="absolute left-1/2 top-0 size-3 -translate-x-1/2 translate-y-1 text-amber-200 opacity-0 transform-gpu transition-all duration-300 ease-out group-hover/cta:-translate-y-0.5 group-hover/cta:opacity-100"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 2l1.4 4L17 7.4l-3.6 1.4L12 13l-1.4-4.2L7 7.4l3.6-1.4z" />
                      </svg>
                      <svg
                        className="relative size-[22px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M4 19h16" />
                        <g className="transform-gpu will-change-transform transition-transform duration-300 ease-out group-hover/cta:-translate-y-[3px]">
                          <path d="M5 19a7 7 0 0 1 14 0" />
                          <path d="M12 9v3" />
                          <circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none" />
                        </g>
                      </svg>
                    </span>
                  </span>
                </Button>
              </Link>
              <Link
                href="#chefs"
                className="group/ghost inline-flex items-center justify-center sm:justify-start gap-2 h-12 px-2 text-sm font-semibold text-amber-700 transition-colors hover:text-amber-800"
              >
                <span className="border-b border-amber-500/40 group-hover/ghost:border-amber-700 transition-colors">
                  Ver nuestros chefs
                </span>
                <span className="transition-transform duration-200 group-hover/ghost:translate-x-1">→</span>
              </Link>
            </div>

            {/* Banner gastronómico — en móvil sube aquí para verse en la primera pantalla */}
            <HeroVideoCard className="mt-8 lg:hidden" videoWhen="(max-width: 1023px)" />

            {/* ── Sellos de confianza ── */}
            <ul
              className="hero-anim mt-10 grid grid-cols-1 divide-y divide-zinc-100 border-t border-zinc-100 pt-7 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:divide-zinc-200/60"
              style={{ animationDelay: "480ms" }}
            >
              <li className="py-1.5 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0">
                <details className="group/seal">
                  <summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-300/60 [&::-webkit-details-marker]:hidden">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-sm shadow-amber-900/[0.04] ring-1 ring-amber-200/70 transition-colors duration-300 group-hover/seal:ring-amber-300">
                      <svg className="h-[18px] w-[18px] text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7 21h10M8 21V11M16 21V11" />
                        <path d="M6 11a4 4 0 0 1-1-7.9A4.5 4.5 0 0 1 12 2a4.5 4.5 0 0 1 7 1.1A4 4 0 0 1 18 11Z" />
                      </svg>
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block text-[13px] font-medium text-zinc-800">Chefs seleccionados</span>
                      <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-zinc-400">
                        Verificados uno a uno
                        <svg className="h-3 w-3 flex-shrink-0 text-zinc-300 transition-transform duration-300 group-open/seal:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </span>
                  </summary>
                  <p className="pl-[3.25rem] pr-1 pb-2 text-[12px] leading-relaxed text-zinc-500">
                    Validamos identidad, experiencia y referencias de cada chef antes de aceptarlo.
                  </p>
                </details>
              </li>
              <li className="py-1.5 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0">
                <details className="group/seal">
                  <summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-300/60 [&::-webkit-details-marker]:hidden">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-sm shadow-amber-900/[0.04] ring-1 ring-amber-200/70 transition-colors duration-300 group-hover/seal:ring-amber-300">
                      <svg className="h-[18px] w-[18px] text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3l1.9 5.2L19 9.2l-4 3.6 1.2 5.4L12 15.5 7.8 18.2 9 12.8 5 9.2l5.1-1Z" />
                      </svg>
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block text-[13px] font-medium text-zinc-800">Experiencias personalizadas</span>
                      <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-zinc-400">
                        Hechas a tu medida
                        <svg className="h-3 w-3 flex-shrink-0 text-zinc-300 transition-transform duration-300 group-open/seal:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </span>
                  </summary>
                  <p className="pl-[3.25rem] pr-1 pb-2 text-[12px] leading-relaxed text-zinc-500">
                    Acordás menú, tiempos y detalles del servicio según tu evento y tus gustos.
                  </p>
                </details>
              </li>
              <li className="py-1.5 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0">
                <details className="group/seal">
                  <summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-300/60 [&::-webkit-details-marker]:hidden">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-sm shadow-amber-900/[0.04] ring-1 ring-amber-200/70 transition-colors duration-300 group-hover/seal:ring-amber-300">
                      <svg className="h-[18px] w-[18px] text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block text-[13px] font-medium text-zinc-800">Reserva segura</span>
                      <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-zinc-400">
                        Simple y protegida
                        <svg className="h-3 w-3 flex-shrink-0 text-zinc-300 transition-transform duration-300 group-open/seal:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </span>
                  </summary>
                  <p className="pl-[3.25rem] pr-1 pb-2 text-[12px] leading-relaxed text-zinc-500">
                    Reservás en minutos y tu pago queda protegido hasta confirmar el servicio.
                  </p>
                </details>
              </li>
            </ul>

          
          </div>

          {/* ── Columna derecha: mapa arriba + experiencias debajo ── */}
          <div className="flex flex-col gap-8">

            {/* Banner gastronómico — solo desktop; en móvil sube junto al título */}
            <HeroVideoCard className="hidden lg:block mt-10" videoWhen="(min-width: 1024px)" />
            <a
              href="#asistente"
              className="hero-anim group relative block w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/70 px-5 py-4 shadow-lg shadow-zinc-900/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xl hover:shadow-green-500/10"
              style={{ animationDelay: "560ms" }}
            >
              {/* Destello al hover */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent/10 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-full" />

              <div className="relative flex items-center gap-4">
                {/* Avatar con chispa de IA */}
                <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/12 ring-1 ring-accent/25">
                  <ChefHat className="h-5 w-5 text-accent" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow ring-1 ring-amber-200">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                  </span>
                </span>

                {/* Texto */}
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-700">
                    Asistente inteligente
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
                  </span>
                  <p className="mt-0.5 font-serif text-lg leading-tight text-zinc-900">
                    Encontremos tu chef ideal
                    <span className="hero-caret ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-accent align-middle" aria-hidden="true" />
                  </p>
                  <span className="text-xs text-zinc-500">4 preguntas · sin formularios</span>
                </div>

                {/* Flecha */}
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-all duration-300 group-hover:bg-accent">
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </a>
            <div
              className="hero-anim rounded-3xl border border-zinc-200/80 bg-white/70 p-6 shadow-xl shadow-zinc-900/5 backdrop-blur-xl"
              style={{ animationDelay: "300ms" }}
            >
              {/* Encabezado */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                    <span className="h-px w-5 bg-amber-500/70" aria-hidden="true" />
                    Cerca tuyo
                  </span>
                  <h2 className="font-serif text-xl md:text-2xl font-semibold text-zinc-900 tracking-tight">
                    Descubre chefs cerca de ti
                  </h2>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                  Activos
                </span>
              </div>

              {/* Ubicación */}
              <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700">
                <MapPin className="h-4 w-4 text-amber-600" />
                Managua, Nicaragua
              </span>

              {/* Radar */}
              <div className="relative mt-5 h-52 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-amber-50/70 via-white to-zinc-50 shadow-inner lg:h-[210px]">
                {/* Anillos concéntricos */}
                <svg
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  width="340" height="340" viewBox="0 0 340 340" fill="none" aria-hidden="true"
                >
                  {[44, 88, 132, 168].map((r) => (
                    <circle key={r} cx="170" cy="170" r={r} stroke="#e4e4e7" strokeWidth="1" />
                  ))}
                  <line x1="170" y1="2" x2="170" y2="338" stroke="#f4f4f5" strokeWidth="1" />
                  <line x1="2" y1="170" x2="338" y2="170" stroke="#f4f4f5" strokeWidth="1" />
                </svg>

                {/* Barrido giratorio */}
                <div
                  className="radar-sweep pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg, rgba(217,119,6,0) 0deg, rgba(217,119,6,0.18) 55deg, rgba(217,119,6,0) 95deg)",
                    animation: "radarSweep 6s linear infinite",
                  }}
                />

                {/* Glow central */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/40 blur-2xl" />

                {/* Pines de chef */}
                {chefPins.map((p, i) => (
                  <div
                    key={i}
                    className="chef-pin absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ top: p.top, left: p.left }}
                  >
                    <span
                      className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/40"
                      style={{ animation: `radarPing 2.8s ease-out ${p.delay} infinite` }}
                    />
                    <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/80 bg-white shadow-[0_4px_12px_rgba(217,119,6,0.25)]">
                      <ChefHat className="h-3.5 w-3.5 text-amber-600" />
                    </span>
                  </div>
                ))}

                {/* Marcador central (tú) */}
                <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-xl ring-2 ring-amber-500/50">
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600">
                    <ChefHat className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Pie: stat + CTA */}
              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-500">Chefs verificados en tu zona</p>
                <Link
                  href="#mapa"
                  className="group inline-flex w-fit items-center gap-2 rounded-full border border-zinc-300 bg-transparent px-5 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
                >
                  Ver mapa completo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
                 <div className="flex flex-1 items-center pt-8">
            
            </div>
          
          </div>
        </div>
      </div>
    </section>
  );
}
