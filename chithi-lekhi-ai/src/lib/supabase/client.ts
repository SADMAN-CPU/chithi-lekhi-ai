import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv, logSupabaseConfigDiagnostics } from './config'

let cachedClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  const env = getSupabaseEnv()
  if (!env.isConfigured) {
    logSupabaseConfigDiagnostics()
  }

  if (typeof window !== 'undefined' && cachedClient) {
    return cachedClient
  }

  const url = env.isConfigured ? env.url : 'https://placeholder-auth.supabase.co'
  const anonKey = env.isConfigured ? env.anonKey : 'placeholder-anon-key'

  const client = createBrowserClient(url, anonKey)

  if (typeof window !== 'undefined') {
    cachedClient = client
  }

  return client
}
