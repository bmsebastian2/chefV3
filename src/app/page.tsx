import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SaboresEnCasa } from "@/components/SaboresEnCasa";
import { ChefAssistant } from "@/components/assistant/ChefAssistant";
import { HowItWorks } from "@/components/HowItWorks";
import { MenuDeLaNoche } from "@/components/MenuDeLaNoche";
import { Chefs, type ChefCard } from "@/components/Chefs";
import { createAdminClient } from "@/utils/supabase/admin";
import { NicaraguaChefMapSection } from "@/components/maps/NicaraguaChefMapSection";
import { Menus } from "@/components/Menus";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

// La landing es estática con revalidación (ISR): se genera una vez y se sirve
// desde caché casi instantáneo, en vez de esperar a Supabase en cada request.
// Los chefs destacados se refrescan cada 5 min (o bajo demanda vía revalidatePath('/')).
export const revalidate = 300;

// Fila cruda del query (chef_profiles + join a users).
type ChefProfileRow = {
  id: string;
  tagline: string | null;
  city: string | null;
  country: string | null;
  experience_years: number | null;
  rating_avg: number | null;
  is_pro: boolean | null;
  users: {
    first_name: string | null;
    first_surname: string | null;
    second_surname: string | null;
    avatar_url: string | null;
  } | null;
};

// Service-role: la lectura pública de chef_profiles está bloqueada por RLS
// (solo el dueño ve su perfil). Corre solo en servidor, selecciona únicamente
// campos públicos — nunca email/phone.
async function getFeaturedChefs(): Promise<ChefCard[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chef_profiles")
    .select(
      `
      id,
      tagline,
      city,
      country,
      experience_years,
      rating_avg,
      is_pro,
      users:user_id ( first_name, first_surname, second_surname, avatar_url )
    `
    )
    .eq("is_active", true)
    .order("is_pro", { ascending: false })
    .order("rating_avg", { ascending: false })
    .limit(3);

  if (error || !data) return [];
  const rows = data as unknown as ChefProfileRow[];

  // La foto de perfil vive en chef_photos (tabla aparte). Si esa lectura falla
  // (hoy le falta el GRANT a service_role), degradamos a avatar_url / placeholder
  // sin romper la sección. Cuando se otorgue el permiso, las fotos aparecen solas.
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
      // count = 0 hasta que exista la tabla de reviews; solo cambia la fuente aquí.
      rating: { average: Number(row.rating_avg ?? 0), count: 0 },
    };
  });
}

export default async function Home() {
  const chefs = await getFeaturedChefs();

  return (
    <main className="flex min-h-screen flex-col bg-background selection:bg-accent selection:text-zinc-900 overflow-x-hidden">
      <Header />
      <Hero />
      <SaboresEnCasa />
      <ChefAssistant />
      <HowItWorks />
      <MenuDeLaNoche />
      <Chefs chefs={chefs} />
      <NicaraguaChefMapSection />
      <Menus />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}
