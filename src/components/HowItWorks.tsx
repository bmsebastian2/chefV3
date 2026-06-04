"use client";

import { useEffect, useRef, Fragment } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PencilLine, MailOpen, MessageSquareText, CalendarCheck, UtensilsCrossed } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  { icon: PencilLine, title: "Personaliza tu solicitud", desc: "Elige fecha, preferencias y alergias." },
  { icon: MailOpen, title: "Recibe propuestas", desc: "Los chefs diseñarán menús a tu medida." },
  { icon: MessageSquareText, title: "Habla con los chefs", desc: "Ajusta los detalles en el chat." },
  { icon: CalendarCheck, title: "Reserva la experiencia", desc: "Confirma de forma segura." },
  { icon: UtensilsCrossed, title: "¡A disfrutar!", desc: "El chef compra, cocina y sirve." },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".step-number",
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
        }
      );
      gsap.fromTo(
        ".step-card",
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: "power2.out",
          delay: 0.2,
          scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
        }
      );
      gsap.fromTo(
        ".connector-line",
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

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
                  <div className="step-number opacity-0 text-xs font-black tracking-[0.2em] text-accent/60 font-sans">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="step-card opacity-0 w-[72px] h-[72px] rounded-full bg-zinc-50 border-2 border-zinc-100 flex items-center justify-center shadow-[0_0_0_6px_white] hover:border-accent/30 hover:bg-accent/5 transition-colors duration-300 group">
                    <step.icon
                      className="w-7 h-7 text-accent group-hover:scale-110 transition-transform duration-200"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 mx-3 h-px overflow-hidden">
                    <div
                      className="connector-line h-full origin-left"
                      style={{
                        background: "linear-gradient(to right, #E09F3E40, #E09F3E, #E09F3E40)",
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
              <div key={i} className="step-card opacity-0 text-center px-2">
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
            <div key={i} className="step-card opacity-0 flex gap-6 relative">
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
