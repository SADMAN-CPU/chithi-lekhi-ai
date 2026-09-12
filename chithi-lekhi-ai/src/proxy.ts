import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bypass static files, internal routes, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // Refresh auth cookies via Supabase SSR
  const { supabaseResponse, user, role } = await updateSession(request)

  // Preserve refreshed/cleared Supabase cookies when redirecting or rejecting a request.
  const withSessionCookies = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
  }
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/')
  const isAdminApi = pathname === '/api/admin' || pathname.startsWith('/api/admin/')
  let isAdmin = user?.id != null && role === 'admin'
  if ((isAdminPage || isAdminApi) && !isAdmin) {
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value
    isAdmin = Boolean(adminToken && (await verifyAdminToken(adminToken)).valid)
  }

  // 1. Admin route protection: /admin (except /admin/login)
  if (isAdminPage && pathname !== '/admin/login') {
    if (!isAdmin) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      loginUrl.searchParams.set('redirectedFrom', pathname)
      return withSessionCookies(NextResponse.redirect(loginUrl))
    }

    return supabaseResponse
  }

  // 2. Protect /api/admin/* routes (except /api/admin/login and /api/admin/logout)
  if (
    isAdminApi &&
    pathname !== '/api/admin/login' &&
    pathname !== '/api/admin/logout'
  ) {
    if (!isAdmin) {
      return withSessionCookies(NextResponse.json(
        { success: false, error: 'Unauthorized: Admin privileges required' },
        { status: 401 }
      ))
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
      return withSessionCookies(NextResponse.redirect(loginUrl))
    }

    return supabaseResponse
  }

  // 4. Auth pages: /login, /signup
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const targetUrl = request.nextUrl.clone()
    targetUrl.pathname = role === 'admin' ? '/admin' : '/dashboard'
    return withSessionCookies(NextResponse.redirect(targetUrl))
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
