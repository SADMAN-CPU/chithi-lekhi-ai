import { NextRequest, NextResponse } from 'next/server'
import { generateLetterSchema } from '@/lib/validations'
import { generateGeminiLetter } from '@/lib/gemini'
import { analyzeEmotionalContext } from '@/lib/emotion-engine'
import { createLetter } from '@/lib/supabase/letters'
import { sanitizeInput } from '@/utils/helpers'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import type { ApiError, GenerateLetterRequest, GenerateLetterResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce Rate Limiting (5 requests per 60s per IP to protect OpenAI/Gemini API limits)
    const rateLimit = checkRateLimit(request, {
      limit: 5,
      windowSeconds: 60,
      prefix: 'generate-letter',
    })

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
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
    const { letter, provider } = await generateGeminiLetter(
      sanitizedParams,
      emotionalAnalysis.promptContext
    )

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

    // Calculate approx word count
    const wordCount = letter.trim().split(/\s+/).length

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

    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      },
    })
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
