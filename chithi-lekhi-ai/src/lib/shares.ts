import { createClient as createBrowserSupabase } from './supabase/client'
import { createClient as createServerSupabase } from './supabase/server'
import { createAdminClient, isServiceRoleConfigured } from './supabase/admin'
import { getLetterById, getLetterByShareId, incrementLetterViews } from './supabase/letters'
import { generateSlug, isUuid, isShareIdentifier } from '@/utils/helpers'
import type { ShareRow, ShareAnalyticsRow, LetterRow } from '@/types/database'
import { getPublicLetter, getUserSharedLetters as getLegacyUserSharedLetters } from './supabase/public-letters'
import type { PublicLetterRow } from '@/types/database'
import { isSupabaseConfigured } from './supabase/config'

const isConfigured = isSupabaseConfigured

export type ShareExpiration = '24h' | '7d' | 'never'

export interface CreateShareParams {
  letter_id: string
  user_id?: string | null
  is_public?: boolean
  expiration?: ShareExpiration
  audio_url?: string | null
}

export type ShareLookupStatus = 'ok' | 'expired' | 'private' | 'not_found'

export interface ShareLookupResult {
  status: ShareLookupStatus
  share: ShareRow | null
  letter: LetterRow | null
  isExpired: boolean
  isPrivate: boolean
}

// ── In-Memory Store for Offline / Test Development ───────────────────────────
const inMemoryShares: Map<string, ShareRow> = new Map()
const inMemoryAnalytics: ShareAnalyticsRow[] = []

export function getAllShares(): ShareRow[] {
  return Array.from(new Map(Array.from(inMemoryShares.values()).map(share => [share.id, share])).values())
}

/**
 * Compute expiration timestamp
 */
export function calculateShareExpiresAt(expiration: ShareExpiration): string | null {
  const now = Date.now()
  if (expiration === '24h') {
    return new Date(now + 24 * 60 * 60 * 1000).toISOString()
  }
  if (expiration === '7d') {
    return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
  }
  return null // Never
}

/**
 * Create an independent share without changing the letter’s publication settings
 */
export async function createShareRecord(
  params: CreateShareParams,
  isServer = false
): Promise<ShareRow> {
  // Independent tokens preserve each share's expiration and avoid duplicate inserts.
  const share_token = generateSlug()
  const expiration = params.expiration || 'never'
  const expires_at = calculateShareExpiresAt(expiration)
  const is_public = params.is_public !== undefined ? params.is_public : true
  const now = new Date().toISOString()

  let record: ShareRow | null = null

  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production sharing')
  }
  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()
      const { data, error } = await client
        .from('shares')
        .insert({
          letter_id: params.letter_id,
          user_id: params.user_id ?? null,
          share_token,
          is_public,
          expiration,
          expires_at,
          views: 0,
          shares_count: 0,
          downloads_count: 0,
          audio_url: params.audio_url ?? null,
        })
        .select()
        .single()

      if (!error && data) {
        record = data as ShareRow
      }
      if (!data && !error) throw new Error('Share save failed: No record returned')
      if (error) {
        throw new Error(`Share save failed: ${error.message}`)
      }
    } catch (err) {
      console.error('[Shares] Share persistence failed:', err)
      throw err
    }
  }

  // Fallback in-memory
  if (!record) {
    record = {
      id: `share-${Date.now()}-${share_token}`,
      letter_id: params.letter_id,
      user_id: params.user_id ?? null,
      share_token,
      is_public,
      expiration,
      expires_at,
      views: 0,
      shares_count: 0,
      downloads_count: 0,
      audio_url: params.audio_url ?? null,
      created_at: now,
    }

    inMemoryShares.set(record.share_token, record)
    inMemoryShares.set(record.id, record)
  }

  return record
}

/**
 * Lookup share and associated letter by token or ID.
 * Employs Option B (SECURITY DEFINER RPC function `get_shared_letter_by_token`)
 * to allow strict token-based access without broadly exposing all letters to public enumeration.
 */
export async function getShareByToken(
  tokenOrId: string,
  incrementViews = false,
  isServer = false
): Promise<ShareLookupResult> {
  if (!isShareIdentifier(tokenOrId)) {
    return { status: 'not_found', share: null, letter: null, isExpired: false, isPrivate: false }
  }
  // 1. Primary: Use secure PostgreSQL RPC function (Option B: SECURITY DEFINER)
  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production sharing')
  }
  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()
      const { data: rpcData, error: rpcError } = await client.rpc('get_shared_letter_by_token', {
        token_param: tokenOrId,
      })

      if (rpcError && rpcError.code !== 'PGRST202' && rpcError.code !== '42883') {
        throw new Error(`Share lookup failed: ${rpcError.message}`)
      }
      if (!rpcError && rpcData) {
        const parsed = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData
        if (parsed.status === 'ok' && parsed.letter && parsed.share) {
          const shareObj = parsed.share as ShareRow
          const letterObj = parsed.letter as LetterRow

          if (incrementViews) {
            await trackShareEvent(
              {
                token: shareObj.share_token,
                eventType: 'view',
              },
              isServer
            )
            shareObj.views = (shareObj.views || 0) + 1
          }

          return {
            status: 'ok',
            share: shareObj,
            letter: letterObj,
            isExpired: false,
            isPrivate: false,
          }
        }

        if (parsed.status === 'expired') {
          return {
            status: 'expired',
            share: (parsed.share as ShareRow) || null,
            letter: null,
            isExpired: true,
            isPrivate: Boolean(parsed.is_private),
          }
        }

        if (parsed.status === 'private') {
          return {
            status: 'private',
            share: (parsed.share as ShareRow) || null,
            letter: null,
            isExpired: false,
            isPrivate: true,
          }
        }

        if (parsed.status === 'not_found') {
          // Token not recognized by RPC, fall through to fallback
        }
      }
    } catch (rpcEx) {
      console.error('[Shares] Secure RPC lookup failed:', rpcEx)
      throw rpcEx
    }
  }

  // 2. Secondary fallback: Query shares table or in-memory cache
  let share: ShareRow | null = null

  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production sharing')
  }
  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()
      const orFilter = isUuid(tokenOrId)
        ? `share_token.eq.${tokenOrId},id.eq.${tokenOrId}`
        : `share_token.eq.${tokenOrId}`

      const { data, error } = await client
        .from('shares')
        .select('*')
        .or(orFilter)
        .maybeSingle()

      if (error) throw new Error(`Share lookup failed: ${error.message}`)
      share = data as ShareRow | null
    } catch (err) {
      console.error('[Shares] Lookup failed:', err)
      throw err
    }
  }

  if (!isConfigured && !share) {
    share = inMemoryShares.get(tokenOrId) || null
  }

  if (!share) {
    const directLetter = await getLetterByShareId(tokenOrId, isServer)
    if (directLetter) {
      const isPublic = directLetter.is_public === true
      if (!isPublic) {
        return {
          status: 'private',
          share: null,
          letter: null,
          isExpired: false,
          isPrivate: true,
        }
      }
      if (incrementViews) {
        await incrementLetterViews(tokenOrId, isServer)
      }
      const initialViews = (directLetter.view_count || 0) + (incrementViews ? 1 : 0)
      const synthesizedShare: ShareRow = {
        id: `share-auto-${directLetter.id}`,
        letter_id: directLetter.id,
        user_id: directLetter.user_id,
        share_token: directLetter.share_id || directLetter.share_slug || tokenOrId,
        is_public: true,
        expiration: 'never',
        expires_at: null,
        views: initialViews > 0 ? initialViews : 1,
        shares_count: 0,
        downloads_count: 0,
        audio_url: null,
        created_at: directLetter.created_at,
      }
      return {
        status: 'ok',
        share: synthesizedShare,
        letter: directLetter,
        isExpired: false,
        isPrivate: false,
      }
    }

    const legacy = await getPublicLetter(tokenOrId, incrementViews, isServer)
    if (legacy.status !== 'not_found') {
      const record = legacy.letter
      return {
        status: legacy.status, isExpired: legacy.isExpired, isPrivate: legacy.isPrivate,
        share: record ? {
          id: record.id, letter_id: record.letter_id || record.id, user_id: record.user_id,
          share_token: record.short_id, is_public: record.is_public,
          expiration: record.expiration === 'permanent' ? 'never' : record.expiration,
          expires_at: record.expires_at, views: record.views,
          shares_count: 0, downloads_count: 0, audio_url: null, created_at: record.created_at,
        } : null,
        letter: record ? {
          id: record.letter_id || record.id, user_id: record.user_id,
          receiver_name: record.receiver_name, recipient_name: record.receiver_name,
          content: record.letter_content, letter_content: record.letter_content,
          title: record.title, theme: record.theme,
          relationship: null, emotion: null, style: null, era_style: 'vintage',
          language: 'bengali', memory_context: null, status: 'published', favorite: false,
          share_slug: record.short_id, share_id: record.short_id, is_public: record.is_public,
          created_at: record.created_at, updated_at: record.created_at,
        } : null,
      }
    }

    return {
      status: 'not_found',
      share: null,
      letter: null,
      isExpired: false,
      isPrivate: false,
    }
  }

  // Check expiration
  if (share.expires_at) {
    const expTime = new Date(share.expires_at).getTime()
    if (!Number.isFinite(expTime) || expTime <= Date.now()) {
      return {
        status: 'expired',
        share,
        letter: null,
        isExpired: true,
        isPrivate: !share.is_public,
      }
    }
  }

  // Check privacy
  if (!share.is_public) {
    return {
      status: 'private',
      share,
      letter: null,
      isExpired: false,
      isPrivate: true,
    }
  }

  // Fetch linked letter
  const letter = await getLetterById(share.letter_id, isServer)
  if (!letter) return { status: 'not_found', share: null, letter: null, isExpired: false, isPrivate: false }

  // Increment view count if requested
  if (incrementViews) {
    await trackShareEvent(
      {
        token: share.share_token,
        eventType: 'view',
      },
      isServer
    )
    if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production sharing')
  }
  if (isConfigured) {
      share.views += 1
    }
  }

  return {
    status: 'ok',
    share,
    letter,
    isExpired: false,
    isPrivate: false,
  }
}

export interface TrackEventParams {
  token: string
  eventType: 'view' | 'share' | 'download' | 'audio_play' | 'audio_generate'
  platform?: 'whatsapp' | 'facebook' | 'copy_link' | 'image' | 'audio' | 'pdf' | string
}

/**
 * Track analytics event (view, share, download) atomically
 */
export async function trackShareEvent(
  params: TrackEventParams,
  isServer = false
): Promise<boolean> {
  const { token, eventType, platform } = params
  const now = new Date().toISOString()

  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production sharing')
  }
  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()
      // Call atomic RPC function
      const { error: counterError } = await client.rpc('increment_share_event', {
        target_token: token,
        event_type_param: eventType,
      })

      if (counterError) throw new Error(counterError.message)

      // Insert into analytics log
      const { error: logError } = await client.from('share_analytics').insert({
        share_token: token,
        event_type: eventType,
        platform: platform || null,
      })

      if (logError) throw new Error(logError.message)
      return true
    } catch (err) {
      console.error('[Shares] Analytics tracking failed:', err)
      return false
    }
  }

  // Local fallback
  const local = inMemoryShares.get(token)
  if (local) {
    if (eventType === 'view') local.views += 1
    if (eventType === 'share') local.shares_count += 1
    if (eventType === 'download') local.downloads_count += 1
  }

  inMemoryAnalytics.push({
    id: `event-${Date.now()}`,
    share_id: local?.id || null,
    share_token: token,
    event_type: eventType,
    platform: platform || null,
    created_at: now,
  })

  return true
}

/**
 * Get aggregate analytics metrics for a share token
 */
export async function getShareAnalytics(
  token: string,
  isServer = false
): Promise<{ views: number; shares: number; downloads: number }> {
  const lookup = await getShareByToken(token, false, isServer)
  if (lookup.share) {
    return {
      views: lookup.share.views,
      shares: lookup.share.shares_count,
      downloads: lookup.share.downloads_count,
    }
  }
  return { views: 0, shares: 0, downloads: 0 }
}

/** Dashboard history includes canonical shares and legacy public-letter snapshots. */
export async function getUserSharedLetters(userId: string, isServer = false): Promise<PublicLetterRow[]> {
  const legacy = await getLegacyUserSharedLetters(userId, isServer)
  let shares: (ShareRow & { letters?: LetterRow | null })[]
  if (isConfigured) {
    const client = isServer ? await createServerSupabase() : createBrowserSupabase()
    const { data, error } = await client.from('shares').select('*, letters(*)')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
    if (error) throw new Error(`Shared letter history failed: ${error.message}`)
    shares = data || []
  } else {
    shares = await Promise.all(getAllShares().filter(share => share.user_id === userId).map(async share => ({
      ...share, letters: await getLetterById(share.letter_id, isServer),
    })))
  }
  const current: PublicLetterRow[] = shares.flatMap(share => share.letters ? [{
    id: share.id, short_id: share.share_token, user_id: share.user_id,
    letter_id: share.letter_id, title: share.letters.title || `চিঠি — ${share.letters.receiver_name}`,
    receiver_name: share.letters.receiver_name, letter_content: share.letters.content,
    theme: share.letters.theme || 'vintage', is_public: share.is_public,
    expiration: share.expiration === 'never' ? 'permanent' : share.expiration,
    expires_at: share.expires_at, views: share.views, created_at: share.created_at,
  }] : [])
  return [...current, ...legacy].sort((a, b) => b.created_at.localeCompare(a.created_at))
}
