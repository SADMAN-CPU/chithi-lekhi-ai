import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from './rate-limit'
import {
  verifyUserQuota,
  type QuotaVerificationResult,
  type QuotaConsumptionResult,
} from './quota-service'
import { getDailyUsage, type UsageSummary } from './usage-tracking'
import { getServerUser } from './auth-server'

export interface PremiumGuardResult {
  allowed: boolean
  usage: QuotaVerificationResult
  userId?: string
  response?: NextResponse
}

/**
 * Check daily allowance without deducting quota prematurely.
 * Quota must strictly be consumed AFTER successful AI generation.
 */
export async function guardLetterGeneration(request: NextRequest): Promise<PremiumGuardResult> {
  const verification = await verifyUserQuota({ request, actionType: 'generation' })
  return {
    allowed: verification.allowed,
    usage: verification,
    userId: verification.userId,
    response: verification.response,
  }
}

/**
 * Helper to attach usage tracking headers to successful responses
 */
export function attachUsageHeaders(
  response: NextResponse,
  usage: UsageSummary | QuotaConsumptionResult | QuotaVerificationResult
): NextResponse {
  response.headers.set('X-Daily-Limit', usage.limit.toString())
  response.headers.set('X-Daily-Used', usage.used.toString())
  response.headers.set('X-Daily-Remaining', usage.remaining.toString())
  response.headers.set('X-User-Plan', usage.planId)
  return response
}

/**
 * Fetch current user usage status (useful for client consumption)
 */
export async function getClientUsageStatus(request: NextRequest): Promise<UsageSummary> {
  const serverUser = await getServerUser()
  const clientIp = getClientIp(request)
  const identifier = serverUser?.id ? `user:${serverUser.id}` : `ip:${clientIp}`

  return getDailyUsage(identifier, serverUser?.id, true)
}
