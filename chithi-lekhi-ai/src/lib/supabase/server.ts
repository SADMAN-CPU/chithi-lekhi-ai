import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv, logSupabaseConfigDiagnostics } from './config'

export async function createClient() {
  const env = getSupabaseEnv()
  if (!env.isConfigured) {
    logSupabaseConfigDiagnostics()
  }

  const url = env.isConfigured ? env.url : 'https://placeholder-auth.supabase.co'
  const anonKey = env.isConfigured ? env.anonKey : 'placeholder-anon-key'

  const cookieStore = await cookies()
  return createServerClient(
    url,
    anonKey,
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
