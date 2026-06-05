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
    <div className="p-6 md:p-10 max-w-2xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-px w-8 bg-accent rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Mi perfil
            </span>
          </div>
          <h1 className="font-serif text-3xl font-semibold text-zinc-900">Menús</h1>
        </div>
        <Link
          href="/dashboard/menus/nuevo"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold text-sm h-10 px-5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5 shrink-0 mt-8"
        >
          <Plus size={15} />
          Crear menú
        </Link>
      </div>

      {/* ── Empty state ── */}
      {(!menus || menus.length === 0) ? (
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm py-16 text-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <UtensilsCrossed className="text-zinc-300" size={28} />
          </div>
          <h3 className="font-serif text-lg font-semibold text-zinc-800 mb-2">
            Todavía no tenés menús
          </h3>
          <p className="text-sm text-zinc-400 mb-7 max-w-xs mx-auto leading-relaxed">
            Creá tu primer menú para que los clientes puedan contratarte.
          </p>
          <Link
            href="/dashboard/menus/nuevo"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
          >
            <Plus size={15} />
            Crear primer menú
          </Link>
        </div>
      ) : (
        /* ── Menu list ── */
        <div className="space-y-3">
          {menus.map((menu) => (
            <Link
              key={menu.id}
              href={`/dashboard/menus/${menu.id}`}
              className="group flex items-center gap-4 bg-white border border-zinc-100 rounded-xl p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-100">
                {menu.image_url ? (
                  <Image
                    src={menu.image_url}
                    alt={menu.title}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed size={18} className="text-zinc-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[15px] font-semibold text-zinc-900 leading-snug truncate">
                  {menu.title}
                </p>
                {menu.cuisine_types?.length > 0 && (
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {(menu.cuisine_types as string[]).join(' · ')}
                  </p>
                )}
              </div>
              <ChevronRight
                size={16}
                className="text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
