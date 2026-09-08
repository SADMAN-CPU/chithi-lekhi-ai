import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bypass static files, internal routes, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // Refresh auth cookies via Supabase SSR
  const { supabaseResponse, user, role } = await updateSession(request)

  // 1. Admin route protection: /admin (except /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!user) {
      // If Supabase is configured and no user, check if admin cookie exists as fallback
      const adminCookie = request.cookies.get('chithi_admin_token')
      if (!adminCookie) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/admin/login'
        loginUrl.searchParams.set('redirectedFrom', pathname)
        return NextResponse.redirect(loginUrl)
      }
      return supabaseResponse
    }

    if (role !== 'admin') {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }

    return supabaseResponse
  }

  // 2. Protect /api/admin/* routes (except /api/admin/login and /api/admin/logout)
  if (
    pathname.startsWith('/api/admin') &&
    pathname !== '/api/admin/login' &&
    pathname !== '/api/admin/logout'
  ) {
    const adminCookie = request.cookies.get('chithi_admin_token')
    if (!adminCookie && (!user || role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin privileges required' },
        { status: 401 }
      )
    }
    return supabaseResponse
  }

  // 3. Protected user routes: /dashboard, /account, /settings
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/settings')

  if (isProtectedRoute) {
    if (isSupabaseConfigured && !user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return supabaseResponse
  }

  // 4. Auth pages: /login, /signup
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const targetUrl = request.nextUrl.clone()
    targetUrl.pathname = role === 'admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(targetUrl)
  }

  return supabaseResponse
}

export const middleware = proxy

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
