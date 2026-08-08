"use client";

import { useState } from "react";
import { ChefCardCompact, ChefDetailDialog, type ChefCard } from "@/components/Chefs";

// Grid + modal de detalle para el directorio /chefs. A diferencia de la home,
// esta página existe para recorrer el catálogo completo (paginado por el
// servidor), así que no usa el carrusel — un grid denso de principio a fin.
export function ChefsBrowser({ chefs }: { chefs: ChefCard[] }) {
  const [selected, setSelected] = useState<ChefCard | null>(null);

  if (chefs.length === 0) {
    return (
      <p className="py-16 text-center font-sans text-sm text-zinc-500">
        No hay chefs disponibles en este momento.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {chefs.map((chef) => (
          <ChefCardCompact key={chef.id} chef={chef} onSelect={setSelected} />
        ))}
      </div>
      <ChefDetailDialog chef={selected} onClose={() => setSelected(null)} />
    </>
  );
}
