import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from './config'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const env = getSupabaseEnv()
  if (!env.isConfigured) {
    return { supabaseResponse, user: null, role: null }
  }

  const supabase = createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh and verify the identity. Auth outages must never grant access.
  let user: User | null = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error) user = data.user
  } catch (error) {
    console.warn('[Auth Proxy] Session verification failed:', error)
  }

  let role: string = 'user'
  if (user) {
    role = user.app_metadata?.role === 'admin' ? 'admin' : 'user'
    if (role !== 'admin') {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        if (profile?.role === 'admin') {
          role = 'admin'
        }
      } catch {
        // Non-fatal if profiles table check fails
      }
    }
  }

  return { supabaseResponse, user, role }
}
