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
  recordAIUsage,
  checkUserRateLimit,
} from '@/lib/quota-service'
import type { ApiError, GenerateLetterRequest, GenerateLetterResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce Premium & Daily Quota Guard (5 letters/day for Free users, Unlimited for Premium)
    const premiumGuard = await guardLetterGeneration(request)
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

    const body = await request.json()

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
      // Record failed AI audit log for cost and reliability tracking.
      await recordAIUsage({
        userId: premiumGuard.userId,
        identifier: premiumGuard.usage.identifier,
        actionType: 'generation',
        model: 'gemini-1.5-flash',
        tokensUsed: 0,
        success: false,
        error: aiErr instanceof Error ? aiErr.message : 'AI generation error',
      })
      throw aiErr
    }

    const { letter, provider } = generatedResult

    // Deduct quota ONLY after confirmed successful AI generation
    const quotaConsumption = await consumeUserQuota({
      identifier: premiumGuard.usage.identifier,
      userId: premiumGuard.userId,
      actionType: 'generation',
    })

    // Calculate approx word count and record usage audit trail
    const wordCount = letter.trim().split(/\s+/).length
    const estimatedTokens = Math.ceil((wordCount + 120) * 1.5)
    await recordAIUsage({
      userId: premiumGuard.userId,
      identifier: premiumGuard.usage.identifier,
      actionType: 'generation',
      model: provider === 'gemini' ? 'gemini-1.5-flash' : 'openai/gpt-4o-mini',
      tokensUsed: estimatedTokens,
      success: true,
    })

    // Save generated letter in Supabase database (Phase 05)
    let letterId: string | undefined
    try {
      const saved = await createLetter(
        {
          receiver_name: sanitizedParams.receiverName,
          relationship: sanitizedParams.relationship,
          emotion: sanitizedParams.feeling,
          era_style: sanitizedParams.eraStyle,
          language: sanitizedParams.language,
          memory_context: sanitizedParams.memory || null,
          content: letter,
          favorite: false,
          is_public: false,
        },
        true
      )
      letterId = saved.id
    } catch (saveErr) {
      console.warn('[generate-letter] Database save note:', saveErr)
    }

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
      message: 'Failed to generate letter. Please try again.',
      code: 'GENERATION_ERROR',
      status: 500,
    }
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
