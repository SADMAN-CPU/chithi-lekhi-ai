import { createClient } from './supabase/client'
import { getSupabaseEnv, isSupabaseConfigured } from './supabase/config'

export { isSupabaseConfigured }

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
}

/**
 * Human-friendly error translation for Supabase auth exceptions
 */
export function formatAuthError(error: unknown, fallback?: string): string {
  const defaultFallback = 'একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন। (An unexpected error occurred.)'
  const fallbackMsg = fallback || defaultFallback
  if (!error) return fallbackMsg

  let msg = ''
  if (typeof error === 'string') {
    msg = error
  } else if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      msg = (error as { message: string }).message
    } else if (error instanceof Error) {
      msg = error.message
    } else {
      msg = String(error)
    }
  } else {
    msg = String(error)
  }

  const lower = msg.toLowerCase()

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। (Invalid email or password)'
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে লগইন করুন। (Email already registered)'
  }
  if (lower.includes('email not confirmed')) {
    return 'আপনার ইমেইল ঠিকানা এখনো নিশ্চিত করা হয়নি। ইনবক্স চেক করে ভেরিফাই করুন। (Email not confirmed)'
  }
  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে। (Password must be at least 6 characters)'
  }
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('fetch failed')) {
    return 'নেটওয়ার্ক সংযোগে সমস্যা হয়েছে। ইন্টারনেট চেক করে আবার চেষ্টা করুন। (Network error)'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'খুব বেশি চেষ্টা করা হয়েছে। কিছুক্ষণ অপেক্ষা করুন। (Rate limit exceeded)'
  }

  return msg || fallbackMsg
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
  avatar?: string | null
}): Promise<void> {
  if (!isSupabaseConfigured) return
  try {
    const supabase = createClient()
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, name, email, avatar')
      .eq('id', user.id)
      .maybeSingle()

    const userName = user.name || user.email?.split('@')[0] || 'ব্যবহারকারী'

    if (!existing) {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email || null,
        name: userName,
        avatar: user.avatar || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } else {
      // Update name/email if currently missing
      await supabase
        .from('profiles')
        .update({
          email: user.email || existing.email,
          name: existing.name || userName,
          avatar: user.avatar || existing.avatar,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    }
  } catch (err) {
    console.warn('[Auth] ensureUserProfile note:', err)
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const env = getSupabaseEnv()
  if (!env.isConfigured) {
    return {
      user: null,
      error:
        'অথেন্টিকেশন সার্ভিস কনফিগার করা হয়নি। পরিবেশ ভেরিয়েবলে Supabase keys (NEXT_PUBLIC_SUPABASE_URL & ANON_KEY) যাচাই করুন।',
    }
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      return { user: null, error: formatAuthError(error, 'লগইন ব্যর্থ হয়েছে') }
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
    return { user: null, error: formatAuthError(err, 'লগইন ব্যর্থ হয়েছে') }
  }

  return { user: null, error: 'লগইন করতে সমস্যা হয়েছে' }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<{ user: AuthUser | null; needsEmailConfirmation?: boolean; error: string | null }> {
  const env = getSupabaseEnv()
  if (!env.isConfigured) {
    return {
      user: null,
      error:
        'রেজিস্ট্রেশন সার্ভিস কনফিগার করা হয়নি। পরিবেশ ভেরিয়েবলে Supabase keys (NEXT_PUBLIC_SUPABASE_URL & ANON_KEY) যাচাই করুন।',
    }
  }

  try {
    const supabase = createClient()
    const trimmedEmail = email.trim()
    const trimmedName = (name || '').trim() || trimmedEmail.split('@')[0]

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
        },
      },
    })

    if (error) {
      return { user: null, error: formatAuthError(error, 'নিবন্ধন ব্যর্থ হয়েছে') }
    }

    if (data.user) {
      const needsEmailConfirmation = !data.session
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || trimmedEmail,
        name: trimmedName,
      }
      if (data.session) {
        await ensureUserProfile(authUser)
      }
      return { user: data.session ? authUser : null, needsEmailConfirmation, error: null }
    }
  } catch (err) {
    return { user: null, error: formatAuthError(err, 'নিবন্ধন ব্যর্থ হয়েছে') }
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
  const trimmed = email.trim()
  if (!trimmed || !trimmed.includes('@')) {
    return { success: false, error: 'অনুগ্রহ করে সঠিক ইমেইল ঠিকানা প্রদান করুন' }
  }

  const env = getSupabaseEnv()
  if (!env.isConfigured) {
    return {
      success: false,
      error:
        'পাসওয়ার্ড রিসেট সার্ভিস কনফিগার করা হয়নি। পরিবেশ ভেরিয়েবলে Supabase keys যাচাই করুন।',
    }
  }

  try {
    const supabase = createClient()
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL || 'https://chithilekhi.com')
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      return { success: false, error: formatAuthError(error, 'পাসওয়ার্ড রিসেট লিংক পাঠাতে সমস্যা হয়েছে') }
    }
    return { success: true, error: null }
  } catch (err) {
    return {
      success: false,
      error: formatAuthError(err, 'পাসওয়ার্ড রিসেট লিংক পাঠাতে সমস্যা হয়েছে'),
    }
  }
}

export async function updateUserPassword(
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' }
  }

  const env = getSupabaseEnv()
  if (!env.isConfigured) {
    return {
      success: false,
      error:
        'পাসওয়ার্ড আপডেট সার্ভিস কনফিগার করা হয়নি। পরিবেশ ভেরিয়েবলে Supabase keys যাচাই করুন।',
    }
  }

  try {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      return { success: false, error: formatAuthError(error, 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে') }
    }
    return { success: true, error: null }
  } catch (err) {
    return {
      success: false,
      error: formatAuthError(err, 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে'),
    }
  }
}
