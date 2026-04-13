"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PencilLine, MailOpen, MessageSquareText, CalendarCheck, UtensilsCrossed } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  { icon: PencilLine, title: "Personaliza tu solicitud", desc: "Elige fecha, preferencias y alergias." },
  { icon: MailOpen, title: "Recibe propuestas", desc: "Los chefs diseñarán menús a tu medida." },
  { icon: MessageSquareText, title: "Habla con los chefs", desc: "Ajusta los detalles en el chat." },
  { icon: CalendarCheck, title: "Reserva la experiencia", desc: "Confirma de forma segura." },
  { icon: UtensilsCrossed, title: "¡A disfrutar!", desc: "El chef compra, cocina y sirve." }
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".step-card", 
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.8, 
          stagger: 0.1, 
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
          }
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="experiencia" ref={sectionRef} className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-[1280px]">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl font-semibold mb-4 text-zinc-900">¿Cómo Funciona?</h2>
          <p className="font-sans text-muted-foreground text-lg max-w-2xl mx-auto">
            Una experiencia fluida y sin fricciones de principio a fin, diseñada para que solo te preocupes por disfrutar.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="step-card opacity-0 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6 shadow-sm relative before:absolute before:-inset-2 before:bg-zinc-50/50 before:rounded-full before:-z-10">
                <step.icon className="w-6 h-6 text-accent" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-xl font-medium mb-2 text-zinc-900">{step.title}</h3>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
