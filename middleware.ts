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

      // Panel "casa" de cada rol.
      const HOME_BY_ROLE: Record<string, string> = {
        admin:  '/admin',
        chef:   '/dashboard',
        client: '/client-dashboard',
      }

      // Auto-entrada al panel: solo la PRIMERA vez que la sesión de navegación
      // aterriza en "/". Tras redirigir dejamos esta cookie (de sesión, muere al
      // cerrar el browser); mientras exista, "/" se puede ver logueado (logo,
      // links, URL tipeada) sin rebotar al panel.
      const HOME_COOKIE = 'gc_home_auto'

      // En la raíz con sesión (bypass explícito con ?home=1),
      // o en cualquier panel protegido → necesitamos el rol.
      const onRoot = pathname === '/' && !searchParams.has('home')
      const onDashboard =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/client-dashboard') ||
        pathname.startsWith('/admin')

      if (user && (onRoot || onDashboard)) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        const home = userData?.role ? HOME_BY_ROLE[userData.role] : undefined

        // En la raíz → auto-entrada al panel solo si aún no redirigimos en esta
        // sesión. Con la cookie ya puesta, el usuario logueado ve el home normal.
        if (onRoot && home && !request.cookies.get(HOME_COOKIE)) {
          const res = redirectTo(home)
          res.cookies.set(HOME_COOKIE, '1', { path: '/', httpOnly: true, sameSite: 'lax' })
          return res
        }

        // En un panel que no es el de su rol → mandarlo al suyo.
        // (No bloquea acceder a un recurso ajeno DENTRO del panel propio:
        //  eso sigue resolviéndose con notFound() en la página.)
        if (onDashboard && home && !pathname.startsWith(home)) {
          return redirectTo(home)
        }
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