import { createClient as createBrowserSupabase } from './client'
import { createClient as createServerSupabase } from './server'
import type { LetterRow, LetterInsert, LetterUpdate } from '@/types/database'
import { generateSlug } from '@/utils/helpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseUrl.startsWith('https://')
)

// ── In-Memory Development Store ──────────────────────────────────────────────
// Ensures local tests and development without a live Supabase project work seamlessly.
const inMemoryStore: Map<string, LetterRow> = new Map()

// ── 1. Create Letter ─────────────────────────────────────────────────────────
export async function createLetter(
  data: Omit<LetterInsert, 'id' | 'created_at'>,
  isServer = false
): Promise<LetterRow> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `letter-${Date.now()}`
  const now = new Date().toISOString()
  const slug = data.share_slug || generateSlug(8)

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      const { data: inserted, error } = await client
        .from('letters')
        .insert({
          ...data,
          share_slug: slug,
          favorite: data.favorite ?? false,
          is_public: data.is_public ?? false,
        })
        .select()
        .single()

      if (error) {
        console.warn('[Supabase letters] Insert error, falling back to local store:', error.message)
      } else if (inserted) {
        return inserted as LetterRow
      }
    } catch (err) {
      console.warn('[Supabase letters] Insert exception, falling back to local store:', err)
    }
  }

  // Fallback / Development mode
  const record: LetterRow = {
    id: newId,
    user_id: data.user_id ?? null,
    receiver_name: data.receiver_name,
    relationship: data.relationship ?? null,
    emotion: data.emotion ?? null,
    style: data.style ?? null,
    era_style: data.era_style ?? null,
    language: data.language || 'bengali',
    memory_context: data.memory_context ?? null,
    content: data.content,
    favorite: data.favorite ?? false,
    share_slug: slug,
    is_public: data.is_public ?? false,
    created_at: now,
  }

  inMemoryStore.set(record.id, record)
  return record
}

// ── 2. Get Letter by ID ───────────────────────────────────────────────────────
export async function getLetterById(id: string, isServer = false): Promise<LetterRow | null> {
  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
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
  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      const { data, error } = await client
        .from('letters')
        .select('*')
        .eq('share_slug', slug)
        .maybeSingle()

      if (!error && data) {
        return data as LetterRow
      }
    } catch (err) {
      console.warn('[Supabase letters] getLetterBySlug error:', err)
    }
  }

  for (const letter of inMemoryStore.values()) {
    if (letter.share_slug === slug) {
      return letter
    }
  }

  return null
}

// ── 4. Get User Letters ───────────────────────────────────────────────────────
export async function getUserLetters(
  userId: string,
  options?: { limit?: number; offset?: number; favoritesOnly?: boolean },
  isServer = false
): Promise<LetterRow[]> {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      let query = client
        .from('letters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (options?.favoritesOnly) {
        query = query.eq('favorite', true)
      }

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
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      const { error } = await client
        .from('letters')
        .update({ favorite: newFavorite })
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
  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      const { data, error } = await client
        .from('letters')
        .update(updates)
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
    const updated = { ...existing, ...updates } as LetterRow
    inMemoryStore.set(letterId, updated)
    return updated
  }

  return null
}

// ── 7. Delete Letter ──────────────────────────────────────────────────────────
export async function deleteLetter(letterId: string, isServer = false): Promise<boolean> {
  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
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
