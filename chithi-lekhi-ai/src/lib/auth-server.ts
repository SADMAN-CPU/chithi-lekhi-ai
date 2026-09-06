import { cookies } from 'next/headers'
import { createClient } from './supabase/server'

export interface ServerUser {
  id: string
  email?: string
}

/**
 * Safely verify the current authenticated user on the server.
 * Checks live Supabase session first, then falls back to session cookie.
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')
)

/**
 * Safely verify the current authenticated user on the server.
 * Checks live Supabase session first, then falls back to session cookie.
 */
export async function getServerUser(): Promise<ServerUser | null> {
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
      console.warn('[getServerUser] Supabase session check error:', err)
    }
  }

  // Fallback session cookie for development and local testing
  try {
    const cookieStore = await cookies()
    const demoCookie = cookieStore.get('chithi_session')
    if (demoCookie?.value) {
      return { id: demoCookie.value }
    }
  } catch {
    // If called in a context where cookies cannot be read
  }

  return null
}
