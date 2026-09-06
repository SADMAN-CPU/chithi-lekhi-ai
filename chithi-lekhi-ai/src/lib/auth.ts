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

  // Check fallback local session in browser (DEVELOPMENT ONLY)
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
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

  // SECURITY: In production, never permit insecure fallback demo login.
  if (process.env.NODE_ENV === 'production') {
    return { user: null, error: 'Authentication service is not configured or unavailable.' }
  }

  // Fallback demo login (DEVELOPMENT ONLY: useful for local preview without live SMTP)
  const demoUser: AuthUser = {
    id: 'user-' + btoa(email).slice(0, 8),
    email,
    name: email.split('@')[0] || 'প্রিয় ব্যবহারকারী',
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser))
    // Also set demo cookie for proxy middleware in dev
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

  // SECURITY: In production, never permit insecure fallback demo signup.
  if (process.env.NODE_ENV === 'production') {
    return { user: null, error: 'Registration service is not configured or unavailable.' }
  }

  // Fallback demo signup (DEVELOPMENT ONLY)
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

export async function resetPasswordForEmail(
  email: string
): Promise<{ success: boolean; error: string | null }> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'অনুগ্রহ করে সঠিক ইমেইল ঠিকানা প্রদান করুন' }
  }

  if (isConfigured) {
    try {
      const supabase = createClient()
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://chithilekhi.com'
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/login?passwordReset=true`,
      })

      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true, error: null }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'পাসওয়ার্ড রিসেট লিংক পাঠাতে সমস্যা হয়েছে',
      }
    }
  }

  // Fallback demo mode
  return { success: true, error: null }
}

export async function updateUserPassword(
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' }
  }

  if (isConfigured) {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true, error: null }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে',
      }
    }
  }

  return { success: true, error: null }
}
