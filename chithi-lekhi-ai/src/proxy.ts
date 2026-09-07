import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/admin-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseUrl.startsWith('https://')
)

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  let isAuthenticated = false

  // 1. Supabase Session Check
  if (isConfigured) {
    try {
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
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

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        isAuthenticated = true
      }
    } catch (err) {
      console.warn('[Proxy] Session verification warning:', err)
    }
  }

  const { pathname } = request.nextUrl

  // 2. Protect /admin routes
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value
    const isTokenValid = adminToken ? (await verifyAdminToken(adminToken)).valid : false

    if (pathname === '/admin/login') {
      if (isTokenValid) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/admin'
        return NextResponse.redirect(redirectUrl)
      }
      return supabaseResponse
    }

    if (!isTokenValid) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/admin/login'
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  }

  // 3. Protect /api/admin/* routes (except /api/admin/login and /api/admin/logout)
  if (
    pathname.startsWith('/api/admin') &&
    pathname !== '/api/admin/login' &&
    pathname !== '/api/admin/logout'
  ) {
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value
    const isTokenValid = adminToken ? (await verifyAdminToken(adminToken)).valid : false
    if (!isTokenValid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin privileges required' },
        { status: 401 }
      )
    }
    return supabaseResponse
  }

  // 4. Protect /dashboard routes — redirect unauthenticated users to /login
  if (!isAuthenticated && pathname.startsWith('/dashboard')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 5. Redirect authenticated users away from auth pages (/login, /signup) to /dashboard
  if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const middleware = proxy

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
