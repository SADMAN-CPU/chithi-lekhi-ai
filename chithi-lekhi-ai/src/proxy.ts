import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

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

  // 2. Local session fallback cookie check (DEVELOPMENT ONLY)
  // SECURITY NOTICE:
  // In production (NODE_ENV === 'production'), client-forged cookies (chithi_session)
  // MUST NEVER be trusted to authenticate or bypass middleware protection.
  // Access control must strictly depend on verified Supabase Auth JWT sessions.
  if (!isAuthenticated && process.env.NODE_ENV !== 'production') {
    const demoCookie = request.cookies.get('chithi_session')
    if (demoCookie?.value) {
      isAuthenticated = true
    }
  }

  const { pathname } = request.nextUrl

  // Protect /dashboard routes — redirect unauthenticated users to /login
  if (!isAuthenticated && pathname.startsWith('/dashboard')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages (/login, /signup) to /dashboard
  if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

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
