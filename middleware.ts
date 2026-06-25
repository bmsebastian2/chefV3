import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // Capturar params de auth de Supabase sin importar en qué ruta aterrizaron.
    // Ocurre cuando /auth/callback no está en la lista de Redirect URLs de Supabase
    // y el magic link redirige al Site URL base en su lugar.
    const { pathname, searchParams } = request.nextUrl
    const code      = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const type      = searchParams.get('type')

    if ((code || (tokenHash && type)) && pathname !== '/auth/callback') {
      const callbackUrl = new URL('/auth/callback', request.url)
      if (code)      callbackUrl.searchParams.set('code', code)
      if (tokenHash) callbackUrl.searchParams.set('token_hash', tokenHash)
      if (type)      callbackUrl.searchParams.set('type', type)
      return NextResponse.redirect(callbackUrl)
    }

    let supabaseResponse = NextResponse.next({ request })

    // Validar variables de entorno - retornar error claro en Vercel
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.next()
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { pathname } = request.nextUrl

      // Redirige preservando las cookies de sesión que getUser pudo refrescar.
      // Sin esto, el redirect descarta el token nuevo y la próxima request ve al
      // usuario como deslogueado (browser logueado ↔ server no → rebote a "/").
      const redirectTo = (path: string) => {
        const res = NextResponse.redirect(new URL(path, request.url))
        supabaseResponse.cookies.getAll().forEach((cookie) => res.cookies.set(cookie))
        return res
      }

      // Rutas protegidas: redirigir al inicio si no está logueado
      if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/client-dashboard') || pathname.startsWith('/admin'))) {
        return redirectTo('/')
      }

      // En la raíz con sesión → redirigir según rol.
      // Bypass con ?home=1: permite ver la landing aunque haya sesión (ej. botón
      // "Inicio" del panel admin).
      if (user && pathname === '/' && !searchParams.has('home')) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        const role = userData?.role
        if (role === 'admin')  return redirectTo('/admin')
        if (role === 'chef')   return redirectTo('/dashboard')
        if (role === 'client') return redirectTo('/client-dashboard')
      }
    } catch (error) {
      console.error('Error getting user:', error)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
  ],
}