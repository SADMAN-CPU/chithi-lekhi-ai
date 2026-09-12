import { NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export async function POST() {
  let signOutFailed = false
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      signOutFailed = Boolean(error)
    } catch (error) {
      console.warn('[Admin Logout] Session revocation failed:', error)
      signOutFailed = true
    }
  }
  const response = signOutFailed
    ? NextResponse.json({ success: false, error: 'Could not sign out. Please try again.' }, { status: 503 })
    : NextResponse.json({ success: true, message: 'Admin signed out' })
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
