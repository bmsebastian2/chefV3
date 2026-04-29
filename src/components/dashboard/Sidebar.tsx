"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, User, UtensilsCrossed,
  Settings, LogOut, ChevronDown, Menu, X, ClipboardList, SlidersHorizontal,
} from "lucide-react";
import { logout } from "@/app/auth/actions";

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/requests", label: "Solicitudes", icon: ClipboardList },
  {
    label: "Perfil",
    icon: User,
    children: [
      { href: "/dashboard/perfil", label: "Perfil Profesional" },
      { href: "/dashboard/fotos", label: "Fotos" },
      { href: "/dashboard/ubicacion", label: "Ubicación" },
    ],
  },
  {
    label: "Propuesta Gastronómica",
    icon: UtensilsCrossed,
    children: [
      { href: "/dashboard/menus", label: "Menús" },
    ],
  },
  { href: "/dashboard/request-settings", label: "Config. Solicitudes", icon: SlidersHorizontal },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

function NavItems({
  openSections,
  toggle,
  pathname,
  onNavigate,
}: {
  openSections: string[];
  toggle: (label: string) => void;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
      {NAV.map((item) => {
        if ("href" in item && item.href) {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        }

        const open = openSections.includes(item.label);
        const childActive =
          "children" in item && item.children
            ? item.children.some((c) => pathname === c.href)
            : false;

        return (
          <div key={item.label}>
            <button
              type="button"
              onClick={() => toggle(item.label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                childActive
                  ? "text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && "children" in item && item.children && (
              <div className="ml-7 mt-1 space-y-0.5">
                {item.children.map((child) => {
                  const active = pathname === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? "text-accent font-medium bg-accent/5"
                          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<string[]>(["Perfil"]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = (label: string) =>
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );

  const sharedProps = {
    openSections,
    toggle,
    pathname,
    onNavigate: () => setMobileOpen(false),
  };

  const sidebarInner = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-zinc-100">
        <Link href="/" className="font-serif text-xl font-bold text-foreground">
          GetChef.com
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">Panel del Chef</p>
      </div>

      <NavItems {...sharedProps} />

      {/* User + logout */}
      <div className="px-4 pb-6 border-t border-zinc-100 pt-4">
        <div className="px-3 pb-3">
          <p className="text-sm font-medium text-zinc-900 truncate">{userName}</p>
          <p className="text-xs text-muted-foreground">Chef</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
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
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center"
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
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl md:hidden transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarInner}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200 fixed top-0 left-0 h-full z-30">
        {sidebarInner}
      </aside>
    </>
  );
}
