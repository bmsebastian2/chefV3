'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { TERMS_VERSION } from '@/lib/terms'

// Errores de acceso que puede provocar quien intenta entrar. Se mapea por
// `code` y no por `message`: el código es estable entre versiones de Supabase,
// el texto no.
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  // Deliberadamente genérico: no revela si el email existe.
  invalid_credentials: 'Email o contraseña incorrectos.',
  email_not_confirmed: 'Confirmá tu email antes de acceder. Revisá tu bandeja de entrada y el spam.',
  user_banned: 'Esta cuenta está suspendida. Escribinos para revisarla.',
  over_request_rate_limit: 'Demasiados intentos. Esperá unos minutos y volvé a intentar.',
  email_address_invalid: 'Ese email no tiene un formato válido.',
  validation_failed: 'Revisá el email y la contraseña: falta algún dato.',
}

const LOGIN_ERROR_FALLBACK = 'No pudimos iniciar sesión. Intentá de nuevo en unos minutos.'

export async function login(prevState: { error: string } | null, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    // El detalle crudo queda en el servidor: al usuario no le sirve y los
    // códigos desconocidos caen al fallback.
    console.error('login error:', error.code, error.message)
    const message = error.code ? LOGIN_ERROR_MESSAGES[error.code] : undefined
    return { error: message ?? LOGIN_ERROR_FALLBACK }
  }

  redirect('/dashboard')
}

export async function signup(prevState: { error: string } | null, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  redirect('/dashboard')
}

export async function loginWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) return
  redirect(data.url)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Limpiar la marca de auto-entrada para que el próximo login vuelva a
  // caer directo en su panel al abrir la app.
  ;(await cookies()).delete('gc_home_auto')
  redirect('/')
}

export async function changePassword(
  prevState: { error: string; success: boolean } | null,
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const supabase = await createClient()

  const newPassword = formData.get('newPassword') as string
  const repeatPassword = formData.get('repeatPassword') as string

  if (!newPassword || newPassword.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.', success: false }
  }
  if (newPassword !== repeatPassword) {
    return { error: 'Las contraseñas no coinciden.', success: false }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message, success: false }

  return { error: '', success: true }
}

export async function requestPasswordReset(
  prevState: { error: string; success: boolean } | null,
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim()
  if (!email) {
    return { error: 'Ingresá tu email.', success: false }
  }

  // El enlace del email vuelve por /auth/callback, que intercambia el code y
  // redirige a /reset-password gracias al parámetro `next`.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  })

  if (error) return { error: error.message, success: false }

  // Supabase responde OK aunque el email no exista (evita enumeración de usuarios).
  return { error: '', success: true }
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
  // El checkbox HTML envía 'on' cuando está marcado; ausente si no lo está.
  const acceptTerms = formData.get('acceptTerms') != null

  if (!acceptTerms) {
    return { error: 'Debes aceptar los términos y condiciones para registrarte' }
  }

  try {
    // Clear any stale session (e.g. left over from a wizard client signup)
    // so the subsequent signUp starts from a clean state.
    await supabase.auth.signOut()

    // 1. Validate phone uniqueness BEFORE creating the auth user.
    //    check_phone_exists uses SECURITY DEFINER to bypass RLS.
    const { data: phoneExists, error: phoneCheckError } = await supabase
      .rpc('check_phone_exists', { p_phone: phone })

    if (phoneCheckError) {
      console.error('Error checking phone:', phoneCheckError)
      return { error: 'No se pudo verificar el número de teléfono' }
    }

    if (phoneExists) {
      return { error: 'Este número de teléfono ya está registrado' }
    }

    // 2. Create user in Supabase Auth (only after validations pass)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (authError || !authData.user) {
      return { error: authError?.message || 'Error al crear cuenta' }
    }

    const userId = authData.user.id

    // 3. Register chef profile via RPC.
    //    register_chef solo es ejecutable por service_role (ver
    //    MIGRATION_lockdown_register_functions.sql) porque confía en
    //    p_user_id sin validarlo contra auth.uid() — se llama con el
    //    cliente admin, nunca con el anon/cookies.
    const { error: rpcError } = await createAdminClient()
      .rpc('register_chef', {
        p_user_id:        userId,
        p_email:          email,
        p_first_name:     firstName,
        p_phone:          phone,
        p_country:        country,
        p_first_surname:  firstSurname,
        p_second_surname: secondSurname,
        p_terms_version:  TERMS_VERSION,
      })

    if (rpcError) {
      console.error('RPC register_chef error:', JSON.stringify(rpcError))
      let errorMessage = 'Error al registrar perfil de chef'
      if (rpcError.message?.includes('already exists') || rpcError.message?.includes('duplicate')) {
        errorMessage = 'Este número de teléfono ya está registrado'
      }
      return { error: errorMessage }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (error) {
    // Re-throw Next.js redirect errors
    if (error instanceof Error && 'digest' in error && String((error as any).digest).includes('NEXT_REDIRECT')) {
      throw error
    }
    console.error('Error inesperado en registerChef:', error)
    return { error: 'Error inesperado al registrarse' }
  }
}