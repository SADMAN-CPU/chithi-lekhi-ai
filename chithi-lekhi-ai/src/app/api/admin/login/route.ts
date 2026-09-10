import { NextRequest, NextResponse } from 'next/server'
import {
  validateAdminCredentials,
  createAdminToken,
  ADMIN_COOKIE_NAME,
} from '@/lib/admin-auth'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()

    // 1. If Supabase Auth is configured, attempt primary Supabase authentication
    if (isSupabaseConfigured) {
      try {
        const supabase = await createClient()
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })

        if (!sbError && data.user) {
          // SECURITY: Verify admin role strictly via app_metadata or public.profiles. Never trust user_metadata.
          let role: string = (data.user.app_metadata?.role as string) === 'admin' ? 'admin' : 'user'
          if (role !== 'admin') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.user.id)
              .maybeSingle()
            if (profile?.role === 'admin') {
              role = 'admin'
            }
          }

          if (role === 'admin') {
            const token = await createAdminToken(trimmedEmail)
            const response = NextResponse.json({
              success: true,
              message: 'Admin authenticated via Supabase Auth',
            })

            response.cookies.set(ADMIN_COOKIE_NAME, token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 24 * 60 * 60,
            })

            return response
          } else {
            // User exists but does not have admin permissions
            await supabase.auth.signOut()
            return NextResponse.json(
              {
                success: false,
                error: 'অ্যাক্সেস প্রত্যাখ্যান করা হয়েছে। আপনার অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই। (Access denied: Not an administrator)',
              },
              { status: 403 }
            )
          }
        }
      } catch (sbErr) {
        console.warn('[Admin Login] Supabase Auth check note:', sbErr)
      }
    }

    // 2. Fallback: Check environment-based admin credentials
    const isValidEnvAdmin = await validateAdminCredentials(trimmedEmail, password)
    if (isValidEnvAdmin) {
      const token = await createAdminToken(trimmedEmail)
      const response = NextResponse.json({
        success: true,
        message: 'Admin authenticated via environment credentials',
      })

      response.cookies.set(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60,
      })

      return response
    }

    return NextResponse.json(
      { success: false, error: 'ভুল ইমেইল বা পাসওয়ার্ড প্রদান করা হয়েছে। (Invalid credentials)' },
      { status: 401 }
    )
  } catch (err) {
    console.error('[Admin Login Error]:', err)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
