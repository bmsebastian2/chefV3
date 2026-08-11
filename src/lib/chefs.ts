import { createAdminClient } from "@/utils/supabase/admin";
import type { ChefCard } from "@/components/Chefs";

export const FEATURED_CHEFS_LIMIT = 8;
export const CHEFS_PAGE_SIZE = 24;

// Fila cruda de la RPC get_public_chef_cards (ver MIGRATION_public_listing_qualification.sql).
// La RPC ya filtra por is_active + admin_blocked + email confirmado + foto de
// perfil + galería/menús/platos mínimos (vista qualified_chef_profiles) —
// acá solo mapeamos al shape de ChefCard.
type ChefCardRow = {
  id: string;
  name: string | null;
  tagline: string | null;
  city: string | null;
  country: string | null;
  experience_years: number | null;
  is_pro: boolean | null;
  image_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
};

function rowToChefCard(row: ChefCardRow): ChefCard {
  return {
    id: row.id,
    name: row.name || "Chef",
    tagline: row.tagline,
    city: row.city,
    country: row.country,
    experienceYears: row.experience_years,
    isPro: !!row.is_pro,
    imageUrl: row.image_url,
    // count = reseñas reales (chef_profiles.rating_count, mantenido por trigger).
    // Si es 0, RatingLine ignora rating_avg y muestra "Chef nuevo".
    rating: { average: Number(row.rating_avg ?? 0), count: row.rating_count ?? 0 },
  };
}

export async function getFeaturedChefs(limit: number = FEATURED_CHEFS_LIMIT): Promise<ChefCard[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_public_chef_cards", {
    p_limit: limit,
    p_offset: 0,
  });

  if (error || !data) return [];
  return (data as ChefCardRow[]).map(rowToChefCard);
}

// Página del directorio /chefs. Pide pageSize+1 filas para saber si hay
// siguiente página sin pagar el costo de un COUNT(*) aparte.
export async function getChefsPage(
  page: number,
  pageSize: number = CHEFS_PAGE_SIZE
): Promise<{ chefs: ChefCard[]; hasNextPage: boolean }> {
  const admin = createAdminClient();
  const offset = (page - 1) * pageSize;
  const { data, error } = await admin.rpc("get_public_chef_cards", {
    p_limit: pageSize + 1,
    p_offset: offset,
  });

  if (error || !data) return { chefs: [], hasNextPage: false };
  const rows = data as ChefCardRow[];
  const hasNextPage = rows.length > pageSize;
  const chefs = rows.slice(0, pageSize).map(rowToChefCard);
  return { chefs, hasNextPage };
}
