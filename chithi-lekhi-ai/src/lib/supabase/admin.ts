import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from './config'

let cachedAdminClient: ReturnType<typeof createSupabaseJsClient> | null = null

/**
 * Privileged administrative Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * Bypasses Row Level Security (RLS) for server-side administrative tasks,
 * stats aggregation, and user management.
 * MUST only be invoked in secure server-side environments (API routes / server actions).
 */
export function createAdminClient() {
  const env = getSupabaseEnv()
  if (!env.isConfigured) {
    throw new Error(
      `[Supabase Admin Error] ${env.error || 'Supabase URL is not configured.'}`
    )
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || serviceKey.includes('your_') || serviceKey.length < 20) {
    throw new Error(
      '[Supabase Admin Error] SUPABASE_SERVICE_ROLE_KEY is missing or invalid in environment variables.'
    )
  }

  if (cachedAdminClient) {
    return cachedAdminClient
  }

  cachedAdminClient = createSupabaseJsClient(env.url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedAdminClient
}

/**
 * Check if the administrative service role is configured
 */
export function isServiceRoleConfigured(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return Boolean(
    key &&
    !key.includes('your_') &&
    key.length >= 20 &&
    getSupabaseEnv().isConfigured
  )
}
