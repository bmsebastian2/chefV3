"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

type AnchorLinkProps = Omit<LinkProps, "href"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    children: ReactNode;
  };

// El App Router de Next solo scrollea a un hash "upon navigation" — una
// transición real de ruta. Si ya estás en la página destino y clickeás un
// <Link href="#id"> (o "/ruta#id"), no hay nueva RSC payload que buscar, así
// que Next nunca dispara el scrollIntoView (la URL cambia, pero nada se mueve).
// Acá interceptamos ese caso puntual: si ya estamos en la ruta destino,
// scrolleamos a mano; si no, dejamos que Link navegue normal (ahí sí es una
// navegación real y el scroll-to-hash nativo de Next funciona).
export function AnchorLink({ href, onClick, children, ...props }: AnchorLinkProps) {
  const pathname = usePathname();
  const hashIndex = href.indexOf("#");

  if (hashIndex === -1) {
    return (
      <Link href={href} onClick={onClick} {...props}>
        {children}
      </Link>
    );
  }

  const targetPath = href.slice(0, hashIndex) || "/";
  const id = href.slice(hashIndex + 1);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || pathname !== targetPath) return;

    const el = document.getElementById(id);
    if (!el) return;

    e.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    history.pushState(null, "", href);
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
