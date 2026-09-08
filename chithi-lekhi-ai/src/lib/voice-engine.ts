import crypto from 'crypto'
import { openai } from './openai'
import { createClient as createBrowserSupabase } from './supabase/client'
import type { VoiceCacheRow } from '@/types/database'
import { VOICE_STYLES, type VoiceStyle, type VoiceStyleConfig } from '@/constants/voice'

export { VOICE_STYLES, type VoiceStyle, type VoiceStyleConfig }

async function getSupabaseClient(isServer: boolean) {
  if (isServer) {
    const { createClient } = await import('./supabase/server')
    return createClient()
  }
  return createBrowserSupabase()
}

// ── In-Memory Audio Cache (Cost Optimization) ──────────────────────────────────
// Maps hash -> { audioBase64: string, format: string, style: VoiceStyle }
const inMemoryVoiceCache: Map<
  string,
  { audioBase64: string; format: string; style: VoiceStyle }
> = new Map()

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
}

/**
 * Synthesize emotional letter text to speech with cost-optimized cache check
 */
export async function synthesizeVoiceLetter(
  params: SynthesizeVoiceParams
): Promise<SynthesizeVoiceResult> {
  const { text, voiceStyle, isServer = true } = params
  const config = VOICE_STYLES[voiceStyle] || VOICE_STYLES.warm
  const cleanText = cleanLetterForSpeech(text)
  const contentHash = computeVoiceHash(cleanText, voiceStyle)

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
  if (isConfigured) {
    try {
      const client = await getSupabaseClient(isServer)
      const { data, error } = await client
        .from('voice_cache')
        .select('*')
        .eq('content_hash', contentHash)
        .maybeSingle()

      if (!error && data) {
        const row = data as VoiceCacheRow
        inMemoryVoiceCache.set(contentHash, {
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
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'mock_key_for_build' && openai) {
    try {
      // Chunk text if very large to prevent token blowup (max 4096 chars per TTS call)
      const sanitized = cleanText.slice(0, 4000).trim()

      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: config.openaiVoice,
        input: sanitized,
        speed: config.speed,
        response_format: 'mp3',
      })

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const audioBase64 = buffer.toString('base64')

      // Save to memory cache
      inMemoryVoiceCache.set(contentHash, {
        audioBase64,
        format: 'mp3',
        style: voiceStyle,
      })

      // Save to Supabase persistent table if configured
      if (isConfigured) {
        try {
          const client = await getSupabaseClient(isServer)
          await client.from('voice_cache').insert({
            content_hash: contentHash,
            voice_style: voiceStyle,
            audio_url: audioBase64,
            audio_format: 'mp3',
            file_size_bytes: buffer.byteLength,
          })
        } catch (dbErr) {
          console.warn('[VoiceEngine] Failed to save in DB cache:', dbErr)
        }
      }

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
    }
  }

  // 4. Clean Browser Speech Fallback (Dual Engine)
  // When OpenAI TTS is offline, unconfigured, or rate-limited, delegate directly
  // to browser SpeechSynthesis to read the ACTUAL letter text with appropriate style pitch/rate.
  return {
    audioBase64: '',
    format: 'mp3',
    fromCache: false,
    contentHash,
    voiceStyle,
    fallbackToBrowser: true,
    cleanText,
  }
}
