import Image from 'next/image'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronRight, UtensilsCrossed } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

export default async function MenusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!chef) redirect('/dashboard')

  const { data: menus } = await supabase
    .from('chef_menus')
    .select('id, title, cuisine_types, image_url')
    .eq('chef_id', chef.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Menús</h1>
        <Link
          href="/dashboard/menus/nuevo"
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Crear menú
        </Link>
      </div>

      {(!menus || menus.length === 0) ? (
        <div className="rounded-2xl border border-border p-10 text-center">
          <UtensilsCrossed className="mx-auto mb-3 text-muted-foreground" size={32} />
          <p className="text-sm font-medium mb-1">Todavía no tienes menús</p>
          <p className="text-sm text-muted-foreground mb-4">
            Crea tu primer menú para que los clientes puedan contratarte.
          </p>
          <Link
            href="/dashboard/menus/nuevo"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <Plus size={14} /> Crear primer menú
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          {menus.map((menu, i) => (
            <Link
              key={menu.id}
              href={`/dashboard/menus/${menu.id}`}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors ${i < menus.length - 1 ? 'border-b border-border/50' : ''}`}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                {menu.image_url ? (
                  <Image src={menu.image_url} alt={menu.title} width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed size={18} className="text-zinc-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{menu.title}</p>
                {menu.cuisine_types?.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    {(menu.cuisine_types as string[]).join(' · ')}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
