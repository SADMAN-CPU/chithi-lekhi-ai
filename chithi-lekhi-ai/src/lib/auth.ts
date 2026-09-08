import { createClient } from './supabase/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
export const isSupabaseConfigured = Boolean(
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

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured) {
    return null
  }

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

  return null
}

/**
 * Ensures a corresponding profile row exists in public.profiles table
 */
export async function ensureUserProfile(user: {
  id: string
  email?: string | null
  name?: string | null
}): Promise<void> {
  if (!isSupabaseConfigured) return
  try {
    const supabase = createClient()
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!existing) {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email || null,
        name: user.name || user.email?.split('@')[0] || 'ব্যবহারকারী',
      })
    }
  } catch (err) {
    console.warn('[Auth] ensureUserProfile note:', err)
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return {
      user: null,
      error: 'Authentication service is not configured. Please check environment variables.',
    }
  }

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
      await ensureUserProfile(authUser)
      return { user: authUser, error: null }
    }
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে' }
  }

  return { user: null, error: 'লগইন করতে সমস্যা হয়েছে' }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<{ user: AuthUser | null; needsEmailConfirmation?: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return {
      user: null,
      error: 'Registration service is not configured. Please check environment variables.',
    }
  }

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
      const needsEmailConfirmation = !data.session
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || '',
        name: name || data.user.email?.split('@')[0] || 'ব্যবহারকারী',
      }
      if (data.session) {
        await ensureUserProfile(authUser)
      }
      return { user: data.session ? authUser : null, needsEmailConfirmation, error: null }
    }
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'নিবন্ধন ব্যর্থ হয়েছে' }
  }

  return { user: null, error: 'নিবন্ধন করতে সমস্যা হয়েছে' }
}

/**
 * Send OTP to email for passwordless login or verification
 */
export async function signInWithOtp(
  email: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Authentication service is not configured' }
  }

  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'OTP পাঠাতে ব্যর্থ হয়েছে',
    }
  }
}

/**
 * Verify OTP token sent to user's email
 */
export async function verifyOtp(
  email: string,
  token: string,
  type: 'email' | 'signup' | 'magiclink' = 'email'
): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { user: null, error: 'Authentication service is not configured' }
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
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
      await ensureUserProfile(authUser)
      return {
        user: authUser,
        error: null,
      }
    }
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'OTP যাচাই ব্যর্থ হয়েছে' }
  }

  return { user: null, error: 'OTP যাচাই সম্পন্ন করা যায়নি' }
}

export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[Auth] SignOut exception:', err)
    }
  }
}

export async function resetPasswordForEmail(
  email: string
): Promise<{ success: boolean; error: string | null }> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'অনুগ্রহ করে সঠিক ইমেইল ঠিকানা প্রদান করুন' }
  }

  if (!isSupabaseConfigured) {
    return { success: false, error: 'Authentication service is not configured' }
  }

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

export async function updateUserPassword(
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' }
  }

  if (!isSupabaseConfigured) {
    return { success: false, error: 'Authentication service is not configured' }
  }

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
