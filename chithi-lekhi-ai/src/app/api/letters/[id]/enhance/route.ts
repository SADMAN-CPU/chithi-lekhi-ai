import { NextRequest, NextResponse } from 'next/server'
import { getLetterById, updateLetter } from '@/lib/supabase/letters'
import { refineLetterContent } from '@/lib/refine-engine'
import { moderateContent } from '@/lib/content-moderation'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { getServerUser, isSupabaseConfigured } from '@/lib/auth-server'
import { sanitizeInput } from '@/utils/helpers'
import {
  verifyUserQuota,
  consumeUserQuota,
  recordAIUsage,
  attachQuotaHeaders,
} from '@/lib/quota-service'
import type { RefineAction } from '@/lib/validations'

export const maxDuration = 60

type Props = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/letters/:id/enhance
 *
 * Runs the Master Technical Specification (§5) Editor prompt on an existing letter.
 * Enforces similarity guardrail (>= 0.55), stores enhanced_content, and returns
 * structured enhancement summary with similarity metrics.
 */
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 10,
      windowSeconds: 60,
      prefix: 'letters-id-enhance',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: 'Letter ID is required', status: 400 } },
        { status: 400 }
      )
    }

    const letter = await getLetterById(id, true)
    if (!letter) {
      return NextResponse.json(
        { success: false, error: { message: 'চিঠি খুঁজে পাওয়া যায়নি / Letter not found', status: 404 } },
        { status: 404 }
      )
    }

    // Permission check
    const isProduction = process.env.NODE_ENV === 'production'
    if ((isProduction || isSupabaseConfigured) && letter.user_id) {
      const serverUser = await getServerUser()
      if (!serverUser || serverUser.id !== letter.user_id) {
        return NextResponse.json(
          { success: false, error: { message: 'Unauthorized enhancement', status: 403 } },
          { status: 403 }
        )
      }
    }

    // Quota Verification (10 refinements/day for Free users, Unlimited for Premium)
    const quotaVerification = await verifyUserQuota({
      request,
      actionType: 'refinement',
    })
    if (!quotaVerification.allowed && quotaVerification.response) {
      return quotaVerification.response
    }

    const body = await request.json().catch(() => ({}))
    const style: RefineAction = body.style || body.action || 'natural'
    const customInstruction = body.customInstruction ? sanitizeInput(body.customInstruction) : undefined

    // Content moderation on custom instructions
    if (customInstruction) {
      const moderation = moderateContent(customInstruction)
      if (!moderation.safe) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONTENT_FLAGGED',
              message: moderation.reason || 'ইনপুটটিতে অনিরাপদ বিষয়বস্তু রয়েছে।',
              status: 400,
            },
          },
          { status: 400 }
        )
      }
    }

    // Determine base letter text to polish (canonical: original_input -> original_letter -> content)
    const baseText =
      letter.original_input ||
      letter.original_letter ||
      letter.generated_content ||
      letter.letter_content ||
      letter.content

    if (!baseText || !baseText.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'Letter content is empty', status: 400 } },
        { status: 400 }
      )
    }

    // Run refinement engine with similarity guardrails
    let refineResult: Awaited<ReturnType<typeof refineLetterContent>>
    try {
      refineResult = await refineLetterContent({
        letter: baseText,
        action: style,
        customInstruction,
        relationship: letter.relationship || undefined,
        receiverName: letter.recipient_name || letter.receiver_name || undefined,
        language: (letter.language as 'bengali' | 'english' | 'banglish') || 'bengali',
      })
    } catch (refineErr) {
      await recordAIUsage({
        userId: quotaVerification.userId,
        identifier: quotaVerification.identifier,
        actionType: 'refinement',
        model: 'gemini-1.5-flash',
        tokensUsed: 0,
        success: false,
        error: refineErr instanceof Error ? refineErr.message : 'Enhancement failure',
      })
      throw refineErr
    }

    // Deduct quota after confirmed successful enhancement
    const quotaConsumption = await consumeUserQuota({
      identifier: quotaVerification.identifier,
      userId: quotaVerification.userId,
      actionType: 'refinement',
    })

    const wordCount = refineResult.refinedLetter.trim().split(/\s+/).length
    const estimatedTokens = Math.ceil((wordCount + 100) * 1.5)
    await recordAIUsage({
      userId: quotaVerification.userId,
      identifier: quotaVerification.identifier,
      actionType: 'refinement',
      model: refineResult.provider === 'gemini' ? 'gemini-1.5-flash' : 'openai/gpt-4o-mini',
      tokensUsed: estimatedTokens,
      success: true,
    })

    // Persist enhanced content in database
    await updateLetter(
      id,
      {
        enhanced_content: refineResult.refinedLetter,
        enhanced_letter: refineResult.refinedLetter,
        enhancement_style: style,
        content: refineResult.refinedLetter,
        letter_content: refineResult.refinedLetter,
      },
      true
    )

    const jsonResponse = NextResponse.json({
      success: true,
      letter_id: id,
      enhanced_content: refineResult.refinedLetter,
      changes_summary: refineResult.changesSummary,
      meaning_preserved: refineResult.meaningPreserved,
      similarity_score: refineResult.similarityScore,
      provider: refineResult.provider,
    })

    return attachQuotaHeaders(jsonResponse, quotaConsumption)
  } catch (err) {
    console.error('[POST /api/letters/[id]/enhance] Error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to enhance letter', status: 500 } },
      { status: 500 }
    )
  }
}
