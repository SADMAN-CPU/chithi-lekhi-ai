import { createClient as createBrowserSupabase } from './client'
import { createClient as createServerSupabase } from './server'
import { generateSlug } from '@/utils/helpers'
import type { PublicLetterRow } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseUrl.startsWith('https://')
)

export type LetterExpiration = '24h' | '7d' | 'permanent'

export interface CreatePublicLetterParams {
  receiver_name: string
  letter_content: string
  title?: string
  theme?: string
  user_id?: string | null
  letter_id?: string | null
  is_public?: boolean
  expiration?: LetterExpiration
}

export type PublicLetterLookupStatus = 'ok' | 'expired' | 'private' | 'not_found'

export interface PublicLetterLookupResult {
  status: PublicLetterLookupStatus
  letter: PublicLetterRow | null
  isExpired: boolean
  isPrivate: boolean
}

// In-Memory store for offline/local development & tests
const inMemoryPublicLetters: Map<string, PublicLetterRow> = new Map()

/**
 * Calculate expires_at timestamp based on expiration option
 */
export function calculateExpirationTimestamp(expiration: LetterExpiration): string | null {
  const now = Date.now()
  if (expiration === '24h') {
    return new Date(now + 24 * 60 * 60 * 1000).toISOString()
  }
  if (expiration === '7d') {
    return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
  }
  return null // Permanent
}

/**
 * Create a new public shareable letter record
 */
export async function createPublicLetter(
  params: CreatePublicLetterParams,
  isServer = false
): Promise<PublicLetterRow> {
  const short_id = generateSlug(8)
  const expiration = params.expiration || 'permanent'
  const expires_at = calculateExpirationTimestamp(expiration)
  const title = params.title || `চিঠি — প্রিয় ${params.receiver_name}-এর জন্য`
  const now = new Date().toISOString()
  const is_public = params.is_public !== undefined ? params.is_public : true
  const theme = params.theme || 'vintage'

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      const { data, error } = await client
        .from('public_letters')
        .insert({
          short_id,
          user_id: params.user_id ?? null,
          letter_id: params.letter_id ?? null,
          title,
          receiver_name: params.receiver_name,
          letter_content: params.letter_content,
          theme,
          is_public,
          expiration,
          expires_at,
          views: 0,
        })
        .select()
        .single()

      if (!error && data) {
        return data as PublicLetterRow
      }
      if (error) {
        console.warn('[PublicLetters] Insert error, fallback to local store:', error.message)
      }
    } catch (err) {
      console.warn('[PublicLetters] Insert exception, fallback to local store:', err)
    }
  }

  // Fallback in-memory
  const record: PublicLetterRow = {
    id: `pub-${Date.now()}-${short_id}`,
    short_id,
    user_id: params.user_id ?? null,
    letter_id: params.letter_id ?? null,
    title,
    receiver_name: params.receiver_name,
    letter_content: params.letter_content,
    theme,
    is_public,
    expiration,
    expires_at,
    views: 0,
    created_at: now,
  }

  inMemoryPublicLetters.set(record.short_id, record)
  inMemoryPublicLetters.set(record.id, record)
  return record
}

/**
 * Fetch public letter by short_id or id, checking expiration and privacy
 */
export async function getPublicLetter(
  shortIdOrId: string,
  incrementViews = false,
  isServer = false
): Promise<PublicLetterLookupResult> {
  let record: PublicLetterRow | null = null

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      // Try by short_id first, then id
      const { data, error } = await client
        .from('public_letters')
        .select('*')
        .or(`short_id.eq.${shortIdOrId},id.eq.${shortIdOrId}`)
        .maybeSingle()

      if (!error && data) {
        record = data as PublicLetterRow
      }
    } catch (err) {
      console.warn('[PublicLetters] Lookup exception:', err)
    }
  }

  if (!record) {
    record = inMemoryPublicLetters.get(shortIdOrId) || null
  }

  if (!record) {
    return {
      status: 'not_found',
      letter: null,
      isExpired: false,
      isPrivate: false,
    }
  }

  // Check Expiration
  if (record.expires_at) {
    const expiresAt = new Date(record.expires_at).getTime()
    if (expiresAt < Date.now()) {
      return {
        status: 'expired',
        letter: record,
        isExpired: true,
        isPrivate: !record.is_public,
      }
    }
  }

  // Check Privacy Mode
  if (!record.is_public) {
    return {
      status: 'private',
      letter: record,
      isExpired: false,
      isPrivate: true,
    }
  }

  // Increment views if requested
  if (incrementViews) {
    const updatedViews = await incrementPublicLetterViews(record.short_id, isServer)
    record.views = updatedViews
  }

  return {
    status: 'ok',
    letter: record,
    isExpired: false,
    isPrivate: false,
  }
}

/**
 * Atomically increment views for a public letter
 */
export async function incrementPublicLetterViews(
  shortId: string,
  isServer = false
): Promise<number> {
  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      await client.rpc('increment_public_letter_views', { target_short_id: shortId })
    } catch (err) {
      console.warn('[PublicLetters] incrementViews exception:', err)
    }
  }

  const local = inMemoryPublicLetters.get(shortId)
  if (local) {
    local.views += 1
    return local.views
  }
  return 1
}

/**
 * Get all shared letters created by a specific user
 */
export async function getUserSharedLetters(
  userId: string,
  isServer = false
): Promise<PublicLetterRow[]> {
  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      const { data, error } = await client
        .from('public_letters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        return data as PublicLetterRow[]
      }
    } catch (err) {
      console.warn('[PublicLetters] getUserSharedLetters exception:', err)
    }
  }

  const list: PublicLetterRow[] = []
  for (const item of inMemoryPublicLetters.values()) {
    if (item.user_id === userId && !list.some((existing) => existing.id === item.id)) {
      list.push(item)
    }
  }
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
