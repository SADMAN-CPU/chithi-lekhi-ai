import crypto from 'crypto'
import { openai } from './openai'
import { createAdminClient, isServiceRoleConfigured } from './supabase/admin'
import type { NextRequest, NextResponse } from 'next/server'
import { reserveUserQuota, releaseUserQuota, consumeUserQuota, recordAIUsage, quotaUnavailableResponse, type QuotaVerificationResult, type QuotaConsumptionResult } from './quota-service'
import type { VoiceCacheRow } from '@/types/database'
import { VOICE_STYLES, type VoiceStyle, type VoiceStyleConfig } from '@/constants/voice'

export { VOICE_STYLES, type VoiceStyle, type VoiceStyleConfig }

// ── In-Memory Audio Cache (Cost Optimization) ──────────────────────────────────
// Maps hash -> { audioBase64: string, format: string, style: VoiceStyle }
const inMemoryVoiceCache: Map<
  string,
  { audioBase64: string; format: string; style: VoiceStyle }
> = new Map()

function cacheVoice(hash: string, value: { audioBase64: string; format: string; style: VoiceStyle }): void {
  const maxCharacters = 12 * 1024 * 1024
  if (value.audioBase64.length > maxCharacters) return
  inMemoryVoiceCache.delete(hash)
  let total = value.audioBase64.length
  for (const cached of inMemoryVoiceCache.values()) total += cached.audioBase64.length
  while (inMemoryVoiceCache.size >= 24 || total > maxCharacters) {
    const oldest = inMemoryVoiceCache.keys().next().value
    if (!oldest) break
    total -= inMemoryVoiceCache.get(oldest)!.audioBase64.length
    inMemoryVoiceCache.delete(oldest)
  }
  inMemoryVoiceCache.set(hash, value)
}

import { isSupabaseConfigured } from './supabase/config'

const isConfigured = isSupabaseConfigured

import { cleanLetterForSpeech } from './voice-utils'
export { cleanLetterForSpeech }

/**
 * Compute unique deterministic SHA-256 hash for letter text + voice style
 */
export function computeVoiceHash(text: string, style: VoiceStyle): string {
  const normalized = text.trim().replace(/\s+/g, ' ')
  return crypto.createHash('sha256').update(`${normalized}::${style}`).digest('hex')
}

export interface SynthesizeVoiceParams {
  text: string
  voiceStyle: VoiceStyle
  isServer?: boolean
  beforeGenerate?: () => Promise<void>
}

export interface SynthesizeVoiceResult {
  audioBase64: string
  format: 'mp3' | 'wav'
  fromCache: boolean
  contentHash: string
  voiceStyle: VoiceStyle
  isDemoFallback?: boolean
  fallbackToBrowser?: boolean
  cleanText: string
  providerAttempted?: boolean
}

/**
 * Synthesize emotional letter text to speech with cost-optimized cache check
 */
export async function synthesizeVoiceLetter(
  params: SynthesizeVoiceParams
): Promise<SynthesizeVoiceResult> {
  const { text, voiceStyle, isServer = true, beforeGenerate } = params
  const config = VOICE_STYLES[voiceStyle] || VOICE_STYLES.warm
  const cleanText = cleanLetterForSpeech(text)
  const contentHash = computeVoiceHash(cleanText, voiceStyle)
  const browserFallback = (providerAttempted = false): SynthesizeVoiceResult => ({ audioBase64: '', format: 'mp3', fromCache: false, contentHash, voiceStyle, fallbackToBrowser: true, cleanText, providerAttempted })
  // Do not reuse old truncated audio or send a partial letter to TTS.
  if (!cleanText || cleanText.length > 4000) return browserFallback()

  // 1. Check in-memory cost-optimization cache
  const inMem = inMemoryVoiceCache.get(contentHash)
  if (inMem) {
    return {
      audioBase64: inMem.audioBase64,
      format: inMem.format as 'mp3' | 'wav',
      fromCache: true,
      contentHash,
      voiceStyle,
      cleanText,
    }
  }

  // 2. Check Supabase persistent voice_cache table
  if (isConfigured && isServer && isServiceRoleConfigured()) {
    try {
      const client = createAdminClient()
      const { data, error } = await client
        .from('voice_cache')
        .select('*')
        .eq('content_hash', contentHash)
        .maybeSingle()

      if (error) throw error
      if (data && typeof data.audio_url === 'string' && data.audio_url && ['mp3', 'wav'].includes(data.audio_format)) {
        const row = data as VoiceCacheRow
        cacheVoice(contentHash, {
          audioBase64: row.audio_url,
          format: row.audio_format,
          style: voiceStyle,
        })
        return {
          audioBase64: row.audio_url,
          format: row.audio_format as 'mp3' | 'wav',
          fromCache: true,
          contentHash,
          voiceStyle,
          cleanText,
        }
      }
    } catch (err) {
      console.warn('[VoiceEngine] Cache lookup note:', err)
    }
  }

  // 3. Generate Speech using OpenAI TTS API if key is available
  if (isServer && openai && beforeGenerate) {
    // Quota denial must propagate, rather than be swallowed as a provider failure.
    await beforeGenerate()
    try {

      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: config.openaiVoice,
        input: cleanText,
        speed: config.speed,
        response_format: 'mp3',
      }, { timeout: 45_000, maxRetries: 0 })

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      if (!buffer.byteLength) throw new Error('TTS returned empty audio')
      const audioBase64 = buffer.toString('base64')

      return {
        audioBase64,
        format: 'mp3',
        fromCache: false,
        contentHash,
        voiceStyle,
        fallbackToBrowser: false,
        cleanText,
      }
    } catch (err) {
      console.error('[VoiceEngine] OpenAI TTS synthesis error:', err)
      return browserFallback(true)
    }
  }

  return browserFallback()
}

/** Both voice endpoints share quota reservation, successful-call accounting, and cleanup. */
export async function executeVoiceRequest(params: {
  request: NextRequest
  text: string
  voiceStyle: VoiceStyle
}): Promise<{ ok: true; result: SynthesizeVoiceResult; usage?: QuotaConsumptionResult } | { ok: false; response: NextResponse }> {
  let quota: QuotaVerificationResult | undefined
  let denied: NextResponse | undefined
  try {
    const result = await synthesizeVoiceLetter({
      text: params.text,
      voiceStyle: params.voiceStyle,
      beforeGenerate: async () => {
        quota = await reserveUserQuota({ request: params.request, actionType: 'voice' })
        if (!quota.allowed) {
          denied = quota.response || quotaUnavailableResponse()
          throw new Error('Voice quota unavailable')
        }
      },
    })
    if (result.fromCache || result.fallbackToBrowser || !result.audioBase64 || !quota) {
      if (quota && result.providerAttempted) await recordAIUsage({ userId: quota.userId, identifier: quota.identifier, actionType: 'voice', model: 'openai/tts-1', success: false, error: 'TTS provider failed; using browser speech' })
      return { ok: true, result }
    }
    const usage = await consumeUserQuota({ identifier: quota.identifier, userId: quota.userId, actionType: 'voice', reservationId: quota.reservationId, date: quota.date })
    await recordAIUsage({ userId: quota.userId, identifier: quota.identifier, actionType: 'voice', model: 'openai/tts-1', tokensUsed: 0, success: true })
    if (!usage.consumed) return { ok: false, response: quotaUnavailableResponse() }
    // Publish generated audio to caches only after accounting commits successfully.
    cacheVoice(result.contentHash, { audioBase64: result.audioBase64, format: result.format, style: result.voiceStyle })
    if (isConfigured && isServiceRoleConfigured()) {
      try {
        const { error } = await createAdminClient().from('voice_cache').upsert({
          content_hash: result.contentHash, voice_style: result.voiceStyle,
          audio_url: result.audioBase64, audio_format: result.format,
          file_size_bytes: Buffer.byteLength(result.audioBase64, 'base64'),
        }, { onConflict: 'content_hash' })
        if (error) throw error
      } catch (error) {
        console.warn('[VoiceEngine] Failed to save persistent cache:', error)
      }
    }
    return { ok: true, result, usage }
  } catch (error) {
    if (denied) return { ok: false, response: denied }
    throw error
  } finally {
    if (quota) await releaseUserQuota(quota, 'voice')
  }
}
