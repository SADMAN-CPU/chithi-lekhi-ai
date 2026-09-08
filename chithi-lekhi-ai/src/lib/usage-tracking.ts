import { createClient as createBrowserSupabase } from './supabase/client'
import { createClient as createServerSupabase } from './supabase/server'
import { getUserPlan } from './subscription'
import type { UserUsageRow } from '@/types/database'
import { resetQuotaTestStore } from './quota-service'
import { isSupabaseConfigured } from './supabase/config'

export * from './quota-service'

const isConfigured = isSupabaseConfigured

export interface UsageSummary {
  allowed: boolean
  used: number
  limit: number // -1 means unlimited
  remaining: number // -1 means unlimited
  isUnlimited: boolean
  date: string
  planId: 'free' | 'premium'
}

// In-Memory fallback store for usage tracking (keyed by identifier:date)
const inMemoryUsage: Map<string, UserUsageRow> = new Map()

/**
 * Get current UTC date string in YYYY-MM-DD format
 */
export function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check daily letter generation usage for an identifier (User ID or IP)
 */
export async function getDailyUsage(
  identifier: string,
  userId?: string,
  isServer = false
): Promise<UsageSummary> {
  const date = getCurrentDateString()
  const plan = await getUserPlan(userId, isServer)
  const isUnlimited = plan.dailyLetterLimit === -1
  const limit = isUnlimited ? -1 : plan.dailyLetterLimit

  let used = 0

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      const { data, error } = await client
        .from('user_usage')
        .select('*')
        .eq('identifier', identifier)
        .eq('date', date)
        .maybeSingle()

      if (!error && data) {
        used = data.letters_generated || 0
      }
    } catch (err) {
      console.warn('[UsageTracking] Query exception:', err)
    }
  } else {
    const key = `${identifier}:${date}`
    const record = inMemoryUsage.get(key)
    if (record) {
      used = record.letters_generated
    }
  }

  const remaining = isUnlimited ? -1 : Math.max(0, limit - used)
  const allowed = isUnlimited || used < limit

  return {
    allowed,
    used,
    limit,
    remaining,
    isUnlimited,
    date,
    planId: plan.id,
  }
}

/**
 * Atomically check and record a letter generation event
 */
export async function recordLetterGeneration(
  identifier: string,
  userId?: string,
  isServer = false
): Promise<UsageSummary> {
  const currentUsage = await getDailyUsage(identifier, userId, isServer)

  if (!currentUsage.allowed) {
    return currentUsage
  }

  const date = currentUsage.date
  const newUsed = currentUsage.used + 1

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      await client
        .from('user_usage')
        .upsert(
          {
            identifier,
            date,
            letters_generated: newUsed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'identifier,date' }
        )
    } catch (err) {
      console.warn('[UsageTracking] Record exception:', err)
    }
  }

  // Update in-memory record
  const key = `${identifier}:${date}`
  const existing = inMemoryUsage.get(key)
  const now = new Date().toISOString()

  const record: UserUsageRow = {
    id: existing?.id || `usage-${Date.now()}`,
    identifier,
    date,
    letters_generated: newUsed,
    refinements_used: existing?.refinements_used || 0,
    voice_letters_used: existing?.voice_letters_used || 0,
    hd_exports_used: existing?.hd_exports_used || 0,
    created_at: existing?.created_at || now,
    updated_at: now,
  }

  inMemoryUsage.set(key, record)

  const isUnlimited = currentUsage.isUnlimited
  const limit = currentUsage.limit
  const remaining = isUnlimited ? -1 : Math.max(0, limit - newUsed)

  return {
    allowed: true,
    used: newUsed,
    limit,
    remaining,
    isUnlimited,
    date,
    planId: currentUsage.planId,
  }
}

/**
 * Test helper: Reset usage for testing
 */
export function resetTestUsage() {
  inMemoryUsage.clear()
  resetQuotaTestStore()
}
