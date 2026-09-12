import { consumeUserQuota, getQuotaUsage, getCurrentDateString, resetQuotaTestStore } from './quota-service'

export * from './quota-service'

export interface UsageSummary {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  isUnlimited: boolean
  date: string
  planId: 'free' | 'premium'
}

/** Compatibility adapter for the canonical daily generation counters. */
export async function getDailyUsage(identifier: string, userId?: string, isServer = false): Promise<UsageSummary> {
  const usage = await getQuotaUsage({ identifier, userId, actionType: 'generation', isServer })
  return { allowed: usage.allowed, used: usage.used, limit: usage.limit, remaining: usage.remaining, isUnlimited: usage.isUnlimited, date: usage.date || getCurrentDateString(), planId: usage.planId }
}

export async function recordLetterGeneration(identifier: string, userId?: string, isServer = false): Promise<UsageSummary> {
  const usage = await consumeUserQuota({ identifier, userId, actionType: 'generation', isServer })
  return { allowed: usage.consumed, used: usage.used, limit: usage.limit, remaining: usage.remaining, isUnlimited: usage.isUnlimited, date: getCurrentDateString(), planId: usage.planId }
}

export function resetTestUsage(): void {
  resetQuotaTestStore()
}
