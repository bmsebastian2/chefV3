"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star, ArrowRight } from "lucide-react";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

const chefs = [
  {
    name: "Chef Javier Aranda",
    rating: 4.9,
    reviews: 120,
    specialty: "Cocina de Autor",
    img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=600&grayscale=true",
  },
  {
    name: "Chef Elena Arzak",
    rating: 5.0,
    reviews: 340,
    specialty: "Alta Cocina Vasca",
    img: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=600&grayscale=true",
  },
  {
    name: "Chef Diego Guerrero",
    rating: 4.8,
    reviews: 95,
    specialty: "Cocina Creativa",
    img: "https://images.unsplash.com/photo-1581349485608-9469926a8e5e?auto=format&fit=crop&q=80&w=600&grayscale=true",
  },
];

export function Chefs() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".chef-card",
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.18,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="chefs" ref={sectionRef} className="py-28 bg-zinc-950 relative overflow-hidden">
      {/* Subtle background texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #22c55e 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-6 max-w-[1280px] relative z-10">
        {/* Section header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl">
            <span className="inline-block px-4 py-1 text-[10px] font-black tracking-[0.25em] uppercase text-accent border border-accent/25 rounded-full bg-accent/10 mb-5">
              Nuestros Chefs
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-white mb-4 leading-tight">
              Los mejores chefs.{" "}
              <span className="text-accent">En tu cocina.</span>
            </h2>
            <p className="font-sans text-zinc-400 text-lg leading-relaxed">
              De restaurantes con estrellas Michelin a la comodidad de tu hogar.
            </p>
          </div>
          <button className="text-sm font-medium text-zinc-400 hover:text-accent transition-colors duration-200 flex items-center gap-2 group whitespace-nowrap bg-transparent border-none p-0 cursor-pointer">
            Ver todos los chefs
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {chefs.map((chef, idx) => (
            <div
              key={idx}
              className="chef-card opacity-0 group relative rounded-2xl overflow-hidden h-[480px] cursor-pointer"
            >
              {/* Image */}
              <Image
                src={chef.img}
                alt={chef.name}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
              />

              {/* Specialty badge — top left */}
              <div className="absolute top-4 left-4 z-10">
                <span className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase bg-accent text-zinc-900 rounded-full">
                  {chef.specialty}
                </span>
              </div>

              {/* Gradient overlay — always visible from bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-7 z-10">
                {/* Rating */}
                <div className="flex items-center gap-1.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.round(chef.rating)
                          ? "fill-accent text-accent"
                          : "text-zinc-600"
                      }`}
                    />
                  ))}
                  <span className="text-zinc-300 text-xs font-medium ml-1">
                    {chef.rating} · {chef.reviews} reseñas
                  </span>
                </div>

                <h3 className="font-serif text-2xl font-medium text-white mb-4 leading-tight">
                  {chef.name}
                </h3>

                {/* CTA — slides up on hover */}
                <div className="overflow-hidden h-10">
                  <button className="flex items-center gap-2 text-sm font-medium text-white bg-accent/20 hover:bg-accent border border-accent/40 hover:border-accent px-4 py-2 rounded-full transition-all duration-300 translate-y-10 group-hover:translate-y-0 cursor-pointer">
                    Ver perfil
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
