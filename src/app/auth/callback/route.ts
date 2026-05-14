import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { notifyMatchingChefs } from '@/lib/emails/notify-chefs'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code      = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type      = searchParams.get('type')

  const supabase = await createClient()
  let userId: string | null = null

  // PKCE flow: el code se puede intercambiar directamente (server-generated magic links)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) console.error('[callback] exchangeCodeForSession:', error.message)
    else userId = data.session?.user?.id ?? null
  }

  // OTP flow: token_hash + type (magic link en proyectos con PKCE habilitado)
  if (!userId && tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })
    if (error) console.error('[callback] verifyOtp:', error.message)
    else userId = data.session?.user?.id ?? null
  }

  if (userId) {
    const admin = createAdminClient()

    const { data: activated, error: updateErr } = await admin
      .from('service_requests')
      .update({ status: 'new' })
      .eq('user_id', userId)
      .eq('status', 'pending_confirmation')
      .select('id, service_type, occasion, city, event_date_start, event_date_end, event_time, guests_adults, cuisine_type, budget_min, budget_max, descripcion_evento')

    if (updateErr) {
      console.error('[callback] update service_requests:', updateErr.message)
    } else if (activated && activated.length > 0) {
      after(async () => {
        for (const req of activated) {
          await notifyMatchingChefs(req.id, {
            service_type:       req.service_type,
            occasion:           req.occasion,
            city:               req.city,
            event_date_start:   req.event_date_start,
            event_date_end:     req.event_date_end,
            event_time:         req.event_time,
            cuantas_personas:   req.guests_adults,
            cuisine_type:       req.cuisine_type,
            budget_min:         req.budget_min,
            budget_max:         req.budget_max,
            descripcion_evento: req.descripcion_evento,
          }).catch((err) => console.error('[callback] notifyMatchingChefs:', err))
        }
      })
    }
  }

  return NextResponse.redirect(`${origin}/client-dashboard`)
}
