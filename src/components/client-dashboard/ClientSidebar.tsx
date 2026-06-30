"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, HelpCircle, Settings, ChevronDown, Menu, X } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { LogoutButton } from "@/components/auth/LogoutButton";

export function ClientSidebar() {
  const pathname = usePathname();
  const [supportOpen, setSupportOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarInner = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-zinc-100">
        <Link href="/" className="font-serif text-xl font-bold text-zinc-900">
          GetChef.com
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <Link
          href="/client-dashboard"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname === "/client-dashboard"
              ? "bg-accent/10 text-accent"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          }`}
        >
          <ShoppingBag className="w-4 h-4 flex-shrink-0" />
          Mis compras
        </Link>

        {/* Soporte */}
        <div>
          <button
            type="button"
            onClick={() => setSupportOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            <HelpCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Soporte</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${supportOpen ? "rotate-180" : ""}`} />
          </button>
          {supportOpen && (
            <div className="ml-7 mt-1 space-y-0.5">
              <Link
                href="/preguntas-frecuentes"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                Centro de ayuda
              </Link>
              <Link
                href="/#contacto"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                Contactanos
              </Link>
            </div>
          )}
        </div>

        {/* Configuración */}
        <Link
          href="/client-dashboard/configuracion"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname.startsWith("/client-dashboard/configuracion")
              ? "bg-accent/10 text-accent"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          }`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Configuración
        </Link>
      </nav>

      {/* Footer: Cerrar sesión */}
      <div className="px-4 pb-6 border-t border-zinc-100 pt-3">
        <form action={logout}>
          <LogoutButton className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" />
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        className="fixed top-4 right-4 z-50 md:hidden w-11 h-11 bg-white shadow-md rounded-full flex items-center justify-center"
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`fixed top-0 right-0 z-50 h-full w-64 bg-white shadow-xl md:hidden transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}>
        {sidebarInner}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200 fixed top-0 left-0 h-full z-30">
        {sidebarInner}
      </aside>
    </>
  );
}
