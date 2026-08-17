import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendChefCompletionReminderEmail, type ChefMissingRequirement } from '@/lib/emails/chef-emails'

export const dynamic = 'force-dynamic'

// Mismos valores que los defaults de get_chefs_for_completion_reminder() en
// MIGRATION_chef_completion_reminder.sql — se pasan explícitos acá para que
// la cadencia real quede visible en el código, no escondida en un default SQL.
const MIN_DAYS_SINCE_LAST = 5
const MAX_REMINDERS = 3

type ReminderCandidate = {
  chef_id: string
  user_id: string
  email: string
  first_name: string | null
  missing: ChefMissingRequirement[]
  reminder_count: number
}

// Vercel Cron manda esta request con `Authorization: Bearer $CRON_SECRET`
// cuando esa env var está seteada en el proyecto — convención estándar de
// Vercel, no un secreto inventado acá.
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: candidates, error } = await admin.rpc('get_chefs_for_completion_reminder', {
    p_min_days_since_last: MIN_DAYS_SINCE_LAST,
    p_max_reminders: MAX_REMINDERS,
  })

  if (error) {
    console.error('[cron/chef-completion-reminder] fetch candidates:', error.message)
    return NextResponse.json({ error: 'Error obteniendo chefs incompletos' }, { status: 500 })
  }

  const rows = (candidates ?? []) as ReminderCandidate[]

  const results = await Promise.allSettled(
    rows.map(async (chef) => {
      const sent = await sendChefCompletionReminderEmail({
        email: chef.email,
        name: chef.first_name ?? 'Chef',
        missing: chef.missing,
      })

      // No se marca nada si el email falló — el chef vuelve a entrar en el
      // próximo barrido (sigue "en fecha" porque last_sent_at no se tocó).
      if (!sent) throw new Error(`email failed for chef ${chef.chef_id}`)

      const { error: updateError } = await admin
        .from('chef_profiles')
        .update({
          profile_incomplete_reminder_count: chef.reminder_count + 1,
          profile_incomplete_reminder_last_sent_at: new Date().toISOString(),
        })
        .eq('id', chef.chef_id)

      if (updateError) throw updateError
    })
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  return NextResponse.json({ total: rows.length, sent: rows.length - failed, failed })
}
