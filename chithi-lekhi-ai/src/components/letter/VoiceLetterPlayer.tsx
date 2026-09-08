'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Radio,
  RotateCcw,
  Check,
  Headphones,
  Square,
  FastForward,
} from 'lucide-react'
import { VOICE_STYLES, type VoiceStyle } from '@/constants/voice'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { cleanLetterForSpeech } from '@/lib/voice-utils'

interface VoiceLetterPlayerProps {
  letterText: string
  receiverName?: string
  shareToken?: string
  initialVoiceStyle?: VoiceStyle
  onAudioReady?: (audioUri: string) => void
}

export function VoiceLetterPlayer({
  letterText,
  receiverName,
  shareToken,
  initialVoiceStyle = 'warm',
  onAudioReady,
}: VoiceLetterPlayerProps) {
  const { locale } = useLanguage()
  const [selectedStyle, setSelectedStyle] = useState<VoiceStyle>(initialVoiceStyle)
  const [isLoading, setIsLoading] = useState(false)
  const [engineMode, setEngineMode] = useState<'idle' | 'server-tts' | 'browser-speech'>('idle')
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'wav'>('mp3')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number>(-1)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const downloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isCancelledRef = useRef<boolean>(false)

  // Clean letter text for speech
  const cleanedText = useMemo(() => {
    return cleanLetterForSpeech(letterText)
  }, [letterText])

  // Split into clean sentence chunks for read-along
  const sentences = useMemo(() => {
    if (!cleanedText) return []
    const raw = cleanedText
      .split(/(?<=[।!?\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    return raw.length > 0 ? raw : [cleanedText]
  }, [cleanedText])

  // Stop all active audio / speech
  const stopAllAudio = useCallback(() => {
    isCancelledRef.current = true
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentSentenceIdx(-1)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudio()
      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current)
      }
    }
  }, [stopAllAudio])

  // Reset player state during render when letter text changes
  const [prevLetterText, setPrevLetterText] = useState(letterText)
  if (prevLetterText !== letterText) {
    setPrevLetterText(letterText)
    setAudioUri(null)
    setEngineMode('idle')
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentSentenceIdx(-1)
  }

  // Stop any active speech or audio playback when letter changes
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [letterText])

  // Track analytics event helper
  const trackAudioEvent = useCallback(
    async (eventType: 'audio_play' | 'audio_generate' | 'download') => {
      if (!shareToken) return
      try {
        await fetch('/api/shares/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shareToken,
            eventType,
            platform: 'audio',
          }),
        })
      } catch {
        // Non-blocking analytics
      }
    },
    [shareToken]
  )

  // ─── Browser Web Speech API Playback ─────────────────────────────────────────
  const playViaBrowserSpeech = useCallback(
    (styleId: VoiceStyle, speedMultiplier = playbackSpeed, startFromIdx = 0) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setErrorMessage(
          locale === 'en'
            ? 'Web Speech API is not supported in this browser.'
            : 'আপনার ব্রাউজারে স্পিচ সিন্থেসিস সমর্থিত নয়।'
        )
        return
      }

      window.speechSynthesis.cancel()
      isCancelledRef.current = false
      setEngineMode('browser-speech')
      setIsPlaying(true)
      setIsPaused(false)

      const config = VOICE_STYLES[styleId] || VOICE_STYLES.warm
      const voices = window.speechSynthesis.getVoices()
      const bnVoice =
        voices.find((v) => v.lang.startsWith('bn')) ||
        voices.find((v) => v.lang.includes('IN') || v.lang.includes('BD')) ||
        null

      const effectiveRate = Math.max(0.5, Math.min(2.0, config.speechRate * speedMultiplier))
      const effectivePitch = config.speechPitch

      const speakSentence = (idx: number) => {
        if (isCancelledRef.current || idx >= sentences.length) {
          setIsPlaying(false)
          setIsPaused(false)
          setCurrentSentenceIdx(-1)
          return
        }

        setCurrentSentenceIdx(idx)
        const utterance = new SpeechSynthesisUtterance(sentences[idx])
        if (bnVoice) utterance.voice = bnVoice
        utterance.rate = effectiveRate
        utterance.pitch = effectivePitch

        utterance.onend = () => {
          if (!isCancelledRef.current) {
            speakSentence(idx + 1)
          }
        }

        utterance.onerror = (e) => {
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            console.warn('[VoicePlayer] Speech error on sentence:', e)
          }
        }

        window.speechSynthesis.speak(utterance)
      }

      speakSentence(startFromIdx)
      trackAudioEvent('audio_play')
    },
    [locale, sentences, playbackSpeed, trackAudioEvent]
  )

  // ─── Start / Generate Voice Letter ───────────────────────────────────────────
  const handleStartVoiceLetter = async (styleToUse = selectedStyle) => {
    stopAllAudio()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/voice-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanedText,
          voiceStyle: styleToUse,
          receiverName,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'ভয়েস রূপান্তরে সমস্যা হয়েছে')
      }

      if (data.mode === 'server-tts' && data.audioDataUri) {
        setEngineMode('server-tts')
        setAudioUri(data.audioDataUri)
        setAudioFormat(data.format || 'mp3')
        if (onAudioReady) {
          onAudioReady(data.audioDataUri)
        }
        trackAudioEvent('audio_generate')

        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed
            audioRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch((err) => console.warn('Autoplay prevented:', err))
          }
        }, 150)
      } else {
        setEngineMode('browser-speech')
        playViaBrowserSpeech(styleToUse, playbackSpeed, 0)
      }
    } catch (err: unknown) {
      console.warn('Server TTS unavailable, falling back to browser speech:', err)
      setEngineMode('browser-speech')
      playViaBrowserSpeech(styleToUse, playbackSpeed, 0)
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Play / Pause / Resume ──────────────────────────────────────────────────
  const togglePlayPause = () => {
    if (engineMode === 'server-tts') {
      if (!audioRef.current) return
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
        setIsPaused(true)
      } else {
        audioRef.current.playbackRate = playbackSpeed
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true)
            setIsPaused(false)
            trackAudioEvent('audio_play')
          })
          .catch((err) => console.error('Audio play error:', err))
      }
    } else if (engineMode === 'browser-speech') {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

      if (isPlaying && !isPaused) {
        window.speechSynthesis.pause()
        setIsPaused(true)
      } else if (isPaused) {
        window.speechSynthesis.resume()
        setIsPaused(false)
        setIsPlaying(true)
      } else {
        playViaBrowserSpeech(selectedStyle, playbackSpeed, Math.max(0, currentSentenceIdx))
      }
    } else {
      // Idle: start speaking
      handleStartVoiceLetter(selectedStyle)
    }
  }

  // Stop playback completely
  const handleStop = () => {
    stopAllAudio()
  }

  // Handle Playback Speed Selection
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    if (engineMode === 'server-tts' && audioRef.current) {
      audioRef.current.playbackRate = speed
    } else if (engineMode === 'browser-speech' && isPlaying) {
      playViaBrowserSpeech(selectedStyle, speed, Math.max(0, currentSentenceIdx))
    }
  }

  // Time Updates for HTML5 Audio
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = target
      setCurrentTime(target)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Download Audio File (When Server TTS generated)
  const handleDownload = () => {
    if (!audioUri) return
    const link = document.createElement('a')
    link.href = audioUri
    link.download = `chithi-${receiverName ? receiverName.replace(/\s+/g, '-') : 'voice'}-${selectedStyle}.${audioFormat}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setDownloaded(true)
    if (downloadTimeoutRef.current) clearTimeout(downloadTimeoutRef.current)
    downloadTimeoutRef.current = setTimeout(() => setDownloaded(false), 2500)
    trackAudioEvent('download')
  }

  const formatSecs = (sec: number) => {
    if (isNaN(sec)) return '0:00'
    const mins = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${mins}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="w-full bg-gradient-to-br from-amber-50/95 via-rose-50/85 to-orange-50/90 dark:from-neutral-900/95 dark:via-neutral-900/90 dark:to-neutral-900/95 border border-amber-200/80 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 flex items-center justify-center text-white shadow-xs">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bengali font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>{locale === 'en' ? 'Read My Letter Aloud' : 'চিঠিটি পাঠ করে শুনুন'}</span>
              <span className="text-[10px] font-sans font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/60 dark:border-amber-900">
                {engineMode === 'server-tts' ? 'Studio HD Voice' : 'Voice Reader'}
              </span>
            </h4>
            <p className="text-xs font-bengali text-neutral-600 dark:text-neutral-400">
              {locale === 'en'
                ? 'Converts the exact letter into natural spoken voice without filler lines'
                : 'সম্পূর্ণ মূল চিঠিটি কোনো অতিরিক্ত কথা ছাড়াই স্বাভাবিক ও স্পষ্ট কণ্ঠে শুনুন'}
            </p>
          </div>
        </div>

        {/* Vintage Radio Mode Notice */}
        {selectedStyle === 'vintage-radio' && (
          <div className="inline-flex items-center gap-1.5 text-xs font-bengali text-amber-900 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-900/60 px-3 py-1 rounded-xl shadow-2xs">
            <Radio className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 animate-pulse" />
            <span>{locale === 'en' ? 'Classic Radio Vibe' : '৯০ দশকের ক্লাসিক রেডিও কণ্ঠ'}</span>
          </div>
        )}
      </div>

      {/* 4 Voice Style Selection Chips */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bengali font-bold text-neutral-700 dark:text-neutral-300">
          {locale === 'en' ? 'Select Reading Tone:' : 'পড়ার সুর ও বাচনভঙ্গি নির্বাচন করুন:'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['warm-mother', 'emotional', 'storytelling', 'professional'] as VoiceStyle[]).map((styleId) => {
            const style = VOICE_STYLES[styleId]
            const isSelected = selectedStyle === styleId || (selectedStyle === 'warm' && styleId === 'warm-mother')

            return (
              <button
                key={styleId}
                type="button"
                onClick={() => {
                  setSelectedStyle(styleId)
                  if (isPlaying) {
                    stopAllAudio()
                    setTimeout(() => handleStartVoiceLetter(styleId), 100)
                  }
                }}
                className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all text-xs font-bengali min-h-[64px] cursor-pointer ${
                  isSelected
                    ? 'border-rose-400 dark:border-rose-500 bg-white dark:bg-neutral-800 text-rose-900 dark:text-rose-200 shadow-xs ring-2 ring-rose-200/60 dark:ring-rose-900/40'
                    : 'border-neutral-200/80 dark:border-neutral-700 bg-white/60 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-base">{style.emoji}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                </div>
                <div>
                  <span className="font-bold block text-[13px] leading-tight text-neutral-900 dark:text-neutral-100">
                    {locale === 'en' ? style.nameEn : style.nameBn}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-sans block">
                    {locale === 'en' ? style.nameBn : style.nameEn}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-bengali text-red-700 dark:text-red-300">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Active Read-Along Sentence Display with Waveform Visualizer */}
      {(isPlaying || isPaused || currentSentenceIdx >= 0) && (
        <div className="p-3.5 bg-white/95 dark:bg-neutral-900/95 border border-amber-200 dark:border-neutral-800 rounded-2xl shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bengali text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
              {locale === 'en' ? 'Now Reading:' : 'এখন পাঠ করা হচ্ছে:'}
            </span>
            <span>
              {currentSentenceIdx >= 0
                ? `${currentSentenceIdx + 1} / ${sentences.length}`
                : `${sentences.length} ${locale === 'en' ? 'sentences' : 'বাক্য'}`}
            </span>
          </div>

          <p className="font-bengali text-sm sm:text-base text-neutral-900 dark:text-neutral-100 italic bg-amber-50/70 dark:bg-neutral-800/60 p-3 rounded-xl border-l-3 border-rose-500">
            &ldquo;
            {currentSentenceIdx >= 0 && sentences[currentSentenceIdx]
              ? sentences[currentSentenceIdx]
              : cleanedText.slice(0, 120) + (cleanedText.length > 120 ? '...' : '')}
            &rdquo;
          </p>

          {/* Real-time Animated Waveform Visualizer */}
          <div className="flex items-center justify-center gap-1 h-6 py-1">
            {[40, 75, 55, 90, 65, 85, 45, 95, 70, 60, 80, 50, 90, 65, 40, 70].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-rose-500 to-amber-400 transition-all duration-150"
                style={{
                  height: isPlaying ? `${Math.max(15, h * 0.9)}%` : '15%',
                  opacity: isPlaying ? 0.9 : 0.25,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Audio Controls Strip */}
      <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border border-amber-200/90 dark:border-neutral-800 rounded-2xl p-4 shadow-2xs space-y-3">
        {/* Hidden HTML5 Audio Element for Server TTS */}
        {audioUri && (
          <audio
            ref={audioRef}
            src={audioUri}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleAudioEnded}
            preload="metadata"
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayPause}
              disabled={isLoading}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xs transition-transform active:scale-95 cursor-pointer ${
                isLoading
                  ? 'bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed'
                  : 'bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 glow-pink'
              }`}
              title={
                isPlaying
                  ? (locale === 'en' ? 'Pause' : 'বিরতি দিন')
                  : (locale === 'en' ? 'Listen to Letter' : 'চিঠি শুনুন')
              }
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>

            {/* Stop Button */}
            {(isPlaying || isPaused || currentSentenceIdx >= 0) && (
              <button
                type="button"
                onClick={handleStop}
                className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
                title={locale === 'en' ? 'Stop' : 'বন্ধ করুন'}
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            )}

            <div>
              <span className="font-bengali font-bold text-sm block text-neutral-900 dark:text-neutral-100">
                {isPlaying
                  ? (locale === 'en' ? 'Playing...' : 'চিঠি পাঠ চলছে...')
                  : isPaused
                  ? (locale === 'en' ? 'Paused' : 'বিরতিতে আছে')
                  : (locale === 'en' ? 'Listen to Letter' : 'চিঠি শুনুন')}
              </span>
              <span className="text-[11px] font-sans text-neutral-500 dark:text-neutral-400">
                {VOICE_STYLES[selectedStyle].emoji} {locale === 'en' ? VOICE_STYLES[selectedStyle].nameEn : VOICE_STYLES[selectedStyle].nameBn}
              </span>
            </div>
          </div>

          {/* Speed Multiplier Selectors */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
            <span className="text-[10px] font-sans font-semibold text-neutral-500 dark:text-neutral-400 px-1.5 flex items-center gap-0.5">
              <FastForward className="w-3 h-3" />
              Speed:
            </span>
            {[0.75, 1.0, 1.25, 1.5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => handleSpeedChange(spd)}
                className={`text-[11px] font-mono px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-rose-500 text-white font-bold shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Scrubber & Duration (When Server-TTS Audio is loaded) */}
        {engineMode === 'server-tts' && audioUri && (
          <div className="space-y-1 pt-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
              <span>{formatSecs(currentTime)}</span>
              <span>{formatSecs(duration)}</span>
            </div>
          </div>
        )}

        {/* Footer Actions: Replay, Mute, Download */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStartVoiceLetter(selectedStyle)}
              disabled={isLoading}
              className="inline-flex items-center gap-1 text-xs font-bengali text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{locale === 'en' ? 'Start From Beginning' : 'শুরু থেকে শুনুন'}</span>
            </button>

            {engineMode === 'server-tts' && (
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Download Button (Active for Server-TTS audio) */}
          {audioUri && (
            <button
              type="button"
              onClick={handleDownload}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bengali text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                downloaded
                  ? 'bg-emerald-600 text-white shadow-emerald-200'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {downloaded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>{locale === 'en' ? 'Downloaded!' : 'ডাউনলোড সম্পন্ন!'}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? `Download MP3` : `অডিও সংরক্ষণ (MP3)`}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
