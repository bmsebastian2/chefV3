import { redirect } from 'next/navigation'

// Platos y menús se unificaron en un solo panel — ver /dashboard/menus
// (MenuBuilderPanel). Esta ruta se mantiene para no romper links viejos.
export default function PlatosPage() {
  redirect('/dashboard/menus')
}
