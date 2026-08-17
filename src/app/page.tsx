import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SaboresEnCasa } from "@/components/SaboresEnCasa";
import { AssistantEntry } from "@/components/assistant/AssistantEntry";
import { HowItWorks } from "@/components/HowItWorks";
import { MenuDeLaNoche } from "@/components/MenuDeLaNoche";
import { Chefs } from "@/components/Chefs";
import { getFeaturedChefs } from "@/lib/chefs";
import { NicaraguaChefMapSection } from "@/components/maps/NicaraguaChefMapSection";
import { Menus } from "@/components/Menus";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

// La landing es estática con revalidación (ISR): se genera una vez y se sirve
// desde caché casi instantáneo, en vez de esperar a Supabase en cada request.
// Los chefs destacados se refrescan cada 5 min (o bajo demanda vía revalidatePath('/')).
export const revalidate = 300;

export default async function Home() {
  const chefs = await getFeaturedChefs();

  return (
    <main className="flex min-h-screen flex-col bg-background selection:bg-accent selection:text-zinc-900 overflow-x-hidden">
      <Header />
      <Hero />
      <SaboresEnCasa />
      <AssistantEntry variant="embedded" />
      <HowItWorks />
      <MenuDeLaNoche />
      <NicaraguaChefMapSection />
      <Chefs chefs={chefs} />
        <Menus />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}
