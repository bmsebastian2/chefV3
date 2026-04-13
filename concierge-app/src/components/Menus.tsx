"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const menuItems = [
  { name: "Tataki de Atún Rojo", desc: "Ajo blanco de coco y migas crujientes", img: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&q=80&w=800" },
  { name: "Lomo de Ciervo", desc: "Salsa de frutos rojos y setas salteadas", img: "https://images.unsplash.com/photo-1544025162-811cfff36b0c?auto=format&fit=crop&q=80&w=800" },
  { name: "Milhoja Caramelizada", desc: "Foie de pato, manzana verde y cebolla confitada", img: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&q=80&w=800" },
  { name: "Torrija de Pan Brioche", desc: "Crema inglesa y su helado", img: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=800" }
];

export function Menus() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".menu-item", 
        { opacity: 0, scale: 0.95 },
        { 
          opacity: 1, 
          scale: 1, 
          duration: 0.8, 
          stagger: 0.1, 
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 60%",
          }
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-white">
      <div className="container mx-auto px-6 max-w-[1280px]">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl font-semibold mb-4 text-zinc-900">Cada ocasión requiere un menú diferente</h2>
          <p className="font-sans text-muted-foreground text-lg max-w-2xl mx-auto">
            Explora las texturas y sabores diseñados por nuestros chefs, u opta por un menú creado completamente a medida para tus invitados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {menuItems.map((item, idx) => (
            <div key={idx} className="menu-item opacity-0 group relative h-80 rounded-md overflow-hidden cursor-pointer">
              <img src={item.img} alt={item.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 p-6 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="font-serif text-xl font-medium text-white mb-1">{item.name}</h3>
                <p className="font-sans text-sm text-zinc-300 line-clamp-2">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/wizard">
            <Button size="lg" className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-md shadow-md h-12 px-8">
              Personalizar Menú
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
