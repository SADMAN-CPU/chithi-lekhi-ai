import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
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
