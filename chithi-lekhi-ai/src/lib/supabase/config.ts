/**
 * Centralized Supabase & Environment Validation
 * Validates production & local configuration, prevents silent failures,
 * and provides clear developer diagnostics.
 */

export interface SupabaseEnvConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string
  isConfigured: boolean
  error?: string
}

function isPlaceholder(value?: string | null): boolean {
  if (!value) return true
  const lower = value.trim().toLowerCase()
  return (
    lower.length === 0 ||
    lower.includes('your_') ||
    lower.includes('your-') ||
    lower.includes('placeholder') ||
    lower === 'undefined' ||
    lower === 'null'
  )
}

function isValidHttpUrl(stringUrl?: string | null): boolean {
  if (!stringUrl || isPlaceholder(stringUrl)) return false
  try {
    const parsed = new URL(stringUrl)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function getSupabaseEnv(): SupabaseEnvConfig {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

  if (!url || isPlaceholder(url) || !isValidHttpUrl(url)) {
    return {
      url: '',
      anonKey: '',
      serviceRoleKey,
      isConfigured: false,
      error:
        'NEXT_PUBLIC_SUPABASE_URL is missing or set to placeholder. Please configure a valid Supabase project URL (e.g., https://xxxx.supabase.co).',
    }
  }

  if (!anonKey || isPlaceholder(anonKey)) {
    return {
      url,
      anonKey: '',
      serviceRoleKey,
      isConfigured: false,
      error:
        'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or set to placeholder. Please configure your Supabase public anon key.',
    }
  }

  return {
    url,
    anonKey,
    serviceRoleKey: isPlaceholder(serviceRoleKey) ? undefined : serviceRoleKey,
    isConfigured: true,
  }
}

export const isSupabaseConfigured = getSupabaseEnv().isConfigured
