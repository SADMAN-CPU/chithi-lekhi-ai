import { createClient } from './supabase/server'
import { isSupabaseConfigured } from './supabase/config'

export { isSupabaseConfigured }

export interface ServerUser {
  id: string
  email?: string
  role?: 'user' | 'admin'
}

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
        let role: 'user' | 'admin' = (user.user_metadata?.role as 'user' | 'admin') || 'user'
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
        return { id: user.id, email: user.email, role }
      }
    } catch (err) {
      console.warn('[getServerUser] Supabase session verification error:', err)
    }
  }

  return null
}
