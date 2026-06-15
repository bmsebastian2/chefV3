import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ChefAssistant } from "@/components/assistant/ChefAssistant";
import { HowItWorks } from "@/components/HowItWorks";
import { PersonalizaMenu } from "@/components/PersonalizaMenu";
import { Chefs } from "@/components/Chefs";
import { NicaraguaChefMapSection } from "@/components/maps/NicaraguaChefMapSection";
import { Menus } from "@/components/Menus";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background selection:bg-accent selection:text-zinc-900 overflow-x-hidden">
      <Header />
      <Hero />
      <ChefAssistant />
      <HowItWorks />
      <PersonalizaMenu />
      <Chefs />
      <NicaraguaChefMapSection />
      <Menus />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}
