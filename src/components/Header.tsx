"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "../components/auth/login-dialog";

export function Header() {
  return (
    <header >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-[1280px]">
        <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-foreground">
          GetChef.com
        </Link>
        <nav className="hidden md:flex gap-8 items-center">
          <Link href="#experiencia" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">La Experiencia</Link>
          <Link href="#chefs" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">Nuestros Chefs</Link>
          <Link href="#contacto" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">Contacto</Link>
        </nav>
        <div className="flex items-center gap-4">
          <LoginDialog />
           
          <Link href="/wizard">
            <Button className="bg-accent hover:bg-accent-200 text-white border-none h-8 px-4 text-base shadow-xl shadow-zinc-900/10 transition-all rounded-md">
                Empezar
            </Button>
          </Link>
        </div>
      </div>
     
    </header>
//     <header>
//   <LoginDialog />
// </header>
  );
}
 


