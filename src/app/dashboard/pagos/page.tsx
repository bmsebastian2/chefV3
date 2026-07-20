import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PayoutAccountForm } from '@/components/dashboard/PayoutAccountForm'
import type { PayoutInitialData } from '@/components/dashboard/PayoutAccountForm'

// Lectura de la cuenta de pago del propio chef. La RLS de chef_payout_accounts
// solo deja ver la fila propia, así que alcanza con el cliente de servidor: no
// hace falta (ni corresponde) el admin client acá.

export default async function PagosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!chef) redirect('/dashboard')

  const { data: account } = await supabase
    .from('chef_payout_accounts')
    .select(
      'legal_status, account_holder, document_type, document_id, bank_name, account_type, currency, account_number, address_line, address_city, address_country, postal_code'
    )
    .eq('chef_id', chef.id)
    .maybeSingle()

  const initialData: PayoutInitialData = {
    legal_status:    account?.legal_status    ?? null,
    account_holder:  account?.account_holder  ?? null,
    document_type:   account?.document_type   ?? null,
    document_id:     account?.document_id     ?? null,
    bank_name:       account?.bank_name       ?? null,
    account_type:    account?.account_type    ?? null,
    currency:        account?.currency        ?? null,
    account_number:  account?.account_number  ?? null,
    address_line:    account?.address_line    ?? null,
    address_city:    account?.address_city    ?? null,
    address_country: account?.address_country ?? null,
    postal_code:     account?.postal_code     ?? null,
  }

  // "Ya tiene cuenta cargada" se mide por el número de cuenta, no por la
  // existencia de la fila: distingue una cuenta real de una fila a medio
  // completar, y es lo que decide si el guardado pide confirmación.
  const hasExisting = Boolean(account?.account_number)

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Configuración
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-2">
          Datos de la cuenta bancaria
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          ¿Listo para recibir tus ganancias? Ingresá tus datos bancarios acá para que
          podamos depositarte de forma rápida y segura después de cada servicio.
        </p>
      </div>

      <PayoutAccountForm initialData={initialData} hasExisting={hasExisting} />
    </div>
  )
}
