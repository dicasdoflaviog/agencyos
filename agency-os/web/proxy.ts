import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
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

  // API v1 — validate Bearer token (routes handle key verification themselves)
  if (path.startsWith('/api/v1/')) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
    }
    return supabaseResponse
  }

  // All other API routes — skip proxy logic
  if (path.startsWith('/api/')) return supabaseResponse

  const { data: { user } } = await supabase.auth.getUser()

  // Unauthenticated: only allow /login and /auth/*
  if (!user) {
    if (path === '/login' || path.startsWith('/auth/')) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated on login/reset pages → app
  if (path === '/login' || path.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Fetch profile once for all checks (role + onboarding)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('id', user.id)
    .single()

  // ── Admin routes ─────────────────────────────────────────────────────────
  if (path.startsWith('/admin')) {
    if (profile?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // ── Client portal ─────────────────────────────────────────────────────────
  if (path === '/client/login' || path.startsWith('/client/')) {
    if (path === '/client/login') {
      if (user) return NextResponse.redirect(new URL('/client/outputs', request.url))
      return supabaseResponse
    }
    if (profile?.role !== 'client') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // ── Onboarding gate ───────────────────────────────────────────────────────
  if (path === '/onboarding' && profile?.onboarding_completed) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (path !== '/onboarding' && !profile?.onboarding_completed) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Dashboard: redirect client-role users to portal
  if (profile?.role === 'client') {
    return NextResponse.redirect(new URL('/client/outputs', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
