"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FileText } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const legalPages = [
  { href: "/legal/terminos", label: "Términos y Condiciones" },
  { href: "/legal/privacidad", label: "Política de Privacidad" },
  { href: "/legal/cookies", label: "Política de Cookies" },
];

type Heading = { id: string; text: string };

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState("");
  const [tocOpen, setTocOpen] = useState(false);

  // Reconstruir el índice cada vez que cambia la página legal
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-legal-content] h2[id]");
    setHeadings(Array.from(nodes).map((n) => ({ id: n.id, text: n.textContent ?? "" })));
    setActiveId("");
    setTocOpen(false);
  }, [pathname]);

  // Scrollspy: resalta la sección visible
  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-120px 0px -70% 0px" }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  const PageNav = () => (
    <nav className="flex flex-col gap-1">
      <span className="px-3 mb-2 text-[10px] font-black tracking-[0.22em] uppercase text-zinc-400">
        Documentos legales
      </span>
      {legalPages.map((p) => {
        const active = pathname === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            onClick={() => setTocOpen(false)}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-accent/10 text-accent font-medium"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </nav>
  );

  const Toc = () =>
    headings.length > 0 ? (
      <div className="mt-8 border-t border-zinc-200 pt-6">
        <span className="px-3 mb-2 block text-[10px] font-black tracking-[0.22em] uppercase text-zinc-400">
          En esta página
        </span>
        <ul className="flex flex-col gap-0.5">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={() => setTocOpen(false)}
                className={`block rounded-lg border-l-2 px-3 py-1.5 text-sm leading-snug transition-colors ${
                  activeId === h.id
                    ? "border-accent text-accent font-medium"
                    : "border-transparent text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="container mx-auto px-6 max-w-[1180px] pt-28 md:pt-36 pb-24 flex-1">
        <div className="lg:grid lg:grid-cols-[270px_1fr] lg:gap-16">
          {/* Sidebar — desktop sticky */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <PageNav />
              <Toc />
            </div>
          </aside>

          {/* Sidebar — mobile colapsable */}
          <div className="lg:hidden mb-10">
            <button
              type="button"
              onClick={() => setTocOpen((v) => !v)}
              aria-expanded={tocOpen}
              className="w-full flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" strokeWidth={1.5} />
                Documentos e índice
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${tocOpen ? "rotate-180" : ""}`}
              />
            </button>
            {tocOpen && (
              <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <PageNav />
                <Toc />
              </div>
            )}
          </div>

          {/* Contenido del documento */}
          <article
            data-legal-content
            className="min-w-0 max-w-[70ch] font-sans text-foreground"
          >
            {children}
          </article>
        </div>
      </div>

      <Footer />
    </main>
  );
}
