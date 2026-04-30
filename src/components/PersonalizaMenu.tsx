"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function PersonalizaMenu() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".pm-photo",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
          },
        }
      );
      gsap.fromTo(
        ".pm-card",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-zinc-100 overflow-hidden py-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="relative pb-44 md:pb-56">

          {/* Collage de fotos */}
          <div className="flex gap-2 md:gap-4 items-start">
            <div className="pm-photo opacity-0 flex-1 mt-14 md:mt-20 rounded-2xl overflow-hidden aspect-[3/4]">
              <Image
                src="/Lomito.png"
                alt="Plato de chef"
                width={400}
                height={533}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="pm-photo opacity-0 flex-1 rounded-2xl overflow-hidden aspect-[3/4]">
              <Image
                src="/tataki de atun rojo.png"
                alt="Tataki de atún rojo"
                width={400}
                height={533}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="pm-photo opacity-0 hidden sm:block flex-1 mt-8 md:mt-10 rounded-2xl overflow-hidden aspect-[3/4]">
              <Image
                src="/milhoja.png"
                alt="Milhoja"
                width={400}
                height={533}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="pm-photo opacity-0 hidden md:block flex-1 mt-16 rounded-2xl overflow-hidden aspect-[3/4]">
              <Image
                src="/pan brioche.png"
                alt="Pan brioche"
                width={400}
                height={533}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Tarjeta amarilla */}
          <div className="pm-card opacity-0 absolute bottom-0 left-1/2 -translate-x-1/2 w-[88%] sm:w-[60%] md:w-[44%] bg-accent rounded-2xl px-8 py-10 text-center shadow-lg">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-zinc-900 mb-4">
              Personaliza tu menú
            </h2>
            <p className="text-zinc-800 text-sm leading-relaxed mb-7">
              Una cena romántica, una reunión familiar o una celebración entre amigos, platos
              tradicionales que todos conocemos o sabores exóticos. Invitados vegetarianos,
              intolerantes o alérgicos. ¡Cada experiencia es única!
            </p>
            <Link
              href="/wizard"
              className="inline-block bg-white text-zinc-900 font-medium text-sm px-8 py-3 rounded-full hover:bg-zinc-100 transition-colors"
            >
              Personalizar Menú
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
