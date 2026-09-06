import { createClient } from './supabase/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseUrl.startsWith('https://')
)

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
}

// ── Local demo session storage key for fallback mode ──────────────────────────
const DEMO_USER_KEY = 'chithi_demo_auth_user'

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isConfigured) {
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!error && user) {
        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'ব্যবহারকারী',
          avatar: user.user_metadata?.avatar_url,
        }
      }
    } catch (err) {
      console.warn('[Auth] getCurrentUser exception:', err)
    }
  }

  // Check fallback local session in browser
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(DEMO_USER_KEY)
    if (raw) {
      try {
        return JSON.parse(raw) as AuthUser
      } catch {
        localStorage.removeItem(DEMO_USER_KEY)
      }
    }
  }

  return null
}

export async function signInWithEmail(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (isConfigured) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'ব্যবহারকারী',
          avatar: data.user.user_metadata?.avatar_url,
        }
        return { user: authUser, error: null }
      }
    } catch (err) {
      return { user: null, error: err instanceof Error ? err.message : 'Login failed' }
    }
  }

  // Fallback demo login (useful for previewing without live SMTP)
  const demoUser: AuthUser = {
    id: 'user-' + btoa(email).slice(0, 8),
    email,
    name: email.split('@')[0] || 'প্রিয় ব্যবহারকারী',
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser))
    // Also set demo cookie for proxy middleware
    document.cookie = `chithi_session=${demoUser.id}; path=/; max-age=86400`
  }

  return { user: demoUser, error: null }
}

export async function signUpWithEmail(email: string, password: string, name?: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (isConfigured) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
          },
        },
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: name || data.user.email?.split('@')[0] || 'ব্যবহারকারী',
        }
        return { user: authUser, error: null }
      }
    } catch (err) {
      return { user: null, error: err instanceof Error ? err.message : 'Signup failed' }
    }
  }

  // Fallback demo signup
  const demoUser: AuthUser = {
    id: 'user-' + btoa(email).slice(0, 8),
    email,
    name: name || email.split('@')[0] || 'প্রিয় ব্যবহারকারী',
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser))
    document.cookie = `chithi_session=${demoUser.id}; path=/; max-age=86400`
  }

  return { user: demoUser, error: null }
}

export async function signOutUser(): Promise<void> {
  if (isConfigured) {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[Auth] SignOut exception:', err)
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEMO_USER_KEY)
    document.cookie = 'chithi_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }
}
