import { createAdminClient } from "@/utils/supabase/admin";
import type { ChefCard } from "@/components/Chefs";

export const FEATURED_CHEFS_LIMIT = 8;
export const CHEFS_PAGE_SIZE = 24;

// Fila cruda del query (chef_profiles + join a users).
type ChefProfileRow = {
  id: string;
  tagline: string | null;
  city: string | null;
  country: string | null;
  experience_years: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_pro: boolean | null;
  users: {
    first_name: string | null;
    first_surname: string | null;
    second_surname: string | null;
    avatar_url: string | null;
  } | null;
};

const CHEF_CARD_SELECT = `
  id,
  tagline,
  city,
  country,
  experience_years,
  rating_avg,
  rating_count,
  is_pro,
  users:user_id ( first_name, first_surname, second_surname, avatar_url )
`;

type AdminClient = ReturnType<typeof createAdminClient>;

// La foto de perfil vive en chef_photos (tabla aparte). Si esa lectura falla
// (hoy le falta el GRANT a service_role), degradamos a avatar_url / placeholder
// sin romper el listado. Cuando se otorgue el permiso, las fotos aparecen solas.
async function rowsToChefCards(admin: AdminClient, rows: ChefProfileRow[]): Promise<ChefCard[]> {
  const photoByChef = new Map<string, string>();
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    const { data: photos } = await admin
      .from("chef_photos")
      .select("chef_id, url, type")
      .in("chef_id", ids)
      .eq("type", "profile");
    for (const p of photos ?? []) photoByChef.set(p.chef_id, p.url);
  }

  return rows.map((row) => {
    const u = row.users;
    const name =
      [u?.first_name, u?.first_surname, u?.second_surname]
        .filter(Boolean)
        .join(" ")
        .trim() || "Chef";

    return {
      id: row.id,
      name,
      tagline: row.tagline,
      city: row.city,
      country: row.country,
      experienceYears: row.experience_years,
      isPro: !!row.is_pro,
      imageUrl: photoByChef.get(row.id) ?? u?.avatar_url ?? null,
      // count = reseñas reales (chef_profiles.rating_count, mantenido por trigger).
      // Si es 0, RatingLine ignora rating_avg y muestra "Chef nuevo".
      rating: { average: Number(row.rating_avg ?? 0), count: row.rating_count ?? 0 },
    };
  });
}

// Service-role: la lectura pública de chef_profiles está bloqueada por RLS
// (solo el dueño ve su perfil). Corre solo en servidor, selecciona únicamente
// campos públicos — nunca email/phone.
export async function getFeaturedChefs(limit: number = FEATURED_CHEFS_LIMIT): Promise<ChefCard[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chef_profiles")
    .select(CHEF_CARD_SELECT)
    .eq("is_active", true)
    .eq("admin_blocked", false)
    .order("is_pro", { ascending: false })
    .order("rating_avg", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return rowsToChefCards(admin, data as unknown as ChefProfileRow[]);
}

// Página del directorio /chefs. Pide pageSize+1 filas para saber si hay
// siguiente página sin pagar el costo de un COUNT(*) aparte.
export async function getChefsPage(
  page: number,
  pageSize: number = CHEFS_PAGE_SIZE
): Promise<{ chefs: ChefCard[]; hasNextPage: boolean }> {
  const admin = createAdminClient();
  const offset = (page - 1) * pageSize;
  const { data, error } = await admin
    .from("chef_profiles")
    .select(CHEF_CARD_SELECT)
    .eq("is_active", true)
    .eq("admin_blocked", false)
    .order("is_pro", { ascending: false })
    .order("rating_avg", { ascending: false })
    .range(offset, offset + pageSize);

  if (error || !data) return { chefs: [], hasNextPage: false };
  const rows = data as unknown as ChefProfileRow[];
  const hasNextPage = rows.length > pageSize;
  const chefs = await rowsToChefCards(admin, rows.slice(0, pageSize));
  return { chefs, hasNextPage };
}
