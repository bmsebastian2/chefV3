"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

gsap.registerPlugin(ScrollTrigger);

const chefs = [
  { name: "Chef Javier Aranda", rating: 4.9, reviews: 120, img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=600&grayscale=true" },
  { name: "Chef Elena Arzak", rating: 5.0, reviews: 340, img: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=600&grayscale=true" },
  { name: "Chef Diego Guerrero", rating: 4.8, reviews: 95, img: "https://images.unsplash.com/photo-1581349485608-9469926a8e5e?auto=format&fit=crop&q=80&w=600&grayscale=true" },
];

export function Chefs() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".chef-card", 
        { opacity: 0, y: 40 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.8, 
          stagger: 0.15, 
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          }
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="chefs" ref={sectionRef} className="py-24 bg-zinc-50 relative">
      <div className="container mx-auto px-6 max-w-[1280px]">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl font-semibold mb-4 text-zinc-900">Los mejores chefs. En tu cocina.</h2>
            <p className="font-sans text-muted-foreground text-lg">
              De restaurantes con estrellas Michelin a la comodidad de tu hogar. 
              Accede a la élite culinaria y conoce la mente maestra detrás de cada menú.
            </p>
          </div>
          <button className="text-accent font-medium hover:underline font-sans cursor-pointer whitespace-nowrap bg-transparent border-none p-0">Ver todos los chefs →</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {chefs.map((chef, idx) => (
            <Card key={idx} className="chef-card opacity-0 overflow-hidden border-none shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] bg-white hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] transition-shadow duration-300 rounded-md">
              <div className="h-80 w-full overflow-hidden">
                <img 
                  src={chef.img} 
                  alt={chef.name} 
                  className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-700 hover:scale-105"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="font-serif text-2xl font-medium text-zinc-900 mb-2">{chef.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 fill-accent text-accent" />
                  <span className="font-sans font-medium text-zinc-900">{chef.rating}</span>
                  <span className="font-sans text-muted-foreground text-sm">({chef.reviews} reseñas)</span>
                </div>
                <p className="font-sans text-sm text-zinc-600 line-clamp-2 leading-relaxed">
                  Especializado en cocina de autor y técnicas de vanguardia utilizando el producto de temporada como bandera.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
