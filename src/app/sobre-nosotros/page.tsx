"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

gsap.registerPlugin(ScrollTrigger);

const values = [
  {
    title: "Cercanía",
    desc: "Tratamos cada evento como si fuera el nuestro. Detrás de cada solicitud hay una historia, y la escuchamos antes de cocinar nada.",
  },
  {
    title: "Excelencia",
    desc: "Curamos cada chef por su oficio. No hay atajos cuando se trata de lo que termina llegando a tu plato.",
  },
  {
    title: "Transparencia",
    desc: "Sin letra chica ni sorpresas. Precios claros y comunicación directa entre cliente y chef, de principio a fin.",
  },
  {
    title: "Pasión por el producto",
    desc: "Creemos en los ingredientes bien elegidos y en la cocina hecha con intención. El sabor empieza mucho antes del fuego.",
  },
];

export default function SobreNosotrosPage() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      gsap.set(".reveal", { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(".reveal", { opacity: 0, y: 28 });
      ScrollTrigger.batch(".reveal", {
        start: "top 88%",
        onEnter: (els) =>
          gsap.to(els, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: "power2.out",
            overwrite: true,
          }),
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={rootRef} className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <Header />

      {/* ① Apertura editorial */}
      <section className="pt-36 md:pt-48 pb-20 md:pb-28">
        <div className="container mx-auto px-6 max-w-[1280px]">
          <div className="max-w-4xl">
            <span className="reveal inline-block px-4 py-1 text-[10px] font-black tracking-[0.25em] uppercase text-accent border border-accent/25 rounded-full bg-accent/5 mb-7">
              Sobre nosotros
            </span>
            <h1 className="reveal font-serif text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight text-zinc-900 mb-8">
              Hacemos que la alta cocina
              <br className="hidden md:block" /> llegue a{" "}
              <span className="text-accent">tu mesa</span>.
            </h1>
            <p className="reveal font-sans text-lg md:text-xl text-zinc-500 leading-relaxed max-w-2xl">
              GetChef nació de una idea simple: que cualquier ocasión —una cena íntima, un
              cumpleaños, una celebración entre amigos— pueda convertirse en una experiencia
              gastronómica memorable, sin salir de casa.
            </p>
          </div>
        </div>
      </section>

      {/* ② Historia — manifiesto */}
      <section className="py-20 md:py-28 border-t border-zinc-100">
        <div className="container mx-auto px-6 max-w-[1280px]">
          <div className="mx-auto max-w-[58ch] flex flex-col gap-10">
            <p className="reveal font-sans text-lg md:text-xl text-zinc-600 leading-relaxed">
              Durante años, el talento de los mejores chefs estuvo encerrado entre las paredes de
              un restaurante. Nosotros creemos que la cocina cobra su verdadero sentido en el
              lugar donde ocurren los momentos importantes: tu propia mesa.
            </p>

            <blockquote className="reveal border-l-2 border-accent pl-6 md:pl-8">
              <p className="font-serif text-2xl md:text-3xl font-medium leading-snug text-zinc-900">
                No vendemos platos. Conectamos personas con quienes hacen de la cocina un arte.
              </p>
            </blockquote>

            <p className="reveal font-sans text-lg md:text-xl text-zinc-600 leading-relaxed">
              Por eso construimos un espacio donde clientes y chefs profesionales se encuentran de
              forma directa, transparente y humana. Cada chef de la plataforma es seleccionado por
              su oficio y su pasión por el producto; cada cliente, recibido como el anfitrión que
              merece lo mejor.
            </p>

            <p className="reveal font-sans text-lg md:text-xl text-zinc-600 leading-relaxed">
              Somos un equipo pequeño y obsesivo, convencido de que la buena comida une, celebra y
              deja recuerdos. Esa convicción guía cada decisión que tomamos.
            </p>
          </div>
        </div>
      </section>

      {/* ③ Misión / Visión */}
      <section className="py-20 md:py-28 bg-secondary/40 border-t border-zinc-100">
        <div className="container mx-auto px-6 max-w-[1280px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
            <div className="reveal border-l-2 border-accent pl-6 md:pl-8">
              <span className="block text-[11px] font-black tracking-[0.22em] uppercase text-accent mb-4">
                Misión
              </span>
              <p className="font-serif text-2xl md:text-3xl font-medium leading-snug text-zinc-900">
                Acercar la experiencia de un chef profesional a cualquier hogar, haciendo simple
                lo que antes parecía reservado para unos pocos.
              </p>
            </div>
            <div className="reveal border-l-2 border-accent pl-6 md:pl-8">
              <span className="block text-[11px] font-black tracking-[0.22em] uppercase text-accent mb-4">
                Visión
              </span>
              <p className="font-serif text-2xl md:text-3xl font-medium leading-snug text-zinc-900">
                Construir la comunidad de chefs a domicilio más confiable del mundo
                hispanohablante, donde cada mesa encuentre su mejor versión.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ④ Valores — índice editorial */}
      <section className="py-20 md:py-28 border-t border-zinc-100">
        <div className="container mx-auto px-6 max-w-[1280px]">
          <div className="max-w-2xl mb-14 md:mb-20">
            <span className="reveal inline-block px-4 py-1 text-[10px] font-black tracking-[0.25em] uppercase text-accent border border-accent/25 rounded-full bg-accent/5 mb-6">
              Lo que nos mueve
            </span>
            <h2 className="reveal font-serif text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900">
              Nuestros valores
            </h2>
          </div>

          <div className="flex flex-col">
            {values.map((v, i) => (
              <div
                key={v.title}
                className="reveal group grid grid-cols-1 md:grid-cols-[auto_1fr] gap-3 md:gap-12 py-8 md:py-10 border-t border-zinc-200"
              >
                <span className="font-sans text-sm font-black tracking-[0.2em] text-accent/70 md:pt-2">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="md:flex md:items-baseline md:gap-12">
                  <h3 className="font-serif text-2xl md:text-3xl font-medium text-zinc-900 mb-2 md:mb-0 md:w-1/3 md:flex-shrink-0">
                    {v.title}
                  </h3>
                  <p className="font-sans text-base md:text-lg text-zinc-500 leading-relaxed md:flex-1">
                    {v.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ Cierre / CTA */}
      <section className="py-24 md:py-36 bg-zinc-950 text-white border-t border-zinc-800">
        <div className="container mx-auto px-6 max-w-[1280px]">
          <div className="max-w-2xl mx-auto text-center flex flex-col items-center">
            <h2 className="reveal font-serif text-4xl md:text-6xl font-semibold leading-[1.08] tracking-tight mb-6">
              ¿Listo para vivir tu próxima experiencia?
            </h2>
            <p className="reveal font-sans text-lg text-zinc-400 leading-relaxed mb-10 max-w-xl">
              Contanos qué imaginás y dejá que los chefs hagan el resto.
            </p>
            <Link href="/wizard" className="reveal">
              <Button className="bg-accent text-white border-none h-12 px-8 text-base font-medium rounded-full shadow-lg shadow-green-400/20 hover:scale-105 hover:shadow-green-400/30 transition-all duration-200 group">
                Crear una solicitud
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
