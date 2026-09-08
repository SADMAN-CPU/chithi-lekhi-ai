import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './config'

let cachedClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  const env = getSupabaseEnv()
  if (!env.isConfigured) {
    throw new Error(
      `[Supabase Client Error] ${env.error || 'Supabase is not configured in environment variables.'}`
    )
  }

  if (typeof window !== 'undefined' && cachedClient) {
    return cachedClient
  }

  const client = createBrowserClient(env.url, env.anonKey)

  if (typeof window !== 'undefined') {
    cachedClient = client
  }

  return client
}
