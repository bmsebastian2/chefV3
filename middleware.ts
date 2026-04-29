import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
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

      // Rutas protegidas: redirigir al inicio si no está logueado
      if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/client-dashboard'))) {
        return NextResponse.redirect(new URL('/', request.url))
      }

      // En la raíz con sesión → redirigir según rol
      if (user && pathname === '/') {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        const role = userData?.role
        if (role === 'chef')   return NextResponse.redirect(new URL('/dashboard', request.url))
        if (role === 'client') return NextResponse.redirect(new URL('/client-dashboard', request.url))
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