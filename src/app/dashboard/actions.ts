'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function toggleIsActive(chefId: string, current: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('chef_profiles')
    .update({ is_active: !current })
    .eq('id', chefId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}
