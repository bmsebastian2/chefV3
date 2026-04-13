import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Chefs } from "@/components/Chefs";
import { Menus } from "@/components/Menus";
import { About } from "@/components/About";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background selection:bg-accent selection:text-zinc-900 overflow-x-hidden">
      <Header />
      <Hero />
      <HowItWorks />
      <Chefs />
      <Menus />
      <About />
      <Footer />
    </main>
  );
}
