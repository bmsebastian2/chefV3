"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, UtensilsCrossed, X, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "../components/auth/login-dialog";
import { InstallButton } from "@/components/InstallButton";
import { createClient } from "@/utils/supabase/clients";

const navLinks = [
  { href: "/#chefs", label: "Nuestros Chefs" },
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
  { href: "/#contacto", label: "Contacto" },
  { href: "/chef-registration", label: "Registro de Chef" },
];

// Enlace real (<a href>) en vez de window.location.assign: hace una navegación
// de verdad que corre middleware + layout en el server y no puede "fallar en
// silencio". `panelHref` ya es el destino directo del rol, así que no depende de
// ningún redirect intermedio.
function PanelButton({ panelHref, onClick }: { panelHref: string; onClick?: () => void }) {
  return (
    <a href={panelHref} onClick={onClick} className="contents">
      <Button
        className="bg-accent text-white border-none rounded-full gap-2 hover:scale-105 transition-transform"
      >
        <LayoutDashboard className="w-4 h-4" />
        Mi panel
      </Button>
    </a>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // null = aún sin chequear; true/false = estado de sesión real.
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  // Destino del panel según rol (admin / chef / client).
  const [panelHref, setPanelHref] = useState("/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Detectar sesión activa en el browser: la landing es estática (ISR) y no sabe
  // si hay login. Si hay sesión, mostramos "Mi panel" en vez del login y
  // resolvemos el destino directo según el rol (el usuario puede leer su propio
  // rol por RLS).
  useEffect(() => {
    const supabase = createClient();

    const resolve = async (userId: string | undefined) => {
      if (!userId) { setLoggedIn(false); setPanelHref("/"); return; }
      setLoggedIn(true);
      const { data: u } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();
      const role = u?.role;
      setPanelHref(
        role === "admin" ? "/admin"
        : role === "chef" ? "/dashboard"
        : "/client-dashboard"
      );
    };

    supabase.auth.getUser().then(({ data }) => resolve(data.user?.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      // NO llamar queries de supabase dentro del callback: deadlockea el auth
      // client y deja el rol sin resolver (panelHref se queda en "/"). Lo diferimos
      // para que el callback libere el lock antes de que corra resolve().
      const id = session?.user?.id;
      setTimeout(() => resolve(id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <>
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(0,0,0,0.07)]"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-[1280px]">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-serif text-2xl font-bold tracking-tight text-zinc-900 group"
        >
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors duration-300">
            <UtensilsCrossed className="w-4 h-4 text-accent" />
          </div>
          <span>GetChef</span>
          <span className="text-zinc-400 text-base font-normal">.com</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-8 items-center">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors duration-200 relative after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-accent after:transition-all after:duration-300 hover:after:w-full"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTA group */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            <InstallButton />
            {loggedIn ? <PanelButton panelHref={panelHref} /> : <LoginDialog />}
          </div>

          {/* Hamburger */}
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

    </header>

      {/* Mobile drawer — fuera del <header> para evitar stacking context incorrecto */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col p-8 gap-6">
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
              {loggedIn ? <PanelButton panelHref={panelHref} onClick={() => setOpen(false)} /> : <LoginDialog />}
              <Link href="/wizard" onClick={() => setOpen(false)}>
                <Button className="w-full bg-accent text-white border-none h-12 text-base rounded-full transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-accent/50">
                  Reservar experiencia
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
