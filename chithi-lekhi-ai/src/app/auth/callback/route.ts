import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const redirectUrl = new URL('/dashboard', origin)
  if (next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) {
    const candidate = new URL(next, origin)
    if (candidate.origin === origin) {
      redirectUrl.pathname = candidate.pathname
      redirectUrl.search = candidate.search
      redirectUrl.hash = candidate.hash
    }
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(redirectUrl)
      } else {
        console.error('[auth/callback] Exchange code error:', error.message)
      }
    } catch (err) {
      console.error('[auth/callback] Unexpected error during code exchange:', err)
    }
  }

  // If code is missing or exchange failed, redirect to login with error param
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
