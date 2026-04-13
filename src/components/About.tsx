"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function About() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".about-text", 
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.8, 
          stagger: 0.2, 
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
    <section ref={sectionRef} className="py-24 bg-zinc-950 text-white border-t border-zinc-800">
      <div className="container mx-auto px-6 max-w-[1280px]">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2">
            <h2 className="about-text font-serif text-4xl font-semibold mb-6">El arte del servicio, redefinido.</h2>
            <p className="about-text font-sans text-zinc-400 text-lg mb-8 leading-relaxed">
              Nacimos con la convicción de que el talento de los chefs más excepcionales no debería permanecer escondido detrás de los muros de un restaurante tradicional. Creemos que la cocina debe brillar en el lugar donde se disfrutan las cenas más inolvidables: en tu propia mesa.
            </p>
            <div className="about-text grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-serif text-xl font-medium text-accent mb-2">Gastronomía</h3>
                <p className="font-sans text-sm text-zinc-400 leading-relaxed">Una comunidad curada categóricamente por la excelencia y la pasión por el producto.</p>
              </div>
              <div>
                <h3 className="font-serif text-xl font-medium text-accent mb-2">Servicio</h3>
                <p className="font-sans text-sm text-zinc-400 leading-relaxed">Transformamos a los chefs en anfitriones, elevando cada detalle a su máxima expresión.</p>
              </div>
            </div>
          </div>
          <div className="lg:w-1/2 w-full h-[500px] relative rounded-md overflow-hidden about-text">
            <img 
              src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1200" 
              alt="Cocina en acción" 
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900/80 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
