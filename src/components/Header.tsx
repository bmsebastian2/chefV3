"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, UtensilsCrossed, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "../components/auth/login-dialog";
import { InstallButton } from "@/components/InstallButton";

const navLinks = [
  { href: "#experiencia", label: "La Experiencia" },
  { href: "#chefs", label: "Nuestros Chefs" },
  { href: "#contacto", label: "Contacto" },
  { href: "/chef-registration", label: "Registro de Chef" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header>
      <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-[1280px]">
        <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-foreground">
          <UtensilsCrossed className="w-5 h-5 text-accent" />
          <span>GetChef</span><span className="text-muted-foreground text-lg font-medium">.com</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-8 items-center">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Login + Empezar — desktop only */}
          <div className="hidden md:flex items-center gap-3">
            <InstallButton />
            <LoginDialog />
            <Link href="/wizard">
              <Button className="bg-accent text-white border-none h-8 px-4 text-base shadow-xl shadow-zinc-900/10 transition-all duration-200 rounded-md hover:scale-105 hover:shadow-lg hover:shadow-accent/50">
                Empezar
              </Button>
            </Link>
          </div>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col p-8 gap-6 animate-in slide-in-from-right duration-300">
            <button
              type="button"
              className="self-end w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>

            <nav className="flex flex-col gap-5 mt-2">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-lg font-medium text-zinc-800 hover:text-accent transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3">
              <InstallButton className="justify-center py-2 border border-border rounded-lg hover:bg-secondary" />
              <LoginDialog />
              <Link href="/wizard" onClick={() => setOpen(false)}>
                <Button className="w-full bg-accent text-white border-none h-12 text-base rounded-md transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-accent/50">
                  Empezar
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
