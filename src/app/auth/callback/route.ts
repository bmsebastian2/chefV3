import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { notifyMatchingChefs } from '@/lib/emails/notify-chefs'
import type { EmailOtpType, User } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code      = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type      = searchParams.get('type')

  const supabase = await createClient()
  let userId: string | null = null
  let authUser: User | null = null

  // PKCE flow: el code se puede intercambiar directamente (server-generated magic links)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) console.error('[callback] exchangeCodeForSession:', error.message)
    else {
      authUser = data.session?.user ?? data.user ?? null
      userId = authUser?.id ?? null
    }
  }

  // OTP flow: token_hash + type (magic link en proyectos con PKCE habilitado)
  if (!userId && tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })
    if (error) console.error('[callback] verifyOtp:', error.message)
    else {
      authUser = data.session?.user ?? data.user ?? null
      userId = authUser?.id ?? null
    }
  }

  if (userId) {
    const admin = createAdminClient()

    // Usuario OAuth (Google) sin fila en public.users → crearla con rol 'client'.
    // El RPC es idempotente: si ya existe (p. ej. un chef que linkea su Google),
    // no la pisa, así conserva su rol/perfil y el gate de bloqueo sigue aplicando.
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!existing) {
      const meta = (authUser?.user_metadata ?? {}) as Record<string, string>
      const full = (meta.full_name ?? meta.name ?? '').trim()
      const [firstToken, ...restTokens] = full.split(/\s+/).filter(Boolean)
      const firstName = meta.given_name?.trim() || firstToken || (authUser?.email?.split('@')[0] ?? '')
      const firstSurname = meta.family_name?.trim() || restTokens.join(' ') || null

      const { error: regErr } = await admin.rpc('register_oauth_user', {
        p_user_id:       userId,
        p_email:         authUser?.email ?? '',
        p_first_name:    firstName,
        p_first_surname: firstSurname,
      })
      if (regErr) console.error('[callback] register_oauth_user:', regErr.message)
    }

    // Activa las solicitudes pendientes y devuelve las activadas en una sola
    // operación atómica (UPDATE ... RETURNING dentro de la RPC SECURITY DEFINER).
    // Idempotente: una segunda apertura del enlace no matchea ninguna fila y
    // devuelve [], así el after() no vuelve a notificar.
    const { data: activated, error: activateErr } = await admin
      .rpc('activate_pending_requests', { p_user_id: userId })

    if (activateErr) {
      console.error('[callback] activate_pending_requests:', activateErr.message)
    }

    const requestIds = ((activated ?? []) as { id: string }[])
      .map((r) => r.id)
      .filter(Boolean)

    if (requestIds.length > 0) {
      after(async () => {
        for (const requestId of requestIds) {
          await notifyMatchingChefs(requestId)
            .catch((err) => console.error('[callback] notifyMatchingChefs:', err))
        }
      })
    }
  }

  // `next` permite redirigir a un destino interno (ej. /reset-password en el
  // flujo de recuperación de contraseña). Solo se aceptan rutas internas para
  // evitar open-redirects.
  const nextParam = searchParams.get('next')
  const safeNext =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : null

  return NextResponse.redirect(`${origin}${safeNext ?? '/client-dashboard'}`)
}
