import { createClient as createBrowserSupabase } from './supabase/client'
import { createClient as createServerSupabase } from './supabase/server'
import { getLetterById, updateLetter, getLetterByShareId, incrementLetterViews } from './supabase/letters'
import { generateSlug } from '@/utils/helpers'
import type { ShareRow, ShareAnalyticsRow, LetterRow } from '@/types/database'
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
  return Array.from(inMemoryShares.values())
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
 * Create a new public share token for a letter and synchronize letter visibility
 */
export async function createShareRecord(
  params: CreateShareParams,
  isServer = false
): Promise<ShareRow> {
  const share_token = generateSlug(6)
  const expiration = params.expiration || 'never'
  const expires_at = calculateShareExpiresAt(expiration)
  const is_public = params.is_public !== undefined ? params.is_public : true
  const now = new Date().toISOString()

  let record: ShareRow | null = null

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
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
      if (error) {
        console.warn('[Shares] Insert error, fallback to local store:', error.message)
      }
    } catch (err) {
      console.warn('[Shares] Insert exception, fallback to local store:', err)
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

  // Synchronize letter visibility properly (Requirement 1 - Option A & B):
  // When a share link is created with is_public = true, update letters.is_public = true
  // and assign the share_slug so that the letter is marked public across database and cache.
  if (is_public) {
    try {
      await updateLetter(
        params.letter_id,
        { is_public: true, share_slug: share_token, share_id: share_token },
        isServer
      )
    } catch (syncErr) {
      console.warn('[Shares] Visibility synchronization error:', syncErr)
    }
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
  // 1. Primary: Use secure PostgreSQL RPC function (Option B: SECURITY DEFINER)
  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      const { data: rpcData, error: rpcError } = await client.rpc('get_shared_letter_by_token', {
        token_param: tokenOrId,
      })

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
      console.warn('[Shares] Secure RPC lookup warning, fallback to direct lookup:', rpcEx)
    }
  }

  // 2. Secondary fallback: Query shares table or in-memory cache
  let share: ShareRow | null = null

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      const { data, error } = await client
        .from('shares')
        .select('*')
        .or(`share_token.eq.${tokenOrId},id.eq.${tokenOrId}`)
        .maybeSingle()

      if (!error && data) {
        share = data as ShareRow
      }
    } catch (err) {
      console.warn('[Shares] Lookup exception:', err)
    }
  }

  if (!share) {
    share = inMemoryShares.get(tokenOrId) || null
  }

  if (!share) {
    const directLetter = await getLetterByShareId(tokenOrId, isServer)
    if (directLetter) {
      const isPublic = directLetter.is_public !== false
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
    if (expTime < Date.now()) {
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

  // Increment view count if requested
  if (incrementViews) {
    await trackShareEvent(
      {
        token: share.share_token,
        eventType: 'view',
      },
      isServer
    )
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

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      // Call atomic RPC function
      await client.rpc('increment_share_event', {
        target_token: token,
        event_type_param: eventType,
      })

      // Insert into analytics log
      await client.from('share_analytics').insert({
        share_token: token,
        event_type: eventType,
        platform: platform || null,
      })

      return true
    } catch (err) {
      console.warn('[Shares] Analytics tracking exception:', err)
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
