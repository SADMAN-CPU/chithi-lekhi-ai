import { NextRequest, NextResponse } from 'next/server'
import { createClient as createBrowserSupabase } from './supabase/client'
import { createAdminClient, isServiceRoleConfigured } from './supabase/admin'
import { getUserPlan } from './subscription'
import { getServerUser, type ServerUser } from './auth-server'
import { getClientIp } from './rate-limit'
import type { AIUsageRow } from '@/types/database'
import { isSupabaseConfigured } from './supabase/config'

const isConfigured = isSupabaseConfigured

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
  reservationId?: string
  date?: string
}

export interface QuotaConsumptionResult {
  consumed: boolean
  unavailable?: boolean
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
  /** The successful audit row was saved in the same database transaction as its result. */
  alreadyPersisted?: boolean
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
const quotaReservations = new Map<string, { id: string; expiresAt: number }>()

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

/** Canonical read shared by API guards and legacy usage summaries. */
export async function getQuotaUsage(params: {
  identifier: string
  userId?: string
  actionType: AIActionType
  isServer?: boolean
}): Promise<QuotaVerificationResult> {
  const { identifier, userId, actionType, isServer = true } = params
  const date = getCurrentDateString()
  const plan = await getUserPlan(userId, isServer)
  const limit = getActionLimit(plan.id, actionType)
  const isUnlimited = limit === -1
  let used = 0

  if (isConfigured) {
    if (isServer && !isServiceRoleConfigured()) throw new Error('Quota service credentials are unavailable')
    const client = isServer ? createAdminClient() : createBrowserSupabase()
    const { data, error } = await client.from('user_usage').select('*')
      .eq('identifier', identifier).eq('date', date).maybeSingle()
    if (error) throw new Error('Could not read daily quota', { cause: error })
    if (data) {
      used = data[actionType === 'refinement' ? 'refinements_used' : actionType === 'voice' ? 'voice_letters_used' : 'letters_generated']
      if (!Number.isInteger(used) || used < 0) throw new Error('Invalid daily quota record')
    }
  } else {
    if (process.env.NODE_ENV === 'production') throw new Error('Production quota storage is unavailable')
    const record = inMemoryUsage.get(`${identifier}:${date}`)
    if (record) used = actionType === 'refinement' ? record.refinements_used : actionType === 'voice' ? record.voice_letters_used : record.letters_generated
  }

  return { allowed: isUnlimited || used < limit, used, limit, remaining: isUnlimited ? -1 : Math.max(0, limit - used), isUnlimited, planId: plan.id, identifier, userId, date }
}

export function quotaUnavailableResponse(): NextResponse {
  return NextResponse.json({ success: false, error: { code: 'QUOTA_UNAVAILABLE', message: 'Usage verification is temporarily unavailable. Please try again.', status: 503 } }, { status: 503 })
}

/** Check allowance without consuming it. */
export async function verifyUserQuota(params: {
  request: NextRequest
  actionType: AIActionType
  isServer?: boolean
  authenticatedUser?: ServerUser | null
}): Promise<QuotaVerificationResult> {
  const { request, actionType, isServer = true } = params
  const serverUser = params.authenticatedUser === undefined ? await getServerUser() : params.authenticatedUser
  const clientIp = getClientIp(request)
  const identifier = serverUser?.id ? `user:${serverUser.id}` : `ip:${clientIp}`
  let usage: QuotaVerificationResult
  try {
    usage = await getQuotaUsage({ identifier, userId: serverUser?.id, actionType, isServer })
  } catch (error) {
    console.warn('[verifyUserQuota] Quota verification failed:', error)
    return { allowed: false, used: 0, limit: getActionLimit('free', actionType), remaining: 0, isUnlimited: false, planId: 'free', identifier, userId: serverUser?.id, response: quotaUnavailableResponse() }
  }
  const { allowed, used, limit, remaining, isUnlimited, planId } = usage

  let response: NextResponse | undefined
  if (!allowed) {
    const actionLabelBn =
      actionType === 'refinement'
        ? '১০টি ফ্রি পরিমার্জনের (Refinement)'
        : actionType === 'voice'
        ? '২টি ফ্রি ভয়েস জেনারেশনের (Voice Letter)'
        : '৫টি ফ্রি চিঠির (Letter Generation)'
    const actionLabelEn =
      actionType === 'refinement'
        ? 'daily limit of 10 free AI refinements'
        : actionType === 'voice'
        ? 'daily limit of 2 free voice generations'
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
          plan: planId,
          resetAt: 'রাত ১২:০০ (UTC Midnight)',
        },
      },
      {
        status: 429,
        headers: {
          'X-Daily-Limit': limit.toString(),
          'X-Daily-Used': used.toString(),
          'X-Daily-Remaining': '0',
          'X-User-Plan': planId,
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
    planId: planId,
    identifier,
    userId: serverUser?.id,
    response,
    date: usage.date,
  }
}

/** Reserve one in-flight AI operation without deducting the daily allowance. */
export async function reserveUserQuota(params: {
  request: NextRequest
  actionType: AIActionType
  authenticatedUser?: ServerUser | null
}): Promise<QuotaVerificationResult> {
  const quota = await verifyUserQuota(params)
  if (!quota.allowed) return quota
  const reservationId = crypto.randomUUID()
  const date = quota.date || getCurrentDateString()
  let allowed = false
  let reason = 'busy'
  try {
    if (isConfigured) {
      const { data, error } = await createAdminClient().rpc('reserve_ai_quota', {
        p_identifier: quota.identifier, p_date: date, p_action_type: params.actionType,
        p_limit: quota.limit, p_reservation_id: reservationId,
      })
      if (error) throw error
      const result = typeof data === 'string' ? JSON.parse(data) : data
      if (!result || typeof result.allowed !== 'boolean' || !Number.isInteger(result.used) || result.used < 0) throw new Error('Invalid quota reservation response')
      allowed = result.allowed
      reason = result.reason || 'busy'
      quota.used = result.used
      quota.remaining = quota.isUnlimited ? -1 : Math.max(0, quota.limit - result.used)
    } else {
      const key = `${quota.identifier}:${date}:${params.actionType}`
      const active = quotaReservations.get(key)
      const record = inMemoryUsage.get(`${quota.identifier}:${date}`)
      const field = params.actionType === 'generation' ? 'letters_generated' : params.actionType === 'refinement' ? 'refinements_used' : 'voice_letters_used'
      quota.used = record?.[field] || 0
      quota.remaining = quota.isUnlimited ? -1 : Math.max(0, quota.limit - quota.used)
      if (!quota.isUnlimited && quota.used >= quota.limit) {
        reason = 'limit'
      } else if (!active || active.expiresAt <= Date.now()) {
        quotaReservations.set(key, { id: reservationId, expiresAt: Date.now() + 120_000 })
        allowed = true
      }
    }
  } catch (error) {
    console.warn('[reserveUserQuota] Reservation failed:', error)
    return { ...quota, allowed: false, response: quotaUnavailableResponse() }
  }
  if (!allowed) {
    return { ...quota, allowed: false, response: NextResponse.json({ success: false, error: {
      code: reason === 'limit' ? 'DAILY_LIMIT_REACHED' : 'AI_REQUEST_IN_PROGRESS',
      message: reason === 'limit' ? 'Daily usage limit reached.' : 'An AI request is already in progress. Please wait.',
    } }, { status: reason === 'limit' ? 429 : 409 }) }
  }
  return { ...quota, date, reservationId }
}

/** Release a failed/fallback request; matching tokens cannot clear another request's lease. */
export async function releaseUserQuota(quota: QuotaVerificationResult, actionType: AIActionType): Promise<void> {
  if (!quota.reservationId || !quota.date) return
  if (isConfigured) {
    try {
      const { error } = await createAdminClient().rpc('release_ai_quota', {
        p_identifier: quota.identifier, p_date: quota.date, p_action_type: actionType,
        p_reservation_id: quota.reservationId,
      })
      if (error) throw error
    } catch (error) {
      // The short database lease expires even if cleanup cannot reach the database.
      console.warn('[releaseUserQuota] Lease cleanup failed:', error)
    }
  } else {
    const key = `${quota.identifier}:${quota.date}:${actionType}`
    if (quotaReservations.get(key)?.id === quota.reservationId) quotaReservations.delete(key)
  }
}

/** Consume only after a successful provider response. Never fall back when configured storage fails. */
export async function consumeUserQuota(params: {
  identifier: string
  userId?: string
  actionType: AIActionType
  isServer?: boolean
  reservationId?: string
  date?: string
  usageLog?: { model: string; tokensUsed: number }
  voiceCache?: {
    contentHash: string
    voiceStyle: string
    audioBase64: string
    format: 'mp3' | 'wav'
  }
}): Promise<QuotaConsumptionResult> {
  const { identifier, userId, actionType, isServer = true, reservationId } = params
  const date = params.date || getCurrentDateString()
  const plan = await getUserPlan(userId, isServer)
  const limit = getActionLimit(plan.id, actionType)
  const isUnlimited = limit === -1
  const result = (consumed: boolean, used: number, unavailable = false): QuotaConsumptionResult => ({ consumed, used, limit, remaining: isUnlimited ? -1 : Math.max(0, limit - used), isUnlimited, planId: plan.id, unavailable })

  if (isConfigured) {
    try {
      if (!isServer || !isServiceRoleConfigured()) throw new Error('Quota consumption requires server credentials')
      if (params.voiceCache && (actionType !== 'voice' || !reservationId)) throw new Error('Voice persistence requires a matching voice reservation')
      if (params.usageLog && (!reservationId || actionType === 'voice')) throw new Error('AI audit requires a matching text generation reservation')
      const common = { p_identifier: identifier, p_date: date, p_limit: limit }
      // The voice transaction saves audio before consumption and rolls back both on failure.
      const { data, error } = params.voiceCache
        ? await createAdminClient().rpc('finalize_voice_generation', {
            ...common, p_reservation_id: reservationId,
            p_content_hash: params.voiceCache.contentHash, p_voice_style: params.voiceCache.voiceStyle,
            p_audio_base64: params.voiceCache.audioBase64, p_audio_format: params.voiceCache.format,
            p_file_size_bytes: Buffer.byteLength(params.voiceCache.audioBase64, 'base64'),
          })
        : params.usageLog
        ? await createAdminClient().rpc('finalize_ai_usage', {
            ...common, p_action_type: actionType, p_reservation_id: reservationId,
            p_model: params.usageLog.model, p_tokens_used: params.usageLog.tokensUsed,
          })
        : await createAdminClient().rpc('consume_ai_quota', {
            ...common, p_action_type: actionType,
            ...(reservationId ? { p_reservation_id: reservationId } : {}),
          })
      if (error) throw error
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      if (!parsed || typeof parsed.consumed !== 'boolean' || !Number.isInteger(parsed.used) || parsed.used < 0) throw new Error('Invalid quota consumption response')
      return result(parsed.consumed, parsed.used)
    } catch (error) {
      console.warn('[consumeUserQuota] Database consumption failed:', error)
      return result(false, 0, true)
    }
  }
  if (process.env.NODE_ENV === 'production') return result(false, 0, true)

  const key = `${identifier}:${date}`
  const leaseKey = `${key}:${actionType}`
  const activeLease = quotaReservations.get(leaseKey)
  const existing = inMemoryUsage.get(key)
  const field = actionType === 'refinement' ? 'refinements_used' : actionType === 'voice' ? 'voice_letters_used' : 'letters_generated'
  const used = existing?.[field] || 0
  if ((reservationId && activeLease?.id !== reservationId) ||
      (!reservationId && activeLease && activeLease.expiresAt > Date.now()) ||
      (!isUnlimited && used >= limit)) return result(false, used)

  const now = new Date().toISOString()
  const record: InMemoryUsageItem = existing || {
    id: `usage-${Date.now()}`, identifier, date, letters_generated: 0, refinements_used: 0,
    voice_letters_used: 0, hd_exports_used: 0, created_at: now, updated_at: now,
  }
  record[field] = used + 1
  record.updated_at = now
  inMemoryUsage.set(key, record)
  if (reservationId) quotaReservations.delete(leaseKey)
  return result(true, used + 1)
}

/**
 * 3. Record AI Usage Audit Trail
 *
 * Saves detailed record in `ai_usage` table for AI cost control, token tracking, and debugging.
 */
export async function recordAIUsage(params: RecordAIUsageParams, isServer = true): Promise<void> {
  const { userId, identifier, actionType, model, tokensUsed = 0, success, error } = params
  const now = new Date().toISOString()

  if (isConfigured && !params.alreadyPersisted) {
    try {
      if (!isServer || !isServiceRoleConfigured()) throw new Error('AI audit writes require server credentials')
      const { error: insertError } = await createAdminClient().from('ai_usage').insert({
        user_id: userId || null,
        identifier,
        action_type: actionType,
        model,
        tokens_used: tokensUsed,
        success,
        created_at: now,
      })
      if (insertError) throw insertError
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
  if (inMemoryAIUsageLogs.length > 500) inMemoryAIUsageLogs.shift()

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
  quotaReservations.clear()
}
