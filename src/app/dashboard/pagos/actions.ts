'use server'

// ============================================================================
// Server actions · Cuenta de pago del chef (DATO SENSIBLE)
//
// La escritura pasa SIEMPRE por el RPC save_chef_payout_account (SECURITY
// DEFINER): patrón del proyecto para mutaciones, y además necesitamos que el
// upsert de la cuenta y el marcado de profile_completion.payments_done ocurran
// en una sola transacción.
//
// Se usa el cliente de servidor (cookies del chef), NO el admin client: el RPC
// deriva el chef_id de auth.uid(), que con service-role sería NULL.
// ============================================================================

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

type ActionState = { error?: string; success?: boolean }

// El RPC lanza códigos estables (RAISE EXCEPTION '<code>'); acá se traducen a
// mensajes para el chef. Mismo patrón que releasePayout en admin/actions.ts.
const ERROR_MESSAGES: Record<string, string> = {
  chef_profile_not_found:  'No encontramos tu perfil de chef. Volvé a iniciar sesión.',
  missing_required_fields: 'Completá todos los campos obligatorios.',
  invalid_legal_status:    'Seleccioná un estatus legal válido.',
  invalid_document_type:   'Seleccioná un tipo de documento válido.',
  invalid_account_type:    'Seleccioná un tipo de cuenta válido.',
  invalid_currency:        'Seleccioná la moneda de tu cuenta.',
  company_requires_ruc:    'Si el titular es una compañía, el documento debe ser RUC.',
  invalid_document_id:     'El número de documento debe tener entre 5 y 20 caracteres, sin símbolos.',
  invalid_account_number:  'El número de cuenta debe tener entre 10 y 20 dígitos.',
}

function messageFor(raw: string | undefined): string {
  if (raw) {
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      if (raw.includes(code)) return message
    }
  }
  return 'No pudimos guardar tus datos de pago. Intentá de nuevo.'
}

export async function savePayoutAccount(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const field = (name: string) => (formData.get(name) as string)?.trim() || ''

  const payload = {
    p_legal_status:    field('legal_status'),
    p_account_holder:  field('account_holder'),
    p_document_type:   field('document_type'),
    p_document_id:     field('document_id'),
    p_bank_name:       field('bank_name'),
    p_account_type:    field('account_type'),
    p_currency:        field('currency'),
    p_account_number:  field('account_number'),
    p_address_line:    field('address_line'),
    p_address_city:    field('address_city'),
    p_address_country: field('address_country'),
    // Único opcional: en Nicaragua el código postal es de uso marginal.
    p_postal_code:     field('postal_code') || null,
  }

  // Chequeo previo para no ir a la base con un formulario a medio llenar. La
  // validación de verdad (formatos, enums, reglas) vive en el RPC.
  const missing = Object.entries(payload).some(
    ([key, value]) => key !== 'p_postal_code' && !value
  )
  if (missing) return { error: ERROR_MESSAGES.missing_required_fields }

  const { error } = await supabase.rpc('save_chef_payout_account', payload)

  if (error) {
    // Nunca loguear el payload: lleva número de cuenta y documento.
    console.error('savePayoutAccount:', error.message)
    return { error: messageFor(error.message) }
  }

  revalidatePath('/dashboard/pagos')
  // El dashboard muestra el checklist (payments_done) y el aviso de datos
  // pendientes; ambos cambian con este guardado.
  revalidatePath('/dashboard')

  return { success: true }
}
