'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  Radio,
  Mic,
  RotateCcw,
  Check,
  Headphones,
} from 'lucide-react'
import { VOICE_STYLES, type VoiceStyle } from '@/constants/voice'
import { useLanguage } from '@/components/providers/LanguageProvider'

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
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'wav'>('mp3')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [radioDspEnabled, _setRadioDspEnabled] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const filterNodeRef = useRef<BiquadFilterNode | null>(null)
  const downloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current)
      }
    }
  }, [])

  // Track analytics event helper
  const trackAudioEvent = async (eventType: 'audio_play' | 'audio_generate' | 'download') => {
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
  }

  // Handle Audio Generation
  const handleGenerateAudio = async (styleToUse = selectedStyle) => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/voice-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: letterText,
          voiceStyle: styleToUse,
          receiverName,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'ভয়েস তৈরি করা সম্ভব হয়নি')
      }

      setAudioUri(data.audioDataUri)
      setAudioFormat(data.format || 'mp3')
      if (onAudioReady) {
        onAudioReady(data.audioDataUri)
      }

      trackAudioEvent('audio_generate')
    } catch (err: unknown) {
      console.error('Failed to generate audio:', err)
      setErrorMessage(err instanceof Error ? err.message : 'অডিও রূপান্তরে ত্রুটি হয়েছে')
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
          trackAudioEvent('audio_play')
        })
        .catch((err) => {
          console.error('Playback error:', err)
        })
    }
  }

  // Time Updates
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

  // Toggle Mute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Setup Web Audio API Vintage Radio DSP Filter (with proper bypass / disconnect)
  useEffect(() => {
    if (!audioRef.current || typeof window === 'undefined') return

    try {
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass()
        }
      }

      const ctx = audioContextRef.current
      if (!ctx) return

      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      if (!sourceNodeRef.current && audioRef.current) {
        sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current)
        filterNodeRef.current = ctx.createBiquadFilter()
        filterNodeRef.current.frequency.value = 1800 // 90s radio center frequency
        filterNodeRef.current.Q.value = 1.2
      }

      if (sourceNodeRef.current && filterNodeRef.current) {
        // Disconnect existing graph to prevent residual routing
        try {
          sourceNodeRef.current.disconnect()
          filterNodeRef.current.disconnect()
        } catch {
          // Ignore disconnection if not connected yet
        }

        const isRadio = selectedStyle === 'vintage-radio' || radioDspEnabled
        if (isRadio) {
          filterNodeRef.current.type = 'bandpass'
          filterNodeRef.current.frequency.value = 1800
          sourceNodeRef.current.connect(filterNodeRef.current)
          filterNodeRef.current.connect(ctx.destination)
        } else {
          // Warm, emotional, storytelling styles connect direct with full bandwidth
          sourceNodeRef.current.connect(ctx.destination)
        }
      }
    } catch (err) {
      console.warn('[WebAudio] Filter setup note:', err)
    }
  }, [selectedStyle, radioDspEnabled, audioUri])

  // Download Audio File
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
    <div className="w-full bg-gradient-to-br from-amber-50/90 via-rose-50/80 to-pink-50/90 dark:from-neutral-900/90 dark:via-neutral-900/80 dark:to-neutral-900/90 border border-amber-200/80 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/50 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-2xs">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bengali font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <span>AI Voice Letter (কণ্ঠে আবেগঘন চিঠি)</span>
              <span className="text-[10px] font-sans font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full">
                AI TTS
              </span>
            </h4>
            <p className="text-[11px] font-bengali text-neutral-600 dark:text-neutral-400">
              চিঠিটি বাস্তব মানুষের আবেগী কণ্ঠে রূপান্তর করে শুনুন ও সংরক্ষণ করুন
            </p>
          </div>
        </div>

        {/* Vintage Radio Mode Badge */}
        {selectedStyle === 'vintage-radio' && (
          <div className="inline-flex items-center gap-1.5 text-xs font-bengali text-amber-900 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-900/50 px-3 py-1 rounded-xl shadow-2xs">
            <Radio className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 animate-pulse" />
            <span>৯০ দশকের রেডিও আমেজ সক্রিয়</span>
          </div>
        )}
      </div>

      {/* 4 Voice Style Selection Chips */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bengali font-bold text-neutral-700 dark:text-neutral-300">
          {locale === 'en' ? 'Select Voice Style:' : 'কণ্ঠের ধরন নির্বাচন করুন (Voice Styles):'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(VOICE_STYLES) as VoiceStyle[]).map((styleId) => {
            const style = VOICE_STYLES[styleId]
            const isSelected = selectedStyle === styleId

            return (
              <button
                key={styleId}
                type="button"
                onClick={() => {
                  setSelectedStyle(styleId)
                  if (audioUri) {
                    // Auto-regenerate for new style
                    handleGenerateAudio(styleId)
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

      {/* Audio Action Area: Not Generated vs Generated Player */}
      {!audioUri ? (
        <div className="pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleGenerateAudio(selectedStyle)}
            className={`w-full py-3 px-4 rounded-2xl font-bengali font-bold text-sm text-white shadow-xs transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
              isLoading
                ? 'bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 via-rose-500 to-pink-600 hover:from-amber-700 hover:to-pink-700 active:scale-[0.99] glow-pink'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{locale === 'en' ? 'Transforming into emotional voice...' : 'আবেগী কণ্ঠে চিঠি রূপান্তর হচ্ছে...'}</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>{locale === 'en' ? 'Generate AI Voice Letter' : 'ভয়েস চিঠি তৈরি করুন (Generate AI Voice)'}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              </>
            )}
          </button>
        </div>
      ) : (
        /* Audio Player Widget */
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs border border-amber-200/90 dark:border-neutral-800 rounded-2xl p-4 shadow-2xs space-y-3">
          {/* HTML5 Audio element */}
          <audio
            ref={audioRef}
            src={audioUri}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleAudioEnded}
            preload="metadata"
          />

          {/* Controls Strip */}
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 shrink-0 cursor-pointer"
              title={isPlaying ? (locale === 'en' ? 'Pause' : 'বিরতি দিন') : (locale === 'en' ? 'Listen' : 'চিঠি শুনুন')}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            {/* Scrubber & Duration */}
            <div className="flex-1 space-y-1">
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

            {/* Mute Button */}
            <button
              type="button"
              onClick={toggleMute}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title={isMuted ? (locale === 'en' ? 'Unmute' : 'আনমিউট') : (locale === 'en' ? 'Mute' : 'মিউট')}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Player Footer Actions */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bengali font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-lg border border-rose-200/60 dark:border-rose-900/40">
                {VOICE_STYLES[selectedStyle].emoji} {locale === 'en' ? VOICE_STYLES[selectedStyle].nameEn : VOICE_STYLES[selectedStyle].nameBn}
              </span>

              {/* Re-generate / Re-record button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleGenerateAudio(selectedStyle)}
                className="inline-flex items-center gap-1 text-xs font-bengali text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/70 dark:hover:bg-neutral-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{locale === 'en' ? 'Regenerate' : 'পুনরায় তৈরি'}</span>
              </button>
            </div>

            {/* Download Audio Button */}
            <button
              type="button"
              onClick={handleDownload}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl font-bengali text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
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
                  <span>{locale === 'en' ? `Download Audio (${audioFormat.toUpperCase()})` : `অডিও ডাউনলোড (${audioFormat.toUpperCase()})`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
