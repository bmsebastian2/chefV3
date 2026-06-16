"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, ArrowRight, HelpCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

type Faq = { q: string; a: string };
type FaqGroup = { category: string; items: Faq[] };

// Contenido editorial — ampliado a partir de las FAQs del checkout.
const FAQ_GROUPS: FaqGroup[] = [
  {
    category: "Sobre el servicio",
    items: [
      {
        q: "¿Qué es GetChef?",
        a: "GetChef es una plataforma que conecta a clientes con chefs privados para disfrutar de experiencias gastronómicas de alta cocina sin salir de casa. Vos contás qué necesitás y los chefs te proponen menús a tu medida.",
      },
      {
        q: "¿Cómo funciona?",
        a: "En cuatro pasos: (1) creás tu solicitud con fecha, ocasión y preferencias; (2) recibís propuestas de menú de distintos chefs; (3) charlás con ellos por chat para ajustar los detalles; y (4) reservás de forma segura. El día del evento, el chef compra los ingredientes, cocina y sirve en tu hogar.",
      },
      {
        q: "¿Qué incluye el servicio?",
        a: "El servicio incluye la preparación completa del menú por el chef en tu domicilio: la compra de los ingredientes, la cocina y la presentación de los platos. Los detalles específicos se acuerdan con cada chef en su propuesta.",
      },
      {
        q: "¿En qué zonas está disponible?",
        a: "Operamos con chefs activos en todo Nicaragua. Podés explorar el mapa de cobertura en la página de inicio para descubrir qué chefs cocinan cerca tuyo.",
      },
    ],
  },
  {
    category: "Reservas y propuestas",
    items: [
      {
        q: "¿Cómo solicito un chef?",
        a: "Hacé clic en «Reservar experiencia» o «Solicitar un chef» y completá el asistente con tu ocasión, ubicación, número de comensales y preferencias. No necesitás registrarte de antemano: creamos tu cuenta durante el proceso.",
      },
      {
        q: "¿Cuánto tardan en llegar las propuestas?",
        a: "Normalmente, en menos de 30 minutos nuestros chefs empiezan a enviarte propuestas de menú exclusivas para tu evento. Las recibís por correo y en tu panel de cliente.",
      },
      {
        q: "¿Puedo hablar con el chef antes de reservar?",
        a: "Sí. Cada propuesta incluye un chat directo con el chef, donde podés ajustar el menú, resolver dudas y coordinar los detalles antes de confirmar tu reserva.",
      },
      {
        q: "¿Puedo personalizar el menú o indicar alergias?",
        a: "Por supuesto. Durante la solicitud podés indicar restricciones alimentarias y preferencias culinarias, y el chef diseña cada plato en función de tu ocasión, tus gustos y las alergias de tus comensales.",
      },
    ],
  },
  {
    category: "Pagos y seguridad",
    items: [
      {
        q: "¿Cómo y cuándo pago?",
        a: "El pago se realiza de forma online al confirmar la reserva, a través de la plataforma. Recibirás una confirmación por email y el chef se pondrá en contacto para coordinar los detalles finales.",
      },
      {
        q: "¿Mi pago es seguro? ¿Cuál es la política de garantía?",
        a: "Sí. El pago está protegido: se procesa a través de un proveedor de pagos seguro y el chef solo cobra una vez que el servicio se completa satisfactoriamente.",
      },
      {
        q: "¿Puedo hacer cambios después de reservar?",
        a: "Podés cancelar gratuitamente dentro de las 24 horas posteriores a la reserva. Para cambios en el menú o en la fecha, contactá directamente al chef a través del chat de tu propuesta.",
      },
    ],
  },
  {
    category: "Para chefs",
    items: [
      {
        q: "¿Cómo me registro como chef?",
        a: "Desde «Registro de Chef» creás tu cuenta y completás tu perfil profesional: bio, fotos, ubicación, menús y platos. Una vez verificado tu perfil, empezás a recibir solicitudes de clientes en tu zona.",
      },
      {
        q: "¿Tiene algún costo registrarme?",
        a: "Crear tu perfil de chef en GetChef es gratuito. Vos mantenés el control de tus horarios, precios y estilo de cocina.",
      },
    ],
  },
];

function FaqItem({ q, a }: Faq) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start justify-between gap-4 py-5 text-left group"
      >
        <span className="font-sans text-base font-medium text-zinc-800 leading-snug transition-colors group-hover:text-accent">
          {q}
        </span>
        {open ? (
          <Minus className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        ) : (
          <Plus className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5 transition-colors group-hover:text-accent" />
        )}
      </button>
      {open && (
        <p className="pb-5 -mt-1 font-sans text-sm text-zinc-500 leading-relaxed max-w-[65ch]">
          {a}
        </p>
      )}
    </div>
  );
}

export default function PreguntasFrecuentesPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Header />

      <section className="container mx-auto px-6 max-w-[820px] pt-28 md:pt-36 pb-24 flex-1">
        {/* Encabezado */}
        <div className="mb-12 text-center">
          <span className="mb-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
            <span className="h-px w-5 bg-amber-500/70" aria-hidden="true" />
            <HelpCircle className="h-3.5 w-3.5" />
            Centro de ayuda
            <span className="h-px w-5 bg-amber-500/70" aria-hidden="true" />
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-zinc-900 tracking-tight mb-4">
            Preguntas frecuentes
          </h1>
          <p className="mx-auto max-w-xl font-sans text-lg font-light leading-relaxed text-zinc-500">
            Todo lo que necesitás saber sobre cómo funciona GetChef, los pagos y
            tu experiencia con chefs privados.
          </p>
        </div>

        {/* Grupos de preguntas */}
        <div className="flex flex-col gap-12">
          {FAQ_GROUPS.map((group) => (
            <div key={group.category}>
              <h2 className="mb-2 font-serif text-xl font-semibold text-zinc-900">
                {group.category}
              </h2>
              <div>
                {group.items.map((item) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA de contacto */}
        <div className="mt-16 rounded-2xl border border-zinc-200/80 bg-white p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <h2 className="font-serif text-2xl font-semibold text-zinc-900 mb-2">
            ¿No encontraste tu respuesta?
          </h2>
          <p className="font-sans text-zinc-500 mb-6 max-w-md mx-auto leading-relaxed">
            Escribinos y te respondemos a la brevedad. Estamos para ayudarte a
            organizar tu próxima experiencia.
          </p>
          <Link
            href="/#contacto"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all duration-200 hover:bg-green-600 hover:shadow-accent/30"
          >
            Contactanos
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
