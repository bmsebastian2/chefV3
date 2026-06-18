"use client";

import { useEffect, useRef, useState, Fragment } from "react";
import { PencilLine, MailOpen, MessageSquareText, CalendarCheck, UtensilsCrossed } from "lucide-react";

const steps = [
  { icon: PencilLine, title: "Personaliza tu solicitud", desc: "Elige fecha, preferencias y alergias." },
  { icon: MailOpen, title: "Recibe propuestas", desc: "Los chefs diseñarán menús a tu medida." },
  { icon: MessageSquareText, title: "Habla con los chefs", desc: "Ajusta los detalles en el chat." },
  { icon: CalendarCheck, title: "Reserva la experiencia", desc: "Confirma de forma segura." },
  { icon: UtensilsCrossed, title: "¡A disfrutar!", desc: "El chef compra, cocina y sirve." },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  // Reveal al entrar en viewport (equivale al ScrollTrigger start "top 70%"),
  // sin el forced reflow de ScrollTrigger ni el peso de GSAP.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -30% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Animaciones de entrada (solo opacity/transform → compositadas, sin reflow).
  // Respetan prefers-reduced-motion: con motion-reduce el contenido aparece directo.
  // step-number: y:-20, dur 0.6, stagger 0.12
  const numberCls = `transition-all duration-[600ms] ease-out motion-reduce:transition-none ${
    revealed ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:-translate-y-5"
  }`;
  // step-card: y:32, dur 0.7, delay 0.2, stagger 0.12
  const cardCls = `transition-all duration-700 ease-out motion-reduce:transition-none ${
    revealed ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-8"
  }`;
  // connector-line: scaleX 0→1, dur 1.2
  const connectorCls = `origin-left transition-transform duration-[1200ms] ease-out motion-reduce:transition-none ${
    revealed ? "scale-x-100" : "motion-safe:scale-x-0"
  }`;
  const numberStyle = (i: number) => ({ transitionDelay: `${i * 120}ms` });
  const cardStyle = (i: number) => ({ transitionDelay: `${200 + i * 120}ms` });

  return (
    <section id="experiencia" ref={sectionRef} className="py-28 bg-white">
      <div className="container mx-auto px-6 max-w-[1280px]">
        {/* Header */}
        <div className="text-center mb-20">
          <span className="inline-block px-4 py-1 text-[10px] font-black tracking-[0.25em] uppercase text-accent border border-accent/25 rounded-full bg-accent/5 mb-5">
            El proceso
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-semibold text-zinc-900 mb-4">
            ¿Cómo Funciona?
          </h2>
          <p className="font-sans text-zinc-500 text-lg max-w-xl mx-auto leading-relaxed">
            Una experiencia sin fricciones de principio a fin, diseñada para que solo te preocupes por disfrutar.
          </p>
        </div>

        {/* Desktop: icon row with connectors, then text below */}
        <div className="hidden md:block">
          {/* Icon + connector row */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, i) => (
              <Fragment key={i}>
                <div className="flex flex-col items-center gap-3 flex-shrink-0">
                  <div className={`text-xs font-black tracking-[0.2em] text-accent/60 font-sans ${numberCls}`} style={numberStyle(i)}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className={`w-[72px] h-[72px] rounded-full bg-zinc-50 border-2 border-zinc-100 flex items-center justify-center shadow-[0_0_0_6px_white] hover:border-accent/30 hover:bg-accent/5 transition-colors duration-300 group ${cardCls}`} style={cardStyle(i)}>
                    <step.icon
                      className="w-7 h-7 text-accent group-hover:scale-110 transition-transform duration-200"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 mx-3 h-px overflow-hidden">
                    <div
                      className={`h-full ${connectorCls}`}
                      style={{
                        background: "linear-gradient(to right, #22c55e40, #22c55e, #22c55e40)",
                      }}
                    />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {/* Text labels row */}
          <div className="grid grid-cols-5 gap-6">
            {steps.map((step, i) => (
              <div key={i} className={`text-center px-2 ${cardCls}`} style={cardStyle(i)}>
                <h3 className="font-serif text-lg font-medium text-zinc-900 mb-2 leading-snug">
                  {step.title}
                </h3>
                <p className="font-sans text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical list */}
        <div className="md:hidden flex flex-col gap-0">
          {steps.map((step, i) => (
            <div key={i} className={`flex gap-6 relative ${cardCls}`} style={cardStyle(i)}>
              {/* Vertical connector */}
              {i < steps.length - 1 && (
                <div className="absolute left-[35px] top-[72px] bottom-0 w-px bg-gradient-to-b from-zinc-200 to-transparent" />
              )}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="text-[10px] font-black tracking-widest text-accent/60 mb-2">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="w-[52px] h-[52px] rounded-full bg-zinc-50 border-2 border-zinc-100 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-accent" strokeWidth={1.5} />
                </div>
              </div>
              <div className="pb-10 pt-5">
                <h3 className="font-serif text-xl font-medium text-zinc-900 mb-1">{step.title}</h3>
                <p className="font-sans text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
