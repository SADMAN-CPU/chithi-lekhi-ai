'use client'

import React, { useState, useRef, useCallback } from 'react'
import { toPng } from 'html-to-image'
import {
  Download,
  Share2,
  Feather,
  Sparkles,
  X,
} from 'lucide-react'
import { formatDate } from '@/utils/helpers'

export type VintageCardStyle = '90s-paper' | 'romantic-vintage' | 'minimal-premium' | 'modern-card'
export type CardAspectRatio = 'portrait' | 'square' | 'natural'

interface VintageLetterVisualProps {
  letter: string
  receiverName: string
  relationship?: string
  date?: string
  onClose?: () => void
}

export function VintageLetterVisualStudio({
  letter,
  receiverName,
  relationship,
  date,
  onClose,
}: VintageLetterVisualProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // Customizer state
  const [cardStyle, setCardStyle] = useState<VintageCardStyle>('90s-paper')
  const [aspectRatio, setAspectRatio] = useState<CardAspectRatio>('portrait')
  const [fontSize, setFontSize] = useState<'normal' | 'small' | 'large'>('normal')
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Style configurations
  const stylesConfig: Record<
    VintageCardStyle,
    {
      name: string
      nameEn: string
      emoji: string
      bgClass: string
      textClass: string
      borderClass: string
      postmarkColor: string
      stampBg: string
    }
  > = {
    '90s-paper': {
      name: '৯০-এর পুরোনো কাগজ',
      nameEn: '90s Old Paper',
      emoji: '✉️',
      bgClass: 'bg-[#F7F2E7] text-[#2C3440]',
      textClass: 'font-bengali text-[#1E293B]',
      borderClass: 'border-[#D9CFBE]',
      postmarkColor: 'text-[#8C4A32] border-[#8C4A32]',
      stampBg: 'bg-[#F2E8D5] border-[#B89F7D]',
    },
    'romantic-vintage': {
      name: 'রোমান্টিক ভিন্টেজ',
      nameEn: 'Romantic Vintage',
      emoji: '🌸',
      bgClass: 'bg-gradient-to-br from-[#FFF0F3] via-[#FFE4E8] to-[#FFF5F7] text-[#4C0519]',
      textClass: 'font-bengali text-[#500724]',
      borderClass: 'border-[#FDA4AF]',
      postmarkColor: 'text-[#BE123C] border-[#BE123C]',
      stampBg: 'bg-[#FFE4E6] border-[#FB7185]',
    },
    'minimal-premium': {
      name: 'মিনিমাল প্রিমিয়াম',
      nameEn: 'Minimal Premium',
      emoji: '✨',
      bgClass: 'bg-[#FAF9F6] text-[#18181B]',
      textClass: 'font-bengali text-[#27272A]',
      borderClass: 'border-[#E4E4E7]',
      postmarkColor: 'text-[#52525B] border-[#71717A]',
      stampBg: 'bg-white border-[#D4D4D8]',
    },
    'modern-card': {
      name: 'মডার্ন কার্ড',
      nameEn: 'Modern Card',
      emoji: '💎',
      bgClass: 'bg-gradient-to-br from-[#FDF2F8] via-[#FFFFFF] to-[#EFF6FF] text-[#0F172A]',
      textClass: 'font-bengali text-[#1E293B]',
      borderClass: 'border-[#E2E8F0]',
      postmarkColor: 'text-[#E11D48] border-[#E11D48]',
      stampBg: 'bg-white border-[#CBD5E1]',
    },
  }

  // Handle Download Image (PNG)
  const handleDownloadImage = useCallback(async () => {
    if (!cardRef.current) return
    setDownloading(true)
    setStatusMessage('ইমেজ তৈরি হচ্ছে...')

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5, // Retina sharpness
        quality: 0.98,
      })

      const link = document.createElement('a')
      link.download = `chithi-${(receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}-${cardStyle}.png`
      link.href = dataUrl
      link.click()

      setStatusMessage('ইমেজ ডাউনলোড সম্পন্ন!')
      setTimeout(() => setStatusMessage(null), 2500)
    } catch (err) {
      console.error('Image export failed:', err)
      setStatusMessage('ইমেজ রূপান্তরে সমস্যা হয়েছে।')
      setTimeout(() => setStatusMessage(null), 2500)
    } finally {
      setDownloading(false)
    }
  }, [cardStyle, receiverName])

  // Handle Share Image (Web Share API with fallback)
  const handleShareImage = useCallback(async () => {
    if (!cardRef.current) return
    setSharing(true)
    setStatusMessage('শেয়ারের জন্য প্রস্তুত হচ্ছে...')

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        quality: 0.98,
      })

      const blob = await (await fetch(dataUrl)).blob()
      const file = new File(
        [blob],
        `chithi-for-${(receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}.png`,
        { type: 'image/png' }
      )

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `চিঠি — ${receiverName}`,
          text: `💌 ${receiverName}-এর জন্য একটি চিঠি\n— চিঠি লেখাই এআই (Chithi Lekhi AI)`,
          files: [file],
        })
        setStatusMessage('শেয়ার সম্পন্ন!')
      } else {
        // Fallback: download image and copy text
        const link = document.createElement('a')
        link.download = file.name
        link.href = dataUrl
        link.click()
        await navigator.clipboard.writeText(letter)
        setStatusMessage('ইমেজ ডাউনলোড হয়েছে ও টেক্সট কপি হয়েছে!')
      }
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      console.error('Share failed:', err)
      setStatusMessage('শেয়ার বাতিল হয়েছে বা সম্পন্ন হয়নি।')
      setTimeout(() => setStatusMessage(null), 2500)
    } finally {
      setSharing(false)
    }
  }, [letter, receiverName])

  // Aspect ratio container styles
  const ratioStyles: Record<CardAspectRatio, string> = {
    portrait: 'max-w-[440px] aspect-[4/5] min-h-[550px]',
    square: 'max-w-[480px] aspect-square min-h-[480px]',
    natural: 'max-w-[480px] min-h-[420px]',
  }

  // Font size classes
  const fontSizes = {
    small: 'text-[12.5px] sm:text-[13.5px] leading-relaxed',
    normal: 'text-[14px] sm:text-[15.5px] leading-relaxed sm:leading-loose',
    large: 'text-[16px] sm:text-[17.5px] leading-loose',
  }

  const currentTheme = stylesConfig[cardStyle]

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Studio Controls Header */}
      <div className="bg-white/90 backdrop-blur-md border border-rose-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-400 to-amber-300 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bengali font-bold text-base text-neutral-900 leading-tight">
                ভিন্টেজ লেটার ভিজ্যুয়াল কার্ড
              </h3>
              <p className="text-[11px] font-bengali text-neutral-500">
                চিঠিকে সোশ্যাল মিডিয়া বা ডাউনলোডের জন্য প্রস্তুত কার্ডে রূপ দিন
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 1. Theme Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bengali font-medium text-neutral-700">
            কার্ডের থিম নির্বাচন করুন:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(stylesConfig) as VintageCardStyle[]).map((stKey) => {
              const cfg = stylesConfig[stKey]
              const isSelected = cardStyle === stKey
              return (
                <button
                  key={stKey}
                  type="button"
                  onClick={() => setCardStyle(stKey)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-rose-400 bg-rose-50/80 ring-1 ring-rose-300 shadow-xs'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{cfg.emoji}</span>
                    <span className="font-bengali font-semibold text-xs text-neutral-900 block truncate">
                      {cfg.name}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Ratio & Font Options */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-neutral-100">
          {/* Aspect Ratio */}
          <div className="flex items-center gap-1.5 text-xs font-bengali">
            <span className="text-neutral-500">অনুপাত:</span>
            <button
              type="button"
              onClick={() => setAspectRatio('portrait')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                aspectRatio === 'portrait'
                  ? 'border-rose-400 bg-rose-50 text-rose-800 font-semibold'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              📱 স্টোরি (৪:৫)
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio('square')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                aspectRatio === 'square'
                  ? 'border-rose-400 bg-rose-50 text-rose-800 font-semibold'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              ⬛ স্কয়ার (১:১)
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio('natural')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                aspectRatio === 'natural'
                  ? 'border-rose-400 bg-rose-50 text-rose-800 font-semibold'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              📄 চিঠির মাপ
            </button>
          </div>

          {/* Font Size */}
          <div className="flex items-center gap-1 text-xs font-bengali">
            <span className="text-neutral-500 mr-1">ফন্ট সাইজ:</span>
            {(['small', 'normal', 'large'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setFontSize(sz)}
                className={`px-2 py-0.5 rounded-md border text-[11px] uppercase font-sans ${
                  fontSize === sz
                    ? 'border-rose-400 bg-rose-50 text-rose-800 font-semibold'
                    : 'border-neutral-200 text-neutral-500'
                }`}
              >
                {sz === 'small' ? 'A-' : sz === 'normal' ? 'A' : 'A+'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          THE VISUAL LETTER CANVAS (Rendered to PNG)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex justify-center p-2 overflow-x-auto">
        <div
          ref={cardRef}
          className={`w-full ${ratioStyles[aspectRatio]} ${currentTheme.bgClass} border ${currentTheme.borderClass} rounded-2xl shadow-xl p-6 sm:p-9 flex flex-col justify-between relative overflow-hidden transition-all duration-300`}
          style={{
            backgroundImage:
              cardStyle === '90s-paper'
                ? 'radial-gradient(#d3c5ad 0.65px, transparent 0.65px)'
                : undefined,
            backgroundSize: cardStyle === '90s-paper' ? '18px 18px' : undefined,
          }}
        >
          {/* Top Stamp & Postmark Detail */}
          <div className="flex items-start justify-between mb-4 select-none">
            <div>
              <span className="text-[10px] font-sans font-semibold tracking-widest uppercase opacity-50 block">
                PERSONAL AIRMAIL
              </span>
              <h2 className="font-bengali font-bold text-lg sm:text-xl leading-tight">
                প্রিয় {receiverName || 'কাছের মানুষ'}
              </h2>
              {relationship && (
                <span className="text-[10px] font-bengali opacity-60 block mt-0.5">
                  {relationship}
                </span>
              )}
            </div>

            {/* Vintage Postmark Stamp Badge */}
            <div className="flex items-center gap-1.5 opacity-90 pointer-events-none">
              <div
                className={`w-12 h-14 sm:w-14 sm:h-16 border-2 border-dashed ${currentTheme.stampBg} rounded flex flex-col items-center justify-center p-1 shadow-2xs rotate-3`}
              >
                <Feather className="w-4 h-4 sm:w-5 sm:h-5 opacity-70 mb-0.5" />
                <span className="text-[7px] sm:text-[8px] font-sans font-bold uppercase tracking-wider opacity-80">
                  CHITHI
                </span>
                <span className="text-[6px] sm:text-[7px] font-bengali opacity-70">
                  পোস্ট
                </span>
              </div>
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border ${currentTheme.postmarkColor} flex items-center justify-center -rotate-12 opacity-60`}
              >
                <span className="text-[5px] sm:text-[6px] font-mono font-bold tracking-tighter">
                  POST
                </span>
              </div>
            </div>
          </div>

          {/* Letter Body Content */}
          <div
            className={`my-auto font-bengali ${fontSizes[fontSize]} leading-relaxed whitespace-pre-wrap ${currentTheme.textClass} select-text`}
          >
            {letter}
          </div>

          {/* Bottom Card Footer with Subtle Branding */}
          <div className="pt-4 mt-4 border-t border-black/5 flex items-center justify-between text-[10px] sm:text-[11px] font-bengali opacity-50">
            <span>{date ? formatDate(date) : 'চিঠি লেখাই এআই'}</span>
            <span className="font-sans font-medium tracking-tight">chithi.ai • যে কথা মুখে বলা যায় না 💌</span>
          </div>
        </div>
      </div>

      {/* Download & Share Action Buttons */}
      <div className="bg-white/90 backdrop-blur-md border border-rose-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="text-xs font-bengali text-neutral-600">
          {statusMessage ? (
            <span className="text-rose-600 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              {statusMessage}
            </span>
          ) : (
            <span>রেটিনা কোয়ালিটি পিএনজি (PNG) আকারে সেভ ও শেয়ার করুন</span>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Download Image Button */}
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadImage}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bengali text-xs sm:text-sm font-semibold text-white shadow-xs transition-all ${
              downloading
                ? 'bg-neutral-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] glow-pink'
            }`}
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>ইমেজ ডাউনলোড (PNG)</span>
          </button>

          {/* Share Image Button */}
          <button
            type="button"
            disabled={sharing}
            onClick={handleShareImage}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors"
          >
            {sharing ? (
              <div className="w-4 h-4 border-2 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span>সোশ্যাল শেয়ার</span>
          </button>
        </div>
      </div>
    </div>
  )
}
