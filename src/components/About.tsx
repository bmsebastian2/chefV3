"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export function About() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  // Reveal al entrar en viewport. Equivale al antiguo ScrollTrigger start "top 70%"
  // (el -30% inferior del rootMargin dispara cuando el top cruza el 70% de la pantalla),
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

  // Entrada (fade + slide) con stagger por índice. Solo anima opacity/transform
  // (compositadas) y respeta prefers-reduced-motion.
  const animCls = `transition-all duration-[800ms] ease-out motion-reduce:transition-none ${
    revealed ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-[30px]"
  }`;
  const animStyle = (i: number) => ({ transitionDelay: `${i * 200}ms` });

  return (
    <section ref={sectionRef} className="py-24 bg-zinc-950 text-white border-t border-zinc-800">
      <div className="container mx-auto px-6 max-w-[1280px]">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2">
            <h2 className={`font-serif text-4xl font-semibold mb-6 ${animCls}`} style={animStyle(0)}>El arte del servicio, redefinido.</h2>
            <p className={`font-sans text-zinc-400 text-lg mb-8 leading-relaxed ${animCls}`} style={animStyle(1)}>
              Nacimos con la convicción de que el talento de los chefs más excepcionales no debería permanecer escondido detrás de los muros de un restaurante tradicional. Creemos que la cocina debe brillar en el lugar donde se disfrutan las cenas más inolvidables: en tu propia mesa.
            </p>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${animCls}`} style={animStyle(2)}>
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
          <div className={`lg:w-1/2 w-full h-[500px] relative rounded-md overflow-hidden ${animCls}`} style={animStyle(3)}>
            <Image
              src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1200"
              alt="Cocina en acción"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover opacity-60 mix-blend-overlay hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900/80 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
