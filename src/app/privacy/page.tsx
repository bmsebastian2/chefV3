import { redirect } from "next/navigation";

// La página de Privacidad se trasladó al nuevo layout legal compartido.
// Mantenemos /privacy como redirect para no romper enlaces existentes.
export default function PrivacyPage() {
  redirect("/legal/privacidad");
}
