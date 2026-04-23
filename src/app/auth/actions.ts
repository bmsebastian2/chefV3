'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(prevState: { error: string } | null, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(prevState: { error: string } | null, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  redirect('/dashboard')
}

export async function loginWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) return
  redirect(data.url)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function registerChef(prevState: { error: string } | null, formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('firstName') as string
  const firstSurname = formData.get('firstSurname') as string
  const secondSurname = formData.get('secondSurname') as string
  const country = formData.get('country') as string
  const phone = formData.get('phone') as string

  console.log('🚀 Iniciando registro de chef:', { email, firstName, firstSurname, secondSurname, country, phone })

  try {
    // 1. Crear usuario en Supabase Auth
    console.log('📧 Creando usuario en Supabase Auth...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError || !authData.user) {
      console.error('❌ Error en auth.signUp:', authError)
      return { error: authError?.message || 'Error al crear cuenta' }
    }

    const userId = authData.user.id
    const fullName = `${firstName} ${firstSurname} ${secondSurname}`.trim()
    console.log('✅ Usuario creado en Auth:', userId)

    // 2-4. Usar función RPC para crear registros con permisos elevados
    console.log('👨‍🍳 Llamando función RPC para registrar chef...')
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('register_chef', {
        p_user_id: userId,
        p_email: email,
        p_full_name: fullName,
        p_phone: phone,
        p_country: country,
        p_first_surname: firstSurname,
        p_second_surname: secondSurname,
      })

    if (rpcError) {
      console.error('❌ Error en RPC register_chef:', rpcError)
      console.log('🧹 Limpiando: Eliminando usuario de Auth para rollback...')
      
      // Hacer rollback: eliminar el usuario de auth si la RPC falla
      await supabase.auth.admin.deleteUser(userId)
      
      // Proporcionar mensaje de error más específico basado en el error
      let errorMessage = 'Error al registrar perfil de chef'
      if (rpcError.message?.includes('already exists')) {
        errorMessage = 'Este número de teléfono ya está registrado'
      } else if (rpcError.message?.includes('duplicate')) {
        errorMessage = 'Este número de teléfono ya está registrado'
      }
      
      return { error: errorMessage }
    }

    console.log('✅ Chef registrado exitosamente:', rpcData)
    console.log('🎉 Registro completado exitosamente')
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (error) {
    // Re-throw Next.js redirect errors
    if (error instanceof Error && 'digest' in error && String((error as any).digest).includes('NEXT_REDIRECT')) {
      throw error
    }
    console.error('💥 Error inesperado en registerChef:', error)
    return { error: 'Error inesperado al registrarse' }
  }
}