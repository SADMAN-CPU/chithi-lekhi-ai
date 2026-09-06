import { createClient as createBrowserSupabase } from './supabase/client'
import { createClient as createServerSupabase } from './supabase/server'
import type { UserSubscriptionRow } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseUrl.startsWith('https://')
)

export type PlanId = 'free' | 'premium'

export type PremiumFeature =
  | 'unlimited_letters'
  | 'premium_themes'
  | 'hd_export'
  | 'voice_letter'
  | 'advanced_ai_styles'

export interface PlanConfig {
  id: PlanId
  nameEn: string
  nameBn: string
  priceBdt: number
  dailyLetterLimit: number // 5 for free, -1 (unlimited) for premium
  features: PremiumFeature[]
  badgeBn: string
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    nameEn: 'Free Plan',
    nameBn: 'ফ্রি প্ল্যান',
    priceBdt: 0,
    dailyLetterLimit: 5,
    features: [],
    badgeBn: 'ফ্রি',
  },
  premium: {
    id: 'premium',
    nameEn: 'Chithi Lekhi Premium',
    nameBn: 'চিঠি লেখাই প্রিমিয়াম',
    priceBdt: 199,
    dailyLetterLimit: -1, // Unlimited
    features: [
      'unlimited_letters',
      'premium_themes',
      'hd_export',
      'voice_letter',
      'advanced_ai_styles',
    ],
    badgeBn: '✨ প্রিমিয়াম',
  },
}

// ── In-Memory Development Store for Subscriptions ───────────────────────────
const inMemorySubscriptions: Map<string, UserSubscriptionRow> = new Map()

/**
 * Get the active subscription plan for a user (or Free by default)
 */
export async function getUserPlan(userId?: string, isServer = false): Promise<PlanConfig> {
  if (!userId) {
    return PLANS.free
  }

  if (isConfigured) {
    try {
      const client = isServer ? await createServerSupabase() : createBrowserSupabase()
      const { data, error } = await client
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      if (!error && data) {
        // Check if subscription has not expired
        if (!data.current_period_end || new Date(data.current_period_end) > new Date()) {
          const planId = (data.plan_id as PlanId) || 'free'
          return PLANS[planId] || PLANS.free
        }
      }
    } catch (err) {
      console.warn('[Subscription] Query exception:', err)
    }
  }

  // Check in-memory store
  const localSub = inMemorySubscriptions.get(userId)
  if (localSub && localSub.status === 'active') {
    if (!localSub.current_period_end || new Date(localSub.current_period_end) > new Date()) {
      return PLANS[localSub.plan_id as PlanId] || PLANS.free
    }
  }

  return PLANS.free
}

/**
 * Check whether a user has access to a specific premium feature
 */
export async function canAccessFeature(
  userId: string | undefined,
  feature: PremiumFeature,
  isServer = false
): Promise<{ allowed: boolean; plan: PlanConfig; reason?: string }> {
  const plan = await getUserPlan(userId, isServer)

  if (plan.id === 'premium') {
    return { allowed: true, plan }
  }

  if (plan.features.includes(feature)) {
    return { allowed: true, plan }
  }

  const featureLabels: Record<PremiumFeature, string> = {
    unlimited_letters: 'আনলিমিটেড চিঠি লেখা',
    premium_themes: 'প্রিমিয়াম ভিন্টেজ থিম',
    hd_export: '৩০০ ডিপিআই হাই-ডেফিনিশন এক্সপোর্ট',
    voice_letter: 'ভয়েস লেটার ফিচার',
    advanced_ai_styles: 'রবীন্দ্রনাথ ও ক্লাসিক্যাল লেখার শৈলী',
  }

  return {
    allowed: false,
    plan,
    reason: `"${featureLabels[feature]}" সুবিধাটি চিঠি লেখাই প্রিমিয়াম প্ল্যানের অন্তর্ভুক্ত।`,
  }
}

/**
 * Test helper: Set mock subscription for local dev / testing
 */
export function setMockUserSubscription(userId: string, planId: PlanId, durationDays = 30) {
  const now = new Date()
  const end = new Date(now.getTime() + durationDays * 24 * 3600 * 1000)

  const record: UserSubscriptionRow = {
    id: `sub-${Date.now()}`,
    user_id: userId,
    plan_id: planId,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }

  inMemorySubscriptions.set(userId, record)
  return record
}
