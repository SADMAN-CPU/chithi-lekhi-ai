import { NextRequest, NextResponse } from 'next/server'
import { synthesizeVoiceLetter, VOICE_STYLES, type VoiceStyle } from '@/lib/voice-engine'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { sanitizeInput } from '@/utils/helpers'

// Vercel serverless function max execution duration (seconds)
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting (20 voice generations per minute per IP)
    const rateLimit = checkRateLimit(request, {
      limit: 20,
      windowSeconds: 60,
      prefix: 'voice-letter',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const body = await request.json()
    const { text, voiceStyle = 'warm', receiverName } = body

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'চিঠির টেক্সট প্রদান করা আবশ্যক', status: 400 } },
        { status: 400 }
      )
    }

    const validStyles: VoiceStyle[] = ['warm-mother', 'warm', 'emotional', 'storytelling', 'professional', 'vintage-radio']
    const selectedStyle: VoiceStyle = validStyles.includes(voiceStyle) ? voiceStyle : 'warm'
    const sanitizedText = sanitizeInput(text)

    // 2. Synthesize with cost-optimized hash caching
    const result = await synthesizeVoiceLetter({
      text: sanitizedText,
      voiceStyle: selectedStyle,
      isServer: true,
    })

    const hasAudioData = Boolean(result.audioBase64)
    const audioDataUri = hasAudioData ? `data:audio/${result.format};base64,${result.audioBase64}` : null

    return NextResponse.json(
      {
        success: true,
        mode: hasAudioData ? 'server-tts' : 'browser-speech',
        fallbackToBrowser: Boolean(result.fallbackToBrowser || !hasAudioData),
        audioDataUri,
        cleanText: result.cleanText,
        format: result.format,
        fromCache: result.fromCache,
        contentHash: result.contentHash,
        voiceStyle: result.voiceStyle,
        styleInfo: VOICE_STYLES[selectedStyle],
        receiverName: receiverName ? sanitizeInput(receiverName) : undefined,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    )
  } catch (err) {
    console.error('[POST /api/voice-letter] Voice synthesis error:', err)
    return NextResponse.json(
      {
        success: false,
        error: { message: 'ভয়েস চিঠি রূপান্তর করতে সমস্যা হয়েছে', status: 500 },
      },
      { status: 500 }
    )
  }
}
