import { createClient } from './supabase/server'

export interface ServerUser {
  id: string
  email?: string
}

/**
 * Check if live Supabase service is configured with valid credentials.
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')
)

/**
 * Server-side authentication session verifier.
 *
 * ============================================================================
 * CRITICAL SECURITY ARCHITECTURE NOTICE:
 * ============================================================================
 * - In PRODUCTION (`NODE_ENV === 'production'`):
 *   Authentication MUST strictly and exclusively verify cryptographic JWT tokens
 *   via Supabase Auth (`supabase.auth.getUser()`).
 *   Under NO circumstances is an unverified, client-supplied cookie (such as
 *   `chithi_session`) trusted in production. Trusting unsigned client cookies in
 *   production allows arbitrary UUID impersonation, IDOR, and account takeover.
 *
 * - In DEVELOPMENT (`NODE_ENV !== 'production'`):
 *   A local fallback cookie (`chithi_session`) is permitted ONLY for local offline
 *   UI previewing and mock end-to-end testing when live Supabase credentials or
 *   local SMTP are not configured.
 * ============================================================================
 */
export async function getServerUser(): Promise<ServerUser | null> {
  // Primary & Production Auth: Cryptographically verified Supabase Auth session
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (!error && user) {
        return { id: user.id, email: user.email }
      }
    } catch (err) {
      console.warn('[getServerUser] Supabase session verification error:', err)
    }
  }

  return null
}
