import { createClient as createBrowserSupabase } from './client'
import { createClient as createServerSupabase } from './server'
import { createAdminClient, isServiceRoleConfigured } from './admin'
import type { LetterRow, LetterInsert, LetterUpdate, DownloadHistoryRow } from '@/types/database'
import { generateSlug, isUuid, isShareIdentifier } from '@/utils/helpers'
import { isSupabaseConfigured } from './config'

const isConfigured = isSupabaseConfigured

// ── In-Memory Development Store ──────────────────────────────────────────────
// Ensures local tests and development without a live Supabase project work seamlessly.
const inMemoryStore: Map<string, LetterRow> = new Map()
const inMemoryDownloads: Map<string, DownloadHistoryRow> = new Map()

/** Current editable text; generated_content remains the original AI version. */
export function getLetterContent(letter: Partial<LetterRow>): string {
  return letter.content ?? letter.letter_content ?? letter.enhanced_content ??
    letter.enhanced_letter ?? letter.generated_content ?? ''
}

// ── 1. Create Letter ─────────────────────────────────────────────────────────
export async function createLetter(
  data: Omit<LetterInsert, 'id' | 'created_at' | 'updated_at'>,
  isServer = false
): Promise<LetterRow> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `letter-${Date.now()}`
  const now = new Date().toISOString()
  const slug = data.share_id || data.share_slug || generateSlug()
  const status = data.status || 'published'
  const letterBody = getLetterContent(data)
  const generatedContent = data.generated_content ?? letterBody
  const recipientName = data.recipient_name || data.receiver_name
  const letterStyle = data.letter_style || data.era_style || data.style || 'vintage'
  const originalInput = data.original_input || data.original_letter || letterBody
  const originalBody = data.original_letter || originalInput
  const enhancedContent = data.enhanced_content || data.enhanced_letter || null
  const enhancedBody = data.enhanced_letter || enhancedContent
  const enhancementStyle = data.enhancement_style || null

  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production persistence')
  }
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
          original_input: originalInput,
          original_letter: originalBody,
          generated_content: generatedContent,
          enhanced_content: enhancedContent,
          enhanced_letter: enhancedBody,
          era_style: letterStyle,
          letter_style: letterStyle,
          enhancement_style: enhancementStyle,
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
        console.error('[Supabase letters] Database insert error:', error.message)
        throw new Error(`Database save failed: ${error.message}`)
      } else if (inserted) {
        const record = inserted as LetterRow
        return record
      }
      throw new Error('Database save failed: No record returned from database')
    } catch (err) {
      console.error('[Supabase letters] Insert exception in configured environment:', err)
      throw err
    }
  }

  // Fallback / Local development mode (only when Supabase is unconfigured)
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
    original_input: originalInput,
    original_letter: originalBody,
    generated_content: generatedContent,
    enhanced_content: enhancedContent,
    enhanced_letter: enhancedBody,
    enhancement_style: enhancementStyle,
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
  if (isConfigured && !isUuid(id)) return null
  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production persistence')
  }
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

      if (error) throw new Error(`Letter lookup failed: ${error.message}`)
      return data as LetterRow | null
    } catch (err) {
      console.error('[Supabase letters] getLetterById error:', err)
      throw err
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
  if (!isShareIdentifier(shareId)) return null
  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production persistence')
  }
  if (isConfigured) {
    try {
      const client = isServer
        ? (isServiceRoleConfigured() ? createAdminClient() : await createServerSupabase())
        : createBrowserSupabase()

      const orFilter = isUuid(shareId)
        ? `share_id.eq.${shareId},share_slug.eq.${shareId},id.eq.${shareId}`
        : `share_id.eq.${shareId},share_slug.eq.${shareId}`

      const { data, error } = await client
        .from('letters')
        .select('*')
        .or(orFilter)
        .maybeSingle()

      if (error) throw new Error(`Letter lookup failed: ${error.message}`)
      return data as LetterRow | null
    } catch (err) {
      console.error('[Supabase letters] getLetterByShareId error:', err)
      throw err
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
  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production persistence')
  }
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

  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production persistence')
  }
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

      if (error) throw new Error(`Letter list failed: ${error.message}`)
      return (data || []) as LetterRow[]
    } catch (err) {
      console.error('[Supabase letters] getUserLetters error:', err)
      throw err
    }
  }

  // Fallback filter
  const results = Array.from(new Map(Array.from(inMemoryStore.values()).map(letter => [letter.id, letter])).values())
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
  const updated = await updateLetter(letterId, { favorite: !currentFavorite, is_favorite: !currentFavorite }, isServer)
  if (!updated) throw new Error('Letter not found or not owned by the current user')
  return updated.favorite
}

// ── 6. Update Letter Content ──────────────────────────────────────────────────
export async function updateLetter(
  letterId: string,
  updates: LetterUpdate,
  isServer = false
): Promise<LetterRow | null> {
  if (isConfigured && !isUuid(letterId)) throw new Error('Invalid letter ID')
  const normalized: LetterUpdate = { ...updates }
  const body = updates.content ?? updates.letter_content ?? updates.generated_content ?? undefined
  if (body !== undefined) {
    normalized.content = body
    normalized.letter_content = body
  }
  for (const [canonical, legacy] of [
    ['recipient_name', 'receiver_name'],
    ['original_input', 'original_letter'],
    ['enhanced_content', 'enhanced_letter'],
    ['share_id', 'share_slug'],
    ['favorite', 'is_favorite'],
  ] as const) {
    const value = updates[canonical] !== undefined ? updates[canonical] : updates[legacy]
    if (value !== undefined) Object.assign(normalized, { [canonical]: value, [legacy]: value })
  }
  const now = new Date().toISOString()
  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production persistence')
  }
  if (isConfigured) {
    try {
      const client = isServer
        ? await createServerSupabase()
        : createBrowserSupabase()
      const { data, error } = await client
        .from('letters')
        .update({ ...normalized, updated_at: now })
        .eq('id', letterId)
        .select()
        .maybeSingle()

      if (error) {
        console.error('[Supabase letters] updateLetter database error:', error.message)
        throw new Error(`Database update failed: ${error.message}`)
      }

      if (data) {
        const record = data as LetterRow
        return record
      }
      return null
    } catch (err) {
      console.error('[Supabase letters] updateLetter persistence failure:', err)
      throw err
    }
  }

  const existing = inMemoryStore.get(letterId)
  if (!existing) return null
  const updated = { ...existing, ...normalized, updated_at: now }
  for (const [key, letter] of inMemoryStore) {
    if (letter.id === letterId) inMemoryStore.delete(key)
  }
  inMemoryStore.set(letterId, updated)
  if (updated.share_id) inMemoryStore.set(updated.share_id, updated)
  if (updated.share_slug) inMemoryStore.set(updated.share_slug, updated)
  return updated
}

// ── 7. Delete Letter ──────────────────────────────────────────────────────────
export async function deleteLetter(letterId: string, isServer = false): Promise<boolean> {
  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production persistence')
  }
  if (isConfigured) {
    try {
      const client = isServer
        ? await createServerSupabase()
        : createBrowserSupabase()
      if (!isUuid(letterId)) return false
      const { data, error } = await client
        .from('letters')
        .delete()
        .eq('id', letterId)
        .select('id')
      if (error) throw new Error(`Letter delete failed: ${error.message}`)
      return Boolean(data?.length)
    } catch (err) {
      console.error('[Supabase letters] deleteLetter error:', err)
      throw err
    }
  }

  let deleted = false
  for (const [key, letter] of inMemoryStore) {
    if (letter.id === letterId) {
      inMemoryStore.delete(key)
      deleted = true
    }
  }
  return deleted
}

// ── 8. Download History ───────────────────────────────────────────────────────
export async function recordDownload(
  userId: string,
  letterId: string | null,
  format: 'pdf' | 'png' | 'txt',
  isServer = false
): Promise<DownloadHistoryRow> {
  const now = new Date().toISOString()

  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production persistence')
  }
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

      if (error || !data) throw new Error(`Download history save failed: ${error?.message || 'No record returned'}`)
      return data as DownloadHistoryRow
    } catch (err) {
      console.error('[Supabase letters] recordDownload error:', err)
      throw err
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
  if (!isConfigured && process.env.NODE_ENV === 'production') {
    throw new Error('Supabase is required for production persistence')
  }
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

      if (error) throw new Error(`Download history lookup failed: ${error.message}`)
      return (data || []) as DownloadHistoryRow[]
    } catch (err) {
      console.error('[Supabase letters] getUserDownloads error:', err)
      throw err
    }
  }

  const results = Array.from(inMemoryDownloads.values())
    .filter((d) => d.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return results
}
