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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseUrl.startsWith('https://')
)

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
}

/**
 * Synthesize emotional letter text to speech with cost-optimized cache check
 */
export async function synthesizeVoiceLetter(
  params: SynthesizeVoiceParams
): Promise<SynthesizeVoiceResult> {
  const { text, voiceStyle, isServer = true } = params
  const config = VOICE_STYLES[voiceStyle] || VOICE_STYLES.warm
  const contentHash = computeVoiceHash(text, voiceStyle)

  // 1. Check in-memory cost-optimization cache
  const inMem = inMemoryVoiceCache.get(contentHash)
  if (inMem) {
    return {
      audioBase64: inMem.audioBase64,
      format: inMem.format as 'mp3' | 'wav',
      fromCache: true,
      contentHash,
      voiceStyle,
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
      const sanitized = text.slice(0, 4000).trim()

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
      }
    } catch (err) {
      console.error('[VoiceEngine] OpenAI TTS synthesis error:', err)
    }
  }

  // 4. Fallback: Generate lightweight synthesized acoustic chime / melody audio (WAV)
  // This guarantees $0 development/offline cost and instant browser preview.
  const fallbackWav = generateSynthesizedAudioTone(text.length, config.radioFilter)
  inMemoryVoiceCache.set(contentHash, {
    audioBase64: fallbackWav,
    format: 'wav',
    style: voiceStyle,
  })

  return {
    audioBase64: fallbackWav,
    format: 'wav',
    fromCache: false,
    contentHash,
    voiceStyle,
    isDemoFallback: true,
  }
}

/**
 * Generate a subtle melodic harp & chime tone (WAV) representing the emotional cadence
 * for offline and zero-cost test environments.
 */
function generateSynthesizedAudioTone(durationChars: number, radioFilter: boolean): string {
  const sampleRate = 22050
  const seconds = Math.min(Math.max(durationChars * 0.05, 3), 12)
  const totalSamples = Math.floor(sampleRate * seconds)
  const buffer = Buffer.alloc(44 + totalSamples * 2)

  // WAV Header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + totalSamples * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20) // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22) // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24) // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28) // ByteRate
  buffer.writeUInt16LE(2, 32) // BlockAlign
  buffer.writeUInt16LE(16, 34) // BitsPerSample
  buffer.write('data', 36)
  buffer.writeUInt32LE(totalSamples * 2, 40)

  // Gentle acoustic frequencies (Pentatonic emotional chord: D, F#, A, B, D)
  const baseFreqs = [293.66, 369.99, 440.0, 493.88, 587.33]

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate
    const noteIdx = Math.floor((t * 2) % baseFreqs.length)
    const freq = baseFreqs[noteIdx]

    // Envelope
    const noteTime = (t * 2) % 1
    const env = Math.exp(-noteTime * 3)

    let sample = Math.sin(2 * Math.PI * freq * t) * env * 0.35

    // Add radio warmth / harmonic saturation if vintage-radio
    if (radioFilter) {
      sample = Math.sin(sample * 1.8) * 0.8 // soft saturation
      sample += (Math.random() - 0.5) * 0.02 // slight vintage tape/radio air
    }

    // Fade out at end
    if (t > seconds - 0.5) {
      sample *= Math.max(0, (seconds - t) / 0.5)
    }

    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)))
    buffer.writeInt16LE(int16, 44 + i * 2)
  }

  return buffer.toString('base64')
}
