"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import Link from "next/link";


export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vectorRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current || !vectorRef.current) return;
    
    const ctx = gsap.context(() => {
      // 1. Text Animation
      gsap.fromTo(
        ".hero-text",
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: "power3.out" }
      );

      // 2. Vector Reveal Animations
      gsap.fromTo(".v-circle-bg", 
        { scale: 0, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 1.5, ease: "power3.out", delay: 0.2 }
      );
      
      gsap.fromTo(".v-plate-shadow", 
        { scale: 0, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 1, ease: "power2.out", delay: 0.5 }
      );
      
      gsap.fromTo(".v-plate", 
        { y: 50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 1, ease: "back.out(1.2)", delay: 0.6 }
      );

      gsap.fromTo(".v-cloche", 
        { y: -100, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 1.2, ease: "bounce.out", delay: 0.8 }
      );

      gsap.fromTo(".v-star", 
        { scale: 0, opacity: 0, rotation: -90 }, 
        { scale: 1, opacity: 1, rotation: 0, duration: 0.8, stagger: 0.2, ease: "back.out(1.7)", delay: 1.2 }
      );

      // 3. Continuous Floating Animations
      gsap.to(".v-floating", {
        y: -15,
        duration: 3,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true
      });

      gsap.to(".v-star-float", {
        y: -10,
        rotation: 15,
        duration: 4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.5
      });

      gsap.to(".v-steam", {
        y: -25,
        opacity: 0,
        scale: 1.2,
        duration: 2.5,
        ease: "power1.inOut",
        stagger: 0.4,
        repeat: -1
      });

    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-[90vh] flex items-center pt-24  bg-[#FAFAFA]">
      <div className="container mx-auto px-6 max-w-[1280px]">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          {/* Left Column: Text */}
          <div className="w-full lg:w-5/12 flex flex-col justify-center text-left z-10">
            <div className="inline-block mb-6 hero-text opacity-0">
              <span className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-accent border border-accent/30 rounded-full bg-accent/5">
                Alta Cocina Privada
              </span>
            </div>
            <h1 className="hero-text opacity-0 font-serif text-5xl md:text-6xl lg:text-[4.2rem] font-semibold text-zinc-900 tracking-tight mb-6 leading-[1.05]">
              Transforma tu comedor en el restaurante más exclusivo
            </h1>
            <p className="hero-text opacity-0 font-sans text-xl text-zinc-600 mb-10 max-w-lg font-light leading-relaxed">
              Disfruta de una experiencia gastronómica a medida en la intimidad de tu hogar. 
              Nuestros chefs de élite se encargan de todo: desde la compra, hasta el servicio en mesa.
            </p>
            <div className="hero-text opacity-0 flex flex-col sm:flex-row gap-4">
              <Link href="/wizard">
                <Button size="lg" className="bg-accent hover:bg-accent-200 text-white border-none h-8 px-4 text-base shadow-xl shadow-zinc-900/10 transition-all rounded-md">
                  Empezar
                </Button>
              </Link>
             
              
              <Link href="#chefs">
                <Button size="lg" variant="outline" className="h-8 px-4 text-base bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm rounded-md transition-all">
                  Ver Nuestros Chefs
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Modern Animated Vector */}
          <div className="w-full lg:w-7/12 flex justify-end items-center h-[600px] relative">
            <svg ref={vectorRef} viewBox="0 0 600 600" className="w-full max-w-[650px] h-auto drop-shadow-2xl">
              
              {/* Decorative Abstract Background Circles */}
              <circle cx="300" cy="300" r="220" fill="#f4f4f5" className="v-circle-bg opacity-0" />
              <circle cx="300" cy="300" r="280" fill="none" stroke="#E09F3E" strokeWidth="1" strokeDasharray="8 12" className="v-circle-bg opacity-0" style={{animation: "spin 30s linear infinite"}} />
              
              {/* The "Plate" Base */}
              <ellipse cx="300" cy="420" rx="160" ry="30" fill="#e4e4e7" className="v-plate-shadow opacity-0" />
              <ellipse cx="300" cy="410" rx="140" ry="25" fill="#ffffff" className="v-plate opacity-0" />
              
              <g className="v-floating">
                {/* The Cloche (Campana) */}
                <path d="M160 380 Q300 120 440 380" fill="none" stroke="#18181B" strokeWidth="12" className="v-cloche opacity-0" strokeLinecap="round" />
                <path d="M140 380 L460 380" stroke="#18181B" strokeWidth="12" className="v-cloche opacity-0" strokeLinecap="round" />
                <circle cx="300" cy="220" r="20" fill="#E09F3E" className="v-cloche opacity-0" />
                
                {/* Elegant Steam / Aromas */}
                <path d="M260 360 Q240 300 270 260" fill="none" stroke="#E09F3E" strokeWidth="4" strokeLinecap="round" className="v-steam opacity-0" />
                <path d="M300 380 Q320 320 290 280" fill="none" stroke="#18181B" strokeWidth="4" strokeLinecap="round" className="v-steam opacity-0" />
                <path d="M340 360 Q330 290 350 250" fill="none" stroke="#E09F3E" strokeWidth="4" strokeLinecap="round" className="v-steam opacity-0" />
              </g>

              {/* Minimalist Graphic Stars / Sparks */}
              <g className="v-star-float">
                <path d="M460 200 L470 160 L480 200 L520 210 L480 220 L470 260 L460 220 L420 210 Z" fill="#E09F3E" className="v-star opacity-0" />
                <path d="M120 180 L125 150 L130 180 L160 185 L130 190 L125 220 L120 190 L90 185 Z" fill="#18181B" className="v-star opacity-0" />
                <path d="M180 120 L183 100 L186 120 L206 123 L186 126 L183 146 L180 126 L160 123 Z" fill="#E09F3E" className="v-star opacity-0" />
              </g>

              <style>
                {`
                  @keyframes spin {
                    from { transform: rotate(0deg); transform-origin: 300px 300px; }
                    to { transform: rotate(360deg); transform-origin: 300px 300px; }
                  }
                `}
              </style>
            </svg>
          </div>

        </div>
      </div>
    </section>
  );
}
