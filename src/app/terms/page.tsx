import { redirect } from "next/navigation";

// La página de Términos se trasladó al nuevo layout legal compartido.
// Mantenemos /terms como redirect para no romper enlaces existentes.
export default function TermsPage() {
  redirect("/legal/terminos");
}
