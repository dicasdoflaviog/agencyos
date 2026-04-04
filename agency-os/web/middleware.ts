import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const path = request.nextUrl.pathname

  // API v1 routes — require Authorization header (routes validate key themselves)
  if (path.startsWith('/api/v1/')) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
    }
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Admin routes — require super_admin role
  if (path.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return NextResponse.redirect(new URL('/', request.url))
    return supabaseResponse
  }

  // Client portal routes
  if (path.startsWith('/client')) {
    if (path === '/client/login') {
      if (user) return NextResponse.redirect(new URL('/client/outputs', request.url))
      return supabaseResponse
    }
    if (!user) return NextResponse.redirect(new URL('/client/login', request.url))
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'client') return NextResponse.redirect(new URL('/login', request.url))
    return supabaseResponse
  }

  // Dashboard routes — redirect client-role users to portal
  const dashboardPaths = ['/', '/jobs', '/clients', '/analytics', '/reports', '/crm', '/financial', '/pipelines', '/templates', '/gallery']
  const isDashboard = dashboardPaths.some(p => p === '/' ? path === '/' : path.startsWith(p))
  if (isDashboard && user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'client') return NextResponse.redirect(new URL('/client/outputs', request.url))
  }

  // Unauthenticated redirect for dashboard
  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
