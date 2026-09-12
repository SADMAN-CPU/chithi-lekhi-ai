import { NextRequest, NextResponse } from 'next/server'
import { refineLetterSchema } from '@/lib/validations'
import { refineLetterContent } from '@/lib/refine-engine'
import { sanitizeInput, isUuid } from '@/utils/helpers'
import { updateLetter, getLetterById, getLetterContent } from '@/lib/supabase/letters'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import {
  reserveUserQuota,
  releaseUserQuota,
  type QuotaVerificationResult,
  consumeUserQuota,
  recordAIUsage,
  checkUserRateLimit,
  attachQuotaHeaders,
} from '@/lib/quota-service'
import { moderateContent } from '@/lib/content-moderation'
import type { ApiError } from '@/types'

// Vercel serverless function max execution duration (seconds)

export async function createRefinementResponse(request: NextRequest, pathLetterId?: string) {
  let quotaVerification: QuotaVerificationResult | undefined
  try {
    // 1. Quota Verification (10 refinements/day for Free users, Unlimited for Premium)
    // NOTE: Does NOT deduct quota prior to execution.
    quotaVerification = await reserveUserQuota({
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

    let body = await request.json().catch(() => null)
    if (pathLetterId) {
      if (!isUuid(pathLetterId)) {
        return NextResponse.json({ success: false, error: { message: 'Invalid letter ID', status: 400 } }, { status: 400 })
      }
      const letter = await getLetterById(pathLetterId, true)
      if (!letter) return NextResponse.json({ success: false, error: { message: 'Letter not found', status: 404 } }, { status: 404 })
      if (!quotaVerification.userId || letter.user_id !== quotaVerification.userId) {
        return NextResponse.json({ success: false, error: { message: 'Unauthorized enhancement', status: 403 } }, { status: 403 })
      }
      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({ success: false, error: { message: 'Invalid request', status: 400 } }, { status: 400 })
      }
      body = {
        ...body, letterId: pathLetterId, originalLetter: getLetterContent(letter),
        action: body.style || body.action || 'natural',
        relationship: letter.relationship || undefined,
        receiverName: letter.recipient_name || letter.receiver_name,
        language: letter.language || 'bengali',
      }
    }

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

    // 3b. IDOR Guard: If modifying an existing letter, verify caller ownership
    if (data.letterId && !pathLetterId) {
      if (!isUuid(data.letterId)) {
        return NextResponse.json({ success: false, error: { message: 'Invalid letter ID', status: 400 } }, { status: 400 })
      }
      const existing = await getLetterById(data.letterId, true)
      if (!existing) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Letter not found', status: 404 } },
          { status: 404 }
        )
      }
      if (!quotaVerification.userId || existing.user_id !== quotaVerification.userId) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized modification', status: 403 } },
          { status: 403 }
        )
      }
    }

    const action = data.action || data.refinementType || 'custom'
    const rawLetter = data.originalLetter || data.letter || ''

    // 4. Sanitize inputs
    const sanitizedLetter = sanitizeInput(rawLetter)
    const sanitizedCustomInstruction = data.customInstruction
      ? sanitizeInput(data.customInstruction)
      : undefined
    const sanitizedReceiverName = data.receiverName ? sanitizeInput(data.receiverName) : undefined
    const sanitizedRelationship = data.relationship ? sanitizeInput(data.relationship) : undefined

    // 4b. Content Moderation
    const letterModeration = moderateContent(sanitizedLetter)
    if (!letterModeration.safe) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONTENT_FLAGGED',
            message: letterModeration.reason || 'চিঠিতে অনিরাপদ বিষয়বস্তু পাওয়া গেছে।',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    if (sanitizedCustomInstruction) {
      const instrModeration = moderateContent(sanitizedCustomInstruction)
      if (!instrModeration.safe) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONTENT_FLAGGED',
              message: instrModeration.reason || 'নির্দেশনায় অনিরাপদ বিষয়বস্তু পাওয়া গেছে।',
              status: 400,
            },
          },
          { status: 400 }
        )
      }
    }

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

    const { refinedLetter, provider, audit, changesSummary, meaningPreserved, similarityScore } = refineResult

    // A failed save must be visible and must not deduct the user's allowance.
    if (data.letterId) {
      const saved = await updateLetter(data.letterId, {
        enhanced_content: refinedLetter, enhanced_letter: refinedLetter,
        enhancement_style: action, content: refinedLetter, letter_content: refinedLetter,
      }, true)
      if (!saved) throw new Error('Refined letter could not be saved')
    }

    let quotaConsumption = quotaVerification as QuotaVerificationResult | Awaited<ReturnType<typeof consumeUserQuota>>
    if (provider !== 'fallback') {
      quotaConsumption = await consumeUserQuota({
        identifier: quotaVerification.identifier, userId: quotaVerification.userId,
        actionType: 'refinement', reservationId: quotaVerification.reservationId, date: quotaVerification.date,
      })
      if (!quotaConsumption.consumed) throw new Error('Refinement quota could not be recorded')
      await recordAIUsage({
        userId: quotaVerification.userId, identifier: quotaVerification.identifier, actionType: 'refinement',
        model: provider === 'gemini' ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'openai/gpt-4o-mini',
        tokensUsed: Math.ceil((refinedLetter.trim().split(/\s+/).length + 100) * 1.5), success: true,
      })
    }

    const jsonResponse = NextResponse.json(
      {
        success: true,
        letter: refinedLetter,
        originalLetter: sanitizedLetter,
        enhancementStyle: action,
        provider,
        audit,
        changesSummary,
        meaningPreserved,
        similarityScore,
        ...(pathLetterId ? {
          letter_id: pathLetterId, enhanced_content: refinedLetter,
          changes_summary: changesSummary, meaning_preserved: meaningPreserved, similarity_score: similarityScore,
        } : {}),
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
  } finally {
    if (quotaVerification) await releaseUserQuota(quotaVerification, 'refinement')
  }
}
