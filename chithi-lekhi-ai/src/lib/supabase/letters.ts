import { createClient as createBrowserSupabase } from './client'
import { createClient as createServerSupabase } from './server'
import { createAdminClient, isServiceRoleConfigured } from './admin'
import type { LetterRow, LetterInsert, LetterUpdate, DownloadHistoryRow } from '@/types/database'
import { generateSlug } from '@/utils/helpers'
import { isSupabaseConfigured } from './config'

const isConfigured = isSupabaseConfigured

// ── In-Memory Development Store ──────────────────────────────────────────────
// Ensures local tests and development without a live Supabase project work seamlessly.
const inMemoryStore: Map<string, LetterRow> = new Map()
const inMemoryDownloads: Map<string, DownloadHistoryRow> = new Map()

// ── 1. Create Letter ─────────────────────────────────────────────────────────
export async function createLetter(
  data: Omit<LetterInsert, 'id' | 'created_at' | 'updated_at'>,
  isServer = false
): Promise<LetterRow> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `letter-${Date.now()}`
  const now = new Date().toISOString()
  const slug = data.share_id || data.share_slug || generateSlug(6)
  const status = data.status || 'published'
  const letterBody = data.letter_content || data.content || ''
  const recipientName = data.recipient_name || data.receiver_name
  const letterStyle = data.letter_style || data.era_style || data.style || 'vintage'

  if (isConfigured) {
    try {
      // Use service role admin client on server if available to guarantee persistence
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()

      const { data: inserted, error } = await client
        .from('letters')
        .insert({
          ...data,
          receiver_name: recipientName,
          recipient_name: recipientName,
          content: letterBody,
          letter_content: letterBody,
          era_style: letterStyle,
          letter_style: letterStyle,
          status,
          share_slug: slug,
          share_id: slug,
          view_count: data.view_count ?? 0,
          favorite: data.favorite ?? false,
          is_public: data.is_public ?? false,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) {
        console.warn('[Supabase letters] Insert error, falling back to local store:', error.message)
      } else if (inserted) {
        const record = inserted as LetterRow
        inMemoryStore.set(record.id, record)
        if (record.share_id) inMemoryStore.set(record.share_id, record)
        if (record.share_slug) inMemoryStore.set(record.share_slug, record)
        return record
      }
    } catch (err) {
      console.warn('[Supabase letters] Insert exception, falling back to local store:', err)
    }
  }

  // Fallback / Development mode
  const record: LetterRow = {
    id: newId,
    user_id: data.user_id ?? null,
    receiver_name: recipientName,
    recipient_name: recipientName,
    title: data.title ?? null,
    relationship: data.relationship ?? null,
    emotion: data.emotion ?? null,
    style: letterStyle,
    letter_style: letterStyle,
    personality: data.personality ?? null,
    era_style: letterStyle,
    language: data.language || 'bengali',
    memory_context: data.memory_context ?? null,
    content: letterBody,
    letter_content: letterBody,
    theme: data.theme || 'vintage',
    status,
    favorite: data.favorite ?? data.is_favorite ?? false,
    is_favorite: data.is_favorite ?? data.favorite ?? false,
    share_slug: slug,
    share_id: slug,
    view_count: data.view_count ?? 0,
    is_public: data.is_public ?? false,
    image_url: data.image_url ?? null,
    pdf_url: data.pdf_url ?? null,
    created_at: now,
    updated_at: now,
  }

  inMemoryStore.set(record.id, record)
  inMemoryStore.set(slug, record)
  return record
}

// Convenient aliases
export const saveLetter = createLetter
export const toggleFavorite = toggleLetterFavorite

// ── 2. Get Letter by ID ───────────────────────────────────────────────────────
export async function getLetterById(id: string, isServer = false): Promise<LetterRow | null> {
  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()

      const { data, error } = await client
        .from('letters')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!error && data) {
        return data as LetterRow
      }
    } catch (err) {
      console.warn('[Supabase letters] getLetterById error:', err)
    }
  }

  return inMemoryStore.get(id) || null
}

// ── 3. Get Letter by Share Slug ──────────────────────────────────────────────
export async function getLetterBySlug(slug: string, isServer = false): Promise<LetterRow | null> {
  return getLetterByShareId(slug, isServer)
}

// ── 3b. Unified Get Letter by Share ID or Slug ──────────────────────────────
export async function getLetterByShareId(shareId: string, isServer = false): Promise<LetterRow | null> {
  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()

      const { data, error } = await client
        .from('letters')
        .select('*')
        .or(`share_id.eq.${shareId},share_slug.eq.${shareId},id.eq.${shareId}`)
        .maybeSingle()

      if (!error && data) {
        return data as LetterRow
      }
    } catch (err) {
      console.warn('[Supabase letters] getLetterByShareId error:', err)
    }
  }

  const direct = inMemoryStore.get(shareId)
  if (direct) return direct

  for (const letter of inMemoryStore.values()) {
    if (letter.share_id === shareId || letter.share_slug === shareId || letter.id === shareId) {
      return letter
    }
  }

  return null
}

// ── 3c. Safely Increment View Count ─────────────────────────────────────────
export async function incrementLetterViews(shareIdOrId: string, isServer = false): Promise<number> {
  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()

      // Try atomic RPC procedure first
      const { data: rpcViews, error: rpcErr } = await client.rpc('increment_letter_view_count', {
        target_share_id: shareIdOrId,
      })

      if (!rpcErr && typeof rpcViews === 'number') {
        return rpcViews
      }

      // Fallback: direct update
      const existing = await getLetterByShareId(shareIdOrId, isServer)
      if (existing) {
        const nextViews = (existing.view_count || 0) + 1
        await client
          .from('letters')
          .update({ view_count: nextViews })
          .eq('id', existing.id)
        return nextViews
      }
    } catch (err) {
      console.warn('[Supabase letters] incrementLetterViews error:', err)
    }
  }

  const inMem = inMemoryStore.get(shareIdOrId)
  if (inMem) {
    inMem.view_count = (inMem.view_count || 0) + 1
    return inMem.view_count
  }

  return 1
}

export interface GetUserLettersOptions {
  limit?: number
  offset?: number
  favoritesOnly?: boolean
  status?: 'published' | 'draft' | 'all'
  emotion?: string
  relationship?: string
  timeframe?: 'today' | 'week' | 'month' | 'all'
  searchQuery?: string
}

// ── 4. Get User Letters (with Multi-Filters) ───────────────────────────────────
export async function getUserLetters(
  userId: string,
  options?: GetUserLettersOptions,
  isServer = false
): Promise<LetterRow[]> {
  const limit = options?.limit ?? 100
  const offset = options?.offset ?? 0

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      let query = client
        .from('letters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (options?.favoritesOnly) {
        query = query.eq('favorite', true)
      }

      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }

      if (options?.emotion && options.emotion !== 'all') {
        query = query.eq('emotion', options.emotion)
      }

      if (options?.relationship && options.relationship !== 'all') {
        query = query.eq('relationship', options.relationship)
      }

      // Date timeframe filters
      if (options?.timeframe && options.timeframe !== 'all') {
        const now = new Date()
        let cutoff: Date | null = null
        if (options.timeframe === 'today') {
          cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (options.timeframe === 'week') {
          cutoff = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
        } else if (options.timeframe === 'month') {
          cutoff = new Date(now.getFullYear(), now.getMonth(), 1)
        }
        if (cutoff) {
          query = query.gte('created_at', cutoff.toISOString())
        }
      }

      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (!error && data) {
        return data as LetterRow[]
      }
    } catch (err) {
      console.warn('[Supabase letters] getUserLetters error:', err)
    }
  }

  // Fallback filter
  const results = Array.from(inMemoryStore.values())
    .filter((l) => l.user_id === userId)
    .filter((l) => (options?.favoritesOnly ? l.favorite : true))
    .filter((l) => (!options?.status || options.status === 'all' ? true : (l.status || 'published') === options.status))
    .filter((l) => (!options?.emotion || options.emotion === 'all' ? true : l.emotion === options.emotion))
    .filter((l) => (!options?.relationship || options.relationship === 'all' ? true : l.relationship === options.relationship))
    .filter((l) => {
      if (!options?.timeframe || options.timeframe === 'all') return true
      const letterTime = new Date(l.created_at).getTime()
      const now = new Date()
      if (options.timeframe === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        return letterTime >= startOfDay
      }
      if (options.timeframe === 'week') {
        return letterTime >= now.getTime() - 7 * 24 * 3600 * 1000
      }
      if (options.timeframe === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
        return letterTime >= startOfMonth
      }
      return true
    })
    .filter((l) => {
      if (!options?.searchQuery?.trim()) return true
      const q = options.searchQuery.toLowerCase()
      return (
        l.receiver_name.toLowerCase().includes(q) ||
        l.content.toLowerCase().includes(q) ||
        (l.emotion && l.emotion.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(offset, offset + limit)

  return results
}

// ── 5. Toggle Favorite ────────────────────────────────────────────────────────
export async function toggleLetterFavorite(
  letterId: string,
  currentFavorite: boolean,
  isServer = false
): Promise<boolean> {
  const newFavorite = !currentFavorite

  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()
      const { error } = await client
        .from('letters')
        .update({ favorite: newFavorite, updated_at: new Date().toISOString() })
        .eq('id', letterId)

      if (!error) {
        return newFavorite
      }
    } catch (err) {
      console.warn('[Supabase letters] toggleFavorite error:', err)
    }
  }

  const existing = inMemoryStore.get(letterId)
  if (existing) {
    existing.favorite = newFavorite
    existing.updated_at = new Date().toISOString()
    inMemoryStore.set(letterId, existing)
    return newFavorite
  }

  return newFavorite
}

// ── 6. Update Letter Content ──────────────────────────────────────────────────
export async function updateLetter(
  letterId: string,
  updates: LetterUpdate,
  isServer = false
): Promise<LetterRow | null> {
  const now = new Date().toISOString()
  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()
      const { data, error } = await client
        .from('letters')
        .update({ ...updates, updated_at: now })
        .eq('id', letterId)
        .select()
        .single()

      if (!error && data) {
        return data as LetterRow
      }
    } catch (err) {
      console.warn('[Supabase letters] updateLetter error:', err)
    }
  }

  const existing = inMemoryStore.get(letterId)
  if (existing) {
    const syncedBody = updates.content || updates.letter_content || existing.content
    const updated = {
      ...existing,
      ...updates,
      content: syncedBody,
      letter_content: syncedBody,
      updated_at: now,
    } as LetterRow
    inMemoryStore.set(letterId, updated)
    return updated
  }

  return null
}

// ── 7. Delete Letter ──────────────────────────────────────────────────────────
export async function deleteLetter(letterId: string, isServer = false): Promise<boolean> {
  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()
      const { error } = await client
        .from('letters')
        .delete()
        .eq('id', letterId)

      if (!error) {
        return true
      }
    } catch (err) {
      console.warn('[Supabase letters] deleteLetter error:', err)
    }
  }

  return inMemoryStore.delete(letterId)
}

// ── 8. Download History ───────────────────────────────────────────────────────
export async function recordDownload(
  userId: string,
  letterId: string | null,
  format: 'pdf' | 'png' | 'txt',
  isServer = false
): Promise<DownloadHistoryRow> {
  const now = new Date().toISOString()

  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()
      const { data, error } = await client
        .from('download_history')
        .insert({
          user_id: userId,
          letter_id: letterId,
          format,
        })
        .select()
        .single()

      if (!error && data) {
        return data as DownloadHistoryRow
      }
    } catch (err) {
      console.warn('[Supabase letters] recordDownload error:', err)
    }
  }

  const newId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const record: DownloadHistoryRow = {
    id: newId,
    user_id: userId,
    letter_id: letterId,
    format,
    created_at: now,
  }

  inMemoryDownloads.set(record.id, record)
  return record
}

export async function getUserDownloads(
  userId: string,
  isServer = false
): Promise<DownloadHistoryRow[]> {
  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()
      const { data, error } = await client
        .from('download_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        return data as DownloadHistoryRow[]
      }
    } catch (err) {
      console.warn('[Supabase letters] getUserDownloads error:', err)
    }
  }

  const results = Array.from(inMemoryDownloads.values())
    .filter((d) => d.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return results
}
