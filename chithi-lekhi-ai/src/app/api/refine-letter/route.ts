import { NextRequest, NextResponse } from 'next/server'
import { refineLetterSchema } from '@/lib/validations'
import { refineLetterContent } from '@/lib/refine-engine'
import { sanitizeInput } from '@/utils/helpers'
import { updateLetter } from '@/lib/supabase/letters'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import {
  verifyUserQuota,
  consumeUserQuota,
  recordAIUsage,
  checkUserRateLimit,
  attachQuotaHeaders,
} from '@/lib/quota-service'
import type { ApiError } from '@/types'

// Vercel serverless function max execution duration (seconds)
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // 1. Quota Verification (10 refinements/day for Free users, Unlimited for Premium)
    // NOTE: Does NOT deduct quota prior to execution.
    const quotaVerification = await verifyUserQuota({
      request,
      actionType: 'refinement',
    })

    if (!quotaVerification.allowed && quotaVerification.response) {
      return quotaVerification.response
    }

    // 2. IP Burst Rate Limiting (10 requests per 60s per IP)
    const rateLimit = checkRateLimit(request, {
      limit: 10,
      windowSeconds: 60,
      prefix: 'refine-letter',
    })

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    // 2b. User Rate Limiting for authenticated users (15 req/min)
    if (quotaVerification.userId) {
      const userLimit = checkUserRateLimit(quotaVerification.userId, 'refine-letter', 15, 60)
      if (!userLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TOO_MANY_REQUESTS',
              message: 'অতিরিক্ত অনুরোধ করা হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।',
              status: 429,
            },
          },
          { status: 429 }
        )
      }
    }

    const body = await request.json()

    // 3. Validate request payload with Zod
    const parseResult = refineLetterSchema.safeParse(body)
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]
      const error: ApiError = {
        message: firstIssue
          ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
          : 'ভুল ইনপুট প্যারামিটার / Invalid input parameters',
        code: 'VALIDATION_ERROR',
        status: 400,
      }
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    const data = parseResult.data
    const action = data.action || data.refinementType || 'custom'
    const rawLetter = data.originalLetter || data.letter || ''

    // 4. Sanitize inputs
    const sanitizedLetter = sanitizeInput(rawLetter)
    const sanitizedCustomInstruction = data.customInstruction
      ? sanitizeInput(data.customInstruction)
      : undefined
    const sanitizedReceiverName = data.receiverName ? sanitizeInput(data.receiverName) : undefined
    const sanitizedRelationship = data.relationship ? sanitizeInput(data.relationship) : undefined

    // 5. Execute AI Refinement with Gemini & Fallbacks
    let refineResult: Awaited<ReturnType<typeof refineLetterContent>>

    try {
      refineResult = await refineLetterContent({
        letter: sanitizedLetter,
        action,
        customInstruction: sanitizedCustomInstruction,
        personality: data.personality,
        relationship: sanitizedRelationship,
        receiverName: sanitizedReceiverName,
        language: data.language,
      })
    } catch (refineErr) {
      // Quota is NOT consumed if refinement fails.
      // Record failed audit trail for cost tracking and error diagnosis.
      await recordAIUsage({
        userId: quotaVerification.userId,
        identifier: quotaVerification.identifier,
        actionType: 'refinement',
        model: 'gemini-1.5-flash',
        tokensUsed: 0,
        success: false,
        error: refineErr instanceof Error ? refineErr.message : 'Refinement failure',
      })
      throw refineErr
    }

    const { refinedLetter, provider, audit } = refineResult

    // Deduct quota ONLY after confirmed successful refinement
    const quotaConsumption = await consumeUserQuota({
      identifier: quotaVerification.identifier,
      userId: quotaVerification.userId,
      actionType: 'refinement',
    })

    // Record successful AI usage audit trail
    const wordCount = refinedLetter.trim().split(/\s+/).length
    const estimatedTokens = Math.ceil((wordCount + 100) * 1.5)
    await recordAIUsage({
      userId: quotaVerification.userId,
      identifier: quotaVerification.identifier,
      actionType: 'refinement',
      model: provider === 'gemini' ? 'gemini-1.5-flash' : 'openai/gpt-4o-mini',
      tokensUsed: estimatedTokens,
      success: true,
    })

    // 6. Dual-version persistence if letterId is provided
    if (data.letterId) {
      try {
        await updateLetter(
          data.letterId,
          {
            original_letter: sanitizedLetter,
            enhanced_letter: refinedLetter,
            enhancement_style: action,
            letter_content: refinedLetter,
            content: refinedLetter,
          },
          true
        )
      } catch (dbErr) {
        console.warn('[POST /api/refine-letter] Could not sync letter version to database:', dbErr)
      }
    }

    const jsonResponse = NextResponse.json(
      {
        success: true,
        letter: refinedLetter,
        originalLetter: sanitizedLetter,
        enhancementStyle: action,
        provider,
        audit,
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    )

    return attachQuotaHeaders(jsonResponse, quotaConsumption)
  } catch (err: unknown) {
    console.error('[POST /api/refine-letter] Refine error:', err)
    const error: ApiError = {
      message: 'চিঠি পরিমার্জন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন। (Failed to refine letter. Please try again.)',
      code: 'REFINE_ERROR',
      status: 500,
    }
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
