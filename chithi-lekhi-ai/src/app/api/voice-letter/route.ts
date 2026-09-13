import { NextRequest, NextResponse } from 'next/server'
import { executeVoiceRequest, VOICE_STYLES, type VoiceStyle } from '@/lib/voice-engine'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { sanitizeInput } from '@/utils/helpers'
import { attachQuotaHeaders } from '@/lib/quota-service'
import { getServerUser } from '@/lib/auth-server'

// Vercel serverless function max execution duration (seconds)
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const serverUser = await getServerUser()
    // 1. Rate Limiting (20 voice generations per minute per IP)
    const rateLimit = checkRateLimit(request, {
      limit: 20,
      windowSeconds: 60,
      prefix: 'voice-letter',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ success: false, error: { message: 'Invalid request body', status: 400 } }, { status: 400 })
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
    const execution = await executeVoiceRequest({
      request,
      text: sanitizedText,
      voiceStyle: selectedStyle,
      authenticatedUser: serverUser,
    })
    if (!execution.ok) return execution.response
    const { result, usage } = execution

    const hasAudioData = Boolean(result.audioBase64)
    const audioDataUri = hasAudioData ? `data:audio/${result.format};base64,${result.audioBase64}` : null

    const response = NextResponse.json(
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
        receiverName: typeof receiverName === 'string' ? sanitizeInput(receiverName) : undefined,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    )
    return usage ? attachQuotaHeaders(response, usage) : response
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
