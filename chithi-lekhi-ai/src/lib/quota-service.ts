import { NextRequest, NextResponse } from 'next/server'
import { createClient as createBrowserSupabase } from './supabase/client'
import { createClient as createServerSupabase } from './supabase/server'
import { getUserPlan } from './subscription'
import { getServerUser } from './auth-server'
import { getClientIp } from './rate-limit'
import type { AIUsageRow } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseUrl.startsWith('https://')
)

export type AIActionType = 'generation' | 'refinement' | 'voice'

export interface QuotaVerificationResult {
  allowed: boolean
  used: number
  limit: number // -1 means unlimited
  remaining: number // -1 means unlimited
  isUnlimited: boolean
  planId: 'free' | 'premium'
  identifier: string
  userId?: string
  response?: NextResponse
}

export interface QuotaConsumptionResult {
  consumed: boolean
  used: number
  limit: number
  remaining: number
  isUnlimited: boolean
  planId: 'free' | 'premium'
}

export interface RecordAIUsageParams {
  userId?: string | null
  identifier: string
  actionType: AIActionType
  model: string
  tokensUsed?: number
  success: boolean
  error?: string | null
}

// ── In-Memory fallback stores for offline/testing ────────────────────────────
interface InMemoryUsageItem {
  id: string
  identifier: string
  date: string
  letters_generated: number
  refinements_used: number
  voice_letters_used: number
  hd_exports_used: number
  created_at: string
  updated_at: string
}

const inMemoryUsage: Map<string, InMemoryUsageItem> = new Map()
const inMemoryAIUsageLogs: AIUsageRow[] = []
const userRateLimitStore: Map<string, number[]> = new Map()

/**
 * Get current UTC date string in YYYY-MM-DD format
 */
export function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get quota limits based on plan and action type
 */
export function getActionLimit(planId: 'free' | 'premium', actionType: AIActionType): number {
  if (planId === 'premium') {
    return -1 // Unlimited for Premium users
  }

  // Free Tier Limits:
  switch (actionType) {
    case 'generation':
      return 5 // 5 free letters per day
    case 'refinement':
      return 10 // 10 free AI refinements per day
    case 'voice':
      return 2 // 2 free voice generation previews
    default:
      return 5
  }
}

/**
 * User-specific sliding window rate limiter
 * Protects against rapid flood attacks by a single user account
 */
export function checkUserRateLimit(
  userId: string,
  prefix: string,
  limit: number,
  windowSeconds = 60
): { allowed: boolean; remaining: number } {
  const key = `${prefix}:${userId}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const windowStart = now - windowMs

  let timestamps = userRateLimitStore.get(key) || []
  timestamps = timestamps.filter((ts) => ts > windowStart)

  if (timestamps.length >= limit) {
    userRateLimitStore.set(key, timestamps)
    return { allowed: false, remaining: 0 }
  }

  timestamps.push(now)
  userRateLimitStore.set(key, timestamps)
  return { allowed: true, remaining: Math.max(0, limit - timestamps.length) }
}

/**
 * 1. Verify User Quota Availability
 *
 * CRITICAL ARCHITECTURE:
 * This function ONLY checks if the user has remaining quota for the requested action.
 * It DOES NOT deduct or consume quota!
 * Quota must only be consumed AFTER successful AI generation.
 */
export async function verifyUserQuota(params: {
  request: NextRequest
  actionType: AIActionType
  isServer?: boolean
}): Promise<QuotaVerificationResult> {
  const { request, actionType, isServer = true } = params
  const serverUser = await getServerUser()
  const clientIp = getClientIp(request)
  const identifier = serverUser?.id ? `user:${serverUser.id}` : `ip:${clientIp}`
  const date = getCurrentDateString()

  // Determine user's active plan
  const plan = await getUserPlan(serverUser?.id, isServer)
  const limit = getActionLimit(plan.id, actionType)
  const isUnlimited = limit === -1

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
        if (actionType === 'refinement') {
          used = data.refinements_used || 0
        } else {
          used = data.letters_generated || 0
        }
      }
    } catch (err) {
      console.warn('[verifyUserQuota] Query exception, fallback to memory:', err)
    }
  } else {
    const key = `${identifier}:${date}`
    const record = inMemoryUsage.get(key)
    if (record) {
      used = actionType === 'refinement' ? record.refinements_used : record.letters_generated
    }
  }

  const allowed = isUnlimited || used < limit
  const remaining = isUnlimited ? -1 : Math.max(0, limit - used)

  let response: NextResponse | undefined
  if (!allowed) {
    const actionLabelBn =
      actionType === 'refinement'
        ? '১০টি ফ্রি পরিমার্জনের (Refinement)'
        : '৫টি ফ্রি চিঠির (Letter Generation)'
    const actionLabelEn =
      actionType === 'refinement'
        ? 'daily limit of 10 free AI refinements'
        : 'daily limit of 5 free letter generations'

    response = NextResponse.json(
      {
        success: false,
        error: {
          code: 'DAILY_LIMIT_REACHED',
          message: `আজকের জন্য আপনার ${actionLabelBn} কোটা পূর্ণ হয়েছে। আনলিমিটেড ব্যবহার করতে প্রিমিয়ামে আপগ্রেড করুন।`,
          messageEn: `You have reached your ${actionLabelEn}. Upgrade to Chithi Lekhi Premium for unlimited access.`,
          actionType,
          limit,
          used,
          remaining: 0,
          plan: plan.id,
          resetAt: 'রাত ১২:০০ (UTC Midnight)',
        },
      },
      {
        status: 429,
        headers: {
          'X-Daily-Limit': limit.toString(),
          'X-Daily-Used': used.toString(),
          'X-Daily-Remaining': '0',
          'X-User-Plan': plan.id,
        },
      }
    )
  }

  return {
    allowed,
    used,
    limit,
    remaining,
    isUnlimited,
    planId: plan.id,
    identifier,
    userId: serverUser?.id,
    response,
  }
}

/**
 * 2. Consume User Quota
 *
 * CRITICAL ARCHITECTURE:
 * Called STRICTLY AFTER successful AI completion.
 * If AI generation fails, this is NEVER invoked.
 * Employs atomic database procedures or concurrency-safe mutex to prevent race conditions.
 */
export async function consumeUserQuota(params: {
  identifier: string
  userId?: string
  actionType: AIActionType
  isServer?: boolean
}): Promise<QuotaConsumptionResult> {
  const { identifier, userId, actionType, isServer = true } = params
  const date = getCurrentDateString()
  const plan = await getUserPlan(userId, isServer)
  const limit = getActionLimit(plan.id, actionType)
  const isUnlimited = limit === -1

  let newUsed = 1

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      // Call atomic PostgreSQL function
      const { data: rpcResult, error: rpcError } = await client.rpc('consume_ai_quota', {
        p_identifier: identifier,
        p_date: date,
        p_action_type: actionType,
        p_limit: limit,
      })

      if (!rpcError && rpcResult) {
        const parsed = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult
        return {
          consumed: Boolean(parsed.consumed),
          used: Number(parsed.used),
          limit,
          remaining: isUnlimited ? -1 : Math.max(0, limit - Number(parsed.used)),
          isUnlimited,
          planId: plan.id,
        }
      }
    } catch (rpcEx) {
      console.warn('[consumeUserQuota] RPC exception, fallback to upsert:', rpcEx)
    }
  }

  // Fallback / In-Memory Atomic Mutex
  const key = `${identifier}:${date}`
  const existing = inMemoryUsage.get(key)
  const now = new Date().toISOString()

  let currentGen = existing?.letters_generated || 0
  let currentRefine = existing?.refinements_used || 0

  if (actionType === 'refinement') {
    currentRefine += 1
    newUsed = currentRefine
  } else {
    currentGen += 1
    newUsed = currentGen
  }

  const record: InMemoryUsageItem = {
    id: existing?.id || `usage-${Date.now()}`,
    identifier,
    date,
    letters_generated: currentGen,
    refinements_used: currentRefine,
    voice_letters_used: existing?.voice_letters_used || 0,
    hd_exports_used: existing?.hd_exports_used || 0,
    created_at: existing?.created_at || now,
    updated_at: now,
  }

  inMemoryUsage.set(key, record)

  return {
    consumed: true,
    used: newUsed,
    limit,
    remaining: isUnlimited ? -1 : Math.max(0, limit - newUsed),
    isUnlimited,
    planId: plan.id,
  }
}

/**
 * 3. Record AI Usage Audit Trail
 *
 * Saves detailed record in `ai_usage` table for AI cost control, token tracking, and debugging.
 */
export async function recordAIUsage(params: RecordAIUsageParams, isServer = true): Promise<void> {
  const { userId, identifier, actionType, model, tokensUsed = 0, success, error } = params
  const now = new Date().toISOString()

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      await client.from('ai_usage').insert({
        user_id: userId || null,
        identifier,
        action_type: actionType,
        model,
        tokens_used: tokensUsed,
        success,
        created_at: now,
      })
    } catch (err) {
      console.warn('[recordAIUsage] Database insert warning:', err)
    }
  }

  // Also save to in-memory audit logs for local monitoring & test verification
  const auditRow: AIUsageRow = {
    id: `ai-usage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId || null,
    identifier,
    action_type: actionType,
    model,
    tokens_used: tokensUsed,
    success,
    created_at: now,
  }
  inMemoryAIUsageLogs.push(auditRow)

  if (!success && error) {
    console.warn(`[AI Cost Control] Failed AI ${actionType} attempt: ${error} (tokens: ${tokensUsed})`)
  }
}

/**
 * Attach usage headers to HTTP response
 */
export function attachQuotaHeaders(
  response: NextResponse,
  usage: QuotaConsumptionResult | QuotaVerificationResult
): NextResponse {
  response.headers.set('X-Daily-Limit', usage.limit.toString())
  response.headers.set('X-Daily-Used', usage.used.toString())
  response.headers.set('X-Daily-Remaining', usage.remaining.toString())
  response.headers.set('X-User-Plan', usage.planId)
  return response
}

/**
 * Test & Verification Helpers
 */
export function getAIUsageLogs(): AIUsageRow[] {
  return [...inMemoryAIUsageLogs]
}

export function resetQuotaTestStore(): void {
  inMemoryUsage.clear()
  inMemoryAIUsageLogs.length = 0
  userRateLimitStore.clear()
}
