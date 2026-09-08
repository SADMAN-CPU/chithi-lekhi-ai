import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from './config'

export async function createClient() {
  const env = getSupabaseEnv()
  if (!env.isConfigured) {
    throw new Error(
      `[Supabase Server Error] ${env.error || 'Supabase is not configured in environment variables.'}`
    )
  }

  const cookieStore = await cookies()
  return createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — can be ignored
          }
        },
      },
    }
  )
}
