"use client";

import Link from "next/link";
import { useState } from "react";

// Enlaces de navegación agrupados. Todas las rutas están verificadas contra
// páginas/anchors reales del sitio — sin href="#" ni destinos muertos.
const navGroups = [
  {
    title: "Descubre",
    links: [
      { label: "La Experiencia", href: "/#experiencia" },
      { label: "Nuestros Chefs", href: "/#chefs" },
      { label: "Regala una Cena", href: "/wizard" },
    ],
  },
  {
    title: "La Empresa",
    links: [
      { label: "Sobre Nosotros", href: "/sobre-nosotros" },
      { label: "Sé un Chef en GetChef", href: "/chef-registration" },
      { label: "Preguntas Frecuentes", href: "/preguntas-frecuentes" },
      { label: "Contacto", href: "/#contacto" },
    ],
  },
] as const;

// Link de navegación con el motivo Deluxe: una línea ámbar que crece en hover.
function FooterLink({ href, label }: { href: string; label: string }) {
  const isInternal = href.startsWith("/");
  const className =
    "group/link inline-flex items-center gap-2.5 py-1 font-sans text-sm text-zinc-400 transition-colors hover:text-white";
  const inner = (
    <>
      <span
        aria-hidden="true"
        className="h-px w-0 bg-amber-500/80 transition-all duration-300 ease-out group-hover/link:w-4"
      />
      <span className="transition-transform duration-300 ease-out group-hover/link:translate-x-0.5">
        {label}
      </span>
    </>
  );
  return isInternal ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <a href={href} className={className}>
      {inner}
    </a>
  );
}

// Sección de navegación: en mobile es un acordeón (botón colapsable); en desktop
// (md+) el botón se desactiva y la lista queda siempre visible.
function NavSection({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] py-2 md:border-0 md:py-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3 md:pointer-events-none md:py-0 md:cursor-default"
      >
        <h4 className="font-serif text-base font-medium text-white md:mb-5 md:text-lg">
          {title}
        </h4>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-zinc-500 transition-transform duration-300 md:hidden ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <ul
        className={`flex-col gap-1 pb-3 md:flex md:pb-0 ${
          open ? "flex" : "hidden"
        }`}
      >
        {links.map((link) => (
          <li key={link.label}>
            <FooterLink href={link.href} label={link.label} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 text-zinc-400">
      {/* Franja CTA: última oportunidad de conversión, separada por una línea
          ámbar del contenido superior. */}
      <div className="border-t-2 border-amber-500/60 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="container mx-auto max-w-[1280px] px-6 py-12">
          <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <span className="mb-3 flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-400">
                <span className="h-px w-5 bg-amber-500/70" aria-hidden="true" />
                Una experiencia a medida
              </span>
              <h3 className="font-serif text-2xl font-medium leading-tight text-white md:text-3xl">
                ¿Listo para tu próxima experiencia?
              </h3>
              <p className="mt-2 font-sans text-sm text-zinc-400">
                Un chef privado a la altura de la ocasión, en tu propia mesa.
              </p>
            </div>
            <Link
              href="/wizard"
              className="group/cta inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-7 font-sans text-sm font-semibold text-zinc-950 shadow-lg shadow-accent/20 transition-all duration-300 hover:bg-accent/90 hover:shadow-accent/30 md:w-auto"
            >
              Reservar una experiencia
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="transition-transform duration-300 group-hover/cta:translate-x-1"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Zona principal: marca con peso visual alto + navegación y contacto
          con jerarquía secundaria. */}
      <div className="container mx-auto max-w-[1280px] px-6 py-14 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
          {/* Bloque de marca */}
          <div className="md:col-span-5">
            <Link
              href="/"
              className="group/brand inline-block font-serif text-4xl font-bold tracking-tight text-white"
            >
              GetChef
            </Link>
            <span
              aria-hidden="true"
              className="mt-3 block h-px w-10 bg-amber-500/70"
            />
            <p className="mt-5 max-w-sm font-sans text-sm leading-relaxed text-zinc-500">
              Conectando la élite culinaria con los paladares más exigentes.
            </p>
          </div>

          {/* Columnas de navegación */}
          {navGroups.map((group) => (
            <div key={group.title} className="md:col-span-2">
              <NavSection title={group.title} links={group.links} />
            </div>
          ))}

          {/* Contacto + redes */}
          <div className="border-b border-white/[0.06] py-4 md:col-span-3 md:border-0 md:py-0">
            <h4 className="mb-5 font-serif text-base font-medium text-white md:text-lg">
              ¿Hablamos?
            </h4>
            <a
              href="tel:+59899521989"
              className="block font-serif text-lg text-white transition-colors hover:text-accent"
            >
              +598 99 521 989
            </a>
            <a
              href="mailto:getchef.com@gmail.com"
              className="mt-1 block font-sans text-sm text-zinc-400 transition-colors hover:text-accent"
            >
              getchef.com@gmail.com
            </a>
            <div className="mt-6 flex gap-3">
              <a
                href="https://www.instagram.com/getchefcom/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GetChef en Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:text-accent"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@getChefchef"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GetChef en YouTube"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:text-accent"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Fila legal: discreta, bien diferenciada del resto. */}
      <div className="border-t border-white/[0.06]">
        <div className="container mx-auto flex max-w-[1280px] flex-col items-center gap-4 px-6 py-7 text-sm font-sans text-zinc-500 md:flex-row md:justify-between md:gap-0">
          <p>© {year} GetChef. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link href="/legal/terminos" className="transition-colors hover:text-white">
              Términos Legales
            </Link>
            <Link href="/legal/privacidad" className="transition-colors hover:text-white">
              Privacidad
            </Link>
            <Link href="/legal/cookies" className="transition-colors hover:text-white">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
