"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="fixed top-0 w-full z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-[1280px]">
        <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Reserva Epicúrea
        </Link>
        <nav className="hidden md:flex gap-8 items-center">
          <Link href="#experiencia" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">La Experiencia</Link>
          <Link href="#chefs" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">Nuestros Chefs</Link>
          <Link href="#contacto" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">Contacto</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hidden md:inline-block">Acceder</Link>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-md shadow-sm">
            Empezar
          </Button>
        </div>
      </div>
    </header>
  );
}
