import { NextRequest, NextResponse } from 'next/server'
import { generateLetterSchema } from '@/lib/validations'
import { generateGeminiLetter } from '@/lib/gemini'
import { analyzeEmotionalContext } from '@/lib/emotion-engine'
import { createLetter } from '@/lib/supabase/letters'
import { sanitizeInput } from '@/utils/helpers'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { guardLetterGeneration, attachUsageHeaders } from '@/lib/premium-middleware'
import {
  consumeUserQuota,
  releaseUserQuota,
  type QuotaVerificationResult,
  recordAIUsage,
  checkUserRateLimit,
} from '@/lib/quota-service'
import { trackEvent } from '@/lib/analytics'
import { moderateContent } from '@/lib/content-moderation'
import type { ApiError, GenerateLetterRequest, GenerateLetterResponse } from '@/types'

// Vercel serverless function max execution duration (seconds)
export const maxDuration = 60

export async function POST(request: NextRequest) {
  let reservation: QuotaVerificationResult | undefined
  try {
    // 1. Enforce Premium & Daily Quota Guard (5 letters/day for Free users, Unlimited for Premium)
    const premiumGuard = await guardLetterGeneration(request)
    reservation = premiumGuard.usage
    if (!premiumGuard.allowed && premiumGuard.response) {
      return premiumGuard.response
    }

    // 2. Enforce Burst Rate Limiting (5 requests per 60s per IP to protect OpenAI/Gemini API limits)
    const rateLimit = checkRateLimit(request, {
      limit: 5,
      windowSeconds: 60,
      prefix: 'generate-letter',
    })

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    // 2b. Enforce per-user rate limit for authenticated users
    if (premiumGuard.userId) {
      const userLimit = checkUserRateLimit(premiumGuard.userId, 'generate-letter', 10, 60)
      if (!userLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TOO_MANY_REQUESTS',
              message: 'অতিরিক্ত অনুরোধ করা হয়েছে। অনুগ্রহ করে ১ মিনিট অপেক্ষা করুন।',
              status: 429,
            },
          },
          { status: 429 }
        )
      }
    }

    const body = await request.json().catch(() => null)

    // Validate request payload with Zod
    const parseResult = generateLetterSchema.safeParse(body)
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]
      const error: ApiError = {
        message: firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Invalid input parameters',
        code: 'VALIDATION_ERROR',
        status: 400,
      }
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    const data = parseResult.data

    // Sanitize user text inputs to prevent script injections
    const sanitizedParams: GenerateLetterRequest = {
      receiverName: sanitizeInput(data.receiverName),
      relationship: sanitizeInput(data.relationship),
      memory: data.memory ? sanitizeInput(data.memory) : undefined,
      situation: data.situation ? sanitizeInput(data.situation) : undefined,
      feeling: sanitizeInput(data.feeling),
      letterLength: data.letterLength,
      eraStyle: data.eraStyle,
      language: data.language,
      category: data.category,
      style: data.style,
      personality: data.personality || (data.style as GenerateLetterRequest['personality']),
      emotion: data.emotion ? sanitizeInput(data.emotion) : undefined,
    }

    // Content Moderation Screening (§11)
    const inputsToScreen = [
      sanitizedParams.receiverName,
      sanitizedParams.relationship,
      sanitizedParams.memory,
      sanitizedParams.situation,
      sanitizedParams.feeling,
    ]
    for (const text of inputsToScreen) {
      if (text) {
        const mod = moderateContent(text)
        if (!mod.safe) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'CONTENT_FLAGGED',
                message: mod.reason || 'ইনপুটটিতে অনিরাপদ বিষয়বস্তু রয়েছে।',
                status: 400,
              },
            },
            { status: 400 }
          )
        }
      }
    }

    // Phase 02: Perform deep emotional & psychological context analysis
    const emotionalAnalysis = analyzeEmotionalContext(sanitizedParams)

    // Phase 01 & 03: Generate personalized letter with Gemini AI enriched by the Emotion Understanding Layer
    let generatedResult: Awaited<ReturnType<typeof generateGeminiLetter>>
    try {
      generatedResult = await generateGeminiLetter(
        sanitizedParams,
        emotionalAnalysis.promptContext
      )
    } catch (aiErr) {
      // Quota is NOT consumed if AI generation fails.
      await recordAIUsage({
        userId: premiumGuard.userId,
        identifier: premiumGuard.usage.identifier,
        actionType: 'generation',
        model: 'gemini-1.5-flash',
        tokensUsed: 0,
        success: false,
        error: aiErr instanceof Error ? aiErr.message : 'AI generation failure',
      })
      throw aiErr
    }

    const { letter, provider } = generatedResult

    // Save generated letter in Supabase database (Phase 05)
    let letterId: string | undefined
    {
      const saved = await createLetter(
        {
          user_id: premiumGuard.userId || null,
          recipient_name: sanitizedParams.receiverName,
          receiver_name: sanitizedParams.receiverName,
          relationship: sanitizedParams.relationship,
          emotion: sanitizedParams.feeling,
          style: sanitizedParams.style || sanitizedParams.personality || 'vintage',
          era_style: sanitizedParams.eraStyle,
          language: sanitizedParams.language,
          memory_context: sanitizedParams.memory || null,
          original_input: sanitizedParams.memory || sanitizedParams.feeling,
          original_letter: sanitizedParams.memory || sanitizedParams.feeling,
          generated_content: letter,
          content: letter,
          letter_content: letter,
          favorite: false,
          is_public: false,
        },
        true
      )
      letterId = premiumGuard.userId ? saved.id : undefined
    }

    const wordCount = letter.trim().split(/\s+/).length
    let quotaConsumption = premiumGuard.usage as QuotaVerificationResult | Awaited<ReturnType<typeof consumeUserQuota>>
    if (provider !== 'fallback') {
      quotaConsumption = await consumeUserQuota({
        identifier: premiumGuard.usage.identifier, userId: premiumGuard.userId,
        actionType: 'generation', reservationId: premiumGuard.usage.reservationId, date: premiumGuard.usage.date,
      })
      if (!quotaConsumption.consumed) throw new Error('Generation quota could not be recorded')
      await recordAIUsage({
        userId: premiumGuard.userId, identifier: premiumGuard.usage.identifier, actionType: 'generation',
        model: provider === 'gemini' ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'openai/gpt-4o-mini',
        tokensUsed: Math.ceil((wordCount + 150) * 1.5), success: true,
      })
    }

    // 5. Track privacy-friendly product analytics
    await trackEvent({
      type: 'letter_created',
      properties: {
        style: sanitizedParams.writingStyle || sanitizedParams.style || sanitizedParams.personality || 'emotional',
        relationship: sanitizedParams.relationship,
        language: sanitizedParams.language,
      },
    })

    const response: GenerateLetterResponse = {
      success: true,
      letter,
      letterId,
      metadata: {
        receiverName: sanitizedParams.receiverName,
        relationship: sanitizedParams.relationship,
        letterLength: sanitizedParams.letterLength,
        eraStyle: sanitizedParams.eraStyle,
        language: sanitizedParams.language,
        wordCount,
        provider,
        personality: sanitizedParams.personality || sanitizedParams.style,
        emotionalTone: emotionalAnalysis.detectedEmotion.bengaliLabel,
      },
    }

    const jsonResponse = NextResponse.json(response, {
      headers: {
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    })

    return attachUsageHeaders(jsonResponse, quotaConsumption)
  } catch (err) {
    console.error('[POST /api/generate-letter] Generation error:', err)
    const error: ApiError = {
      message: 'চিঠি তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন। (Failed to generate letter. Please try again.)',
      code: 'GENERATION_ERROR',
      status: 500,
    }
    return NextResponse.json({ success: false, error }, { status: 500 })
  } finally {
    if (reservation) await releaseUserQuota(reservation, 'generation')
  }
}
