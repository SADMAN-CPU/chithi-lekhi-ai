import { NextRequest, NextResponse } from 'next/server'
import { getLetterById } from '@/lib/supabase/letters'
import { executeVoiceRequest, VOICE_STYLES, type VoiceStyle } from '@/lib/voice-engine'
import { createAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { getServerUser } from '@/lib/auth-server'
import {
  attachQuotaHeaders,
} from '@/lib/quota-service'

export const maxDuration = 60

type Props = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/letters/:id/voice
 *
 * Generates an audio narration for the specified letter and logs
 * the event into `public.voice_history`.
 */
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 15,
      windowSeconds: 60,
      prefix: 'letters-id-voice',
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

    // Ownership check: If the letter is not public, caller must be the owner
    const serverUser = await getServerUser()
    if (!letter.is_public) {
      if (!serverUser || serverUser.id !== letter.user_id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'অননুমোদিত অ্যাক্সেস / Unauthorized: You do not have permission to access this private letter',
              status: 403,
            },
          },
          { status: 403 }
        )
      }
    }

    const body = await request.json().catch(() => ({}))
    const validStyles: VoiceStyle[] = ['warm-mother', 'warm', 'emotional', 'storytelling', 'professional', 'vintage-radio']
    const voiceStyle: VoiceStyle = validStyles.includes(body.voiceStyle) ? body.voiceStyle : 'warm'

    // Letter content to voice
    const letterText =
      letter.enhanced_content ||
      letter.enhanced_letter ||
      letter.letter_content ||
      letter.content

    if (!letterText || !letterText.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'Letter has no text to synthesize', status: 400 } },
        { status: 400 }
      )
    }

    const execution = await executeVoiceRequest({ request, text: letterText, voiceStyle })
    if (!execution.ok) return execution.response
    const { result, usage } = execution
    const wordCount = letterText.trim().split(/\s+/).length
    const durationSeconds = Math.max(5, Math.ceil(wordCount / 2.5))

    // Log to voice_history if Supabase service role is available
    if (isServiceRoleConfigured()) {
      try {
        const adminClient = createAdminClient()
        const typedClient = adminClient as unknown as {
          from: (tbl: string) => {
            insert: (data: Record<string, unknown>) => Promise<{ error: unknown }>
          }
        }
        const { error } = await typedClient.from('voice_history').insert({
          letter_id: letter.id,
          voice_type: voiceStyle,
          duration: durationSeconds,
        })
        if (error) throw error
      } catch (histErr) {
        console.warn('[POST /api/letters/[id]/voice] Failed to log voice_history:', histErr)
      }
    }

    const hasAudioData = Boolean(result.audioBase64)
    const audioDataUri = hasAudioData ? `data:audio/${result.format};base64,${result.audioBase64}` : null

    const jsonResponse = NextResponse.json({
      success: true,
      letter_id: id,
      voice_type: voiceStyle,
      duration: durationSeconds,
      mode: hasAudioData ? 'server-tts' : 'browser-speech',
      fallbackToBrowser: Boolean(result.fallbackToBrowser || !hasAudioData),
      audioDataUri,
      format: result.format,
      cleanText: result.cleanText,
      fromCache: result.fromCache,
      contentHash: result.contentHash,
      styleInfo: VOICE_STYLES[voiceStyle],
    })

    jsonResponse.headers.set('Cache-Control', 'private, no-store')
    return usage ? attachQuotaHeaders(jsonResponse, usage) : jsonResponse
  } catch (err) {
    console.error('[POST /api/letters/[id]/voice] Error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to synthesize voice letter', status: 500 } },
      { status: 500 }
    )
  }
}
