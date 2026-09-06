'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import {
  Download,
  Share2,
  Feather,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  Maximize2,
  Sliders,
  CheckCircle2,
} from 'lucide-react'
import { formatDate } from '@/utils/helpers'
import {
  partitionLetterIntoPages,
  QUALITY_CONFIG,
  type QualityTier,
  type TargetAspectRatio,
  type FontSizeChoice,
} from '@/lib/letter-layout-engine'

export type VintageCardStyle = '90s-paper' | 'romantic-vintage' | 'minimal-premium' | 'modern-card'

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
  const [aspectRatio, setAspectRatio] = useState<TargetAspectRatio>('portrait')
  const [fontSizeChoice, setFontSizeChoice] = useState<FontSizeChoice>('auto')
  const [qualityTier, setQualityTier] = useState<QualityTier>('high')
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Layout Engine: Partitions letter across pages and calculates metrics
  const layout = useMemo(() => {
    return partitionLetterIntoPages(letter, {
      ratio: aspectRatio,
      fontSizeChoice,
    })
  }, [letter, aspectRatio, fontSizeChoice])

  const totalPages = layout.totalPages
  const activePageIndex = Math.min(currentPageIndex, totalPages - 1)
  const activePageText = layout.pages[activePageIndex] || letter

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

  const qualitySetting = QUALITY_CONFIG[qualityTier]

  // Helper to determine safe mobile pixel ratio to prevent canvas memory crashes
  const getSafeMobilePixelRatio = useCallback((targetRatio: number) => {
    if (typeof window === 'undefined') return 2.0
    const isMobile =
      /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth < 768
    return isMobile ? Math.min(2.0, targetRatio) : targetRatio
  }, [])

  // Handle Download Single Page / Full Continuous Canvas
  const handleDownloadCurrentPage = useCallback(async () => {
    if (!cardRef.current) return
    setDownloading(true)
    setStatusMessage(`${qualitySetting.labelBn} এ রেন্ডার হচ্ছে...`)

    try {
      const { toPng } = await import('html-to-image')
      const pixelRatio = getSafeMobilePixelRatio(qualitySetting.pixelRatio)

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio,
        quality: qualitySetting.quality,
      })

      const pageSuffix = totalPages > 1 ? `-page-${activePageIndex + 1}` : ''
      const link = document.createElement('a')
      link.download = `chithi-${(receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}-${cardStyle}${pageSuffix}.png`
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
  }, [cardStyle, receiverName, totalPages, activePageIndex, qualitySetting, getSafeMobilePixelRatio])

  // Handle Sequential Batch Download of All Pages (Memory Optimized for Mobile)
  const handleDownloadAllPages = useCallback(async () => {
    if (totalPages <= 1) {
      await handleDownloadCurrentPage()
      return
    }

    setDownloading(true)
    try {
      const { toPng } = await import('html-to-image')
      const pixelRatio = getSafeMobilePixelRatio(qualitySetting.pixelRatio)

      for (let i = 0; i < totalPages; i++) {
        setCurrentPageIndex(i)
        setStatusMessage(`পৃষ্ঠা ${i + 1}/${totalPages} রেন্ডার ও ডাউনলোড হচ্ছে...`)
        // Wait for React DOM update and font rendering stabilization
        await new Promise((r) => setTimeout(r, 450))

        if (cardRef.current) {
          const dataUrl = await toPng(cardRef.current, {
            cacheBust: true,
            pixelRatio,
            quality: qualitySetting.quality,
          })

          const link = document.createElement('a')
          link.download = `chithi-${(receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}-page-${i + 1}.png`
          link.href = dataUrl
          link.click()
        }
      }
      setStatusMessage(`সবগুলো (${totalPages}টি) পৃষ্ঠা সফলভাবে ডাউনলোড হয়েছে!`)
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      console.error('Batch export failed:', err)
      setStatusMessage('ব্যাচ ডাউনলোডে সমস্যা হয়েছে।')
      setTimeout(() => setStatusMessage(null), 3000)
    } finally {
      setDownloading(false)
    }
  }, [totalPages, handleDownloadCurrentPage, receiverName, qualitySetting, getSafeMobilePixelRatio])

  // Handle Web Share
  const handleShareImage = useCallback(async () => {
    if (!cardRef.current) return
    setSharing(true)
    setStatusMessage('শেয়ারের জন্য প্রস্তুত হচ্ছে...')

    try {
      const { toPng } = await import('html-to-image')
      const pixelRatio = getSafeMobilePixelRatio(qualitySetting.pixelRatio)

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio,
        quality: qualitySetting.quality,
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
      setStatusMessage('শেয়ার বাতিল হয়েছে।')
      setTimeout(() => setStatusMessage(null), 2500)
    } finally {
      setSharing(false)
    }
  }, [letter, receiverName, qualitySetting, getSafeMobilePixelRatio])

  // Dynamic Container Styles: NO rigid max-height or clipping
  const ratioContainerStyles: Record<TargetAspectRatio, string> = {
    portrait: 'max-w-[440px] min-h-[550px]',
    square: 'max-w-[480px] min-h-[480px]',
    a4: 'max-w-[460px] min-h-[650px]',
    natural: 'max-w-[500px] min-h-[380px]',
  }

  const currentTheme = stylesConfig[cardStyle]

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Studio Controls Header */}
      <div className="bg-white/95 backdrop-blur-md border border-rose-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bengali font-bold text-base text-neutral-900 leading-tight">
                  ফুল লেটার ইমেজ রেন্ডারিং ইঞ্জিন
                </h3>
                <span className="text-[10px] font-bengali font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {layout.metrics.category === 'short'
                    ? 'সংক্ষিপ্ত চিঠি (১ পৃষ্ঠা)'
                    : layout.metrics.category === 'medium'
                    ? `আদর্শ দৈর্ঘ্য (${totalPages} পৃষ্ঠা)`
                    : `দীর্ঘ চিঠি (${totalPages} পৃষ্ঠা • জিরো ক্রপ)`}
                </span>
              </div>
              <p className="text-[11px] font-bengali text-neutral-500">
                চিঠির কোনো অংশ ক্রপ হবে না — সম্ভাষণ, বডি প্যারাগ্রাফ ও স্বাক্ষর ১০০% অক্ষুণ্ণ থাকবে
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
            কার্ডের ভিন্টেজ থিম:
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

        {/* 2. Aspect Ratio Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bengali">
            <span className="text-neutral-500">রেশিও:</span>
            <button
              type="button"
              onClick={() => {
                setAspectRatio('portrait')
                setCurrentPageIndex(0)
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                aspectRatio === 'portrait'
                  ? 'border-rose-400 bg-rose-50 text-rose-800 font-semibold shadow-2xs'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              📱 ৪:৫ (১০৮০ × ১৩৫০)
            </button>
            <button
              type="button"
              onClick={() => {
                setAspectRatio('square')
                setCurrentPageIndex(0)
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                aspectRatio === 'square'
                  ? 'border-rose-400 bg-rose-50 text-rose-800 font-semibold shadow-2xs'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              ⬛ ১:১ (১০৮০ × ১০৮০)
            </button>
            <button
              type="button"
              onClick={() => {
                setAspectRatio('a4')
                setCurrentPageIndex(0)
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                aspectRatio === 'a4'
                  ? 'border-rose-400 bg-rose-50 text-rose-800 font-semibold shadow-2xs'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              📜 এ৪ পেপার (A4)
            </button>
            <button
              type="button"
              onClick={() => {
                setAspectRatio('natural')
                setCurrentPageIndex(0)
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                aspectRatio === 'natural'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold shadow-2xs'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Maximize2 className="w-3 h-3 text-emerald-600" />
              <span>অটো-হাইট (সম্পূর্ণ চিঠি)</span>
            </button>
          </div>

          {/* Typography Scale */}
          <div className="flex items-center gap-1 text-xs font-bengali">
            <span className="text-neutral-500 mr-1">ফন্ট সাইজ:</span>
            {(['auto', 'small', 'normal', 'large'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setFontSizeChoice(sz)}
                className={`px-2 py-0.5 rounded-md border text-[11px] font-bengali ${
                  fontSizeChoice === sz
                    ? 'border-rose-400 bg-rose-50 text-rose-800 font-semibold'
                    : 'border-neutral-200 text-neutral-500'
                }`}
              >
                {sz === 'auto' ? 'অটো' : sz === 'small' ? 'ছোট' : sz === 'normal' ? 'স্বাভাবিক' : 'বড়'}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Image Quality Options (Standard, High Quality, Print Quality) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-1.5 text-xs font-bengali text-neutral-600">
            <Sliders className="w-3.5 h-3.5 text-neutral-500" />
            <span className="font-medium">ইমেজ কোয়ালিটি:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(['standard', 'high', 'print'] as const).map((tier) => {
              const item = QUALITY_CONFIG[tier]
              const isSelected = qualityTier === tier
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setQualityTier(tier)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bengali transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'border-rose-400 bg-rose-50 text-rose-800 font-semibold shadow-2xs'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-rose-600" />}
                  <span>{item.labelBn}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Multi-Page Pagination Bar (Guarantees zero text loss across pages) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs font-bengali text-amber-900">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>
                চিঠি দীর্ঘ হওয়ায় <strong>{totalPages}টি পৃষ্ঠায়</strong> বিভক্ত করা হয়েছে (কোনো বাক্য বা স্বাক্ষর কাটা পড়বে না)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activePageIndex === 0}
                onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
                className="p-1 rounded-md border border-amber-200 bg-white disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-xs">
                পৃষ্ঠা {activePageIndex + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={activePageIndex === totalPages - 1}
                onClick={() => setCurrentPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                className="p-1 rounded-md border border-amber-200 bg-white disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          THE VISUAL LETTER CANVAS (Zero-Crop Guarantee)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex justify-center p-2 overflow-x-auto bg-neutral-100/50 rounded-2xl border border-neutral-200/60">
        <div
          ref={cardRef}
          className={`w-full ${ratioContainerStyles[aspectRatio]} ${currentTheme.bgClass} border-2 ${currentTheme.borderClass} rounded-2xl shadow-xl p-6 sm:p-9 flex flex-col justify-between relative transition-all duration-300`}
          style={{
            backgroundImage:
              cardStyle === '90s-paper'
                ? 'radial-gradient(#d3c5ad 0.65px, transparent 0.65px)'
                : undefined,
            backgroundSize: cardStyle === '90s-paper' ? '18px 18px' : undefined,
          }}
        >
          {/* Top Header: Airmail Stamp, Receiver Name, Relationship */}
          <div className="flex items-start justify-between mb-4 select-none">
            <div>
              <span className="text-[10px] font-sans font-semibold tracking-widest uppercase opacity-50 block">
                {totalPages > 1
                  ? `AIRMAIL LETTER • PAGE ${activePageIndex + 1}/${totalPages}`
                  : 'PERSONAL AIRMAIL LETTER'}
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
                  ডাকটিকিট
                </span>
              </div>
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border ${currentTheme.postmarkColor} flex items-center justify-center -rotate-12 opacity-60`}
              >
                <span className="text-[5px] sm:text-[6px] font-mono font-bold tracking-tighter">
                  DHAKA
                </span>
              </div>
            </div>
          </div>

          {/* Letter Body: Clean Bengali typography, zero-crop, natural flow */}
          <div
            className={`my-auto font-bengali ${layout.computedFontSize.cssClass} whitespace-pre-wrap ${currentTheme.textClass} select-text py-2`}
          >
            {activePageText}
          </div>

          {/* Bottom Card Footer with Date, Signature Guarantee, & Watermark */}
          <div className="pt-4 mt-4 border-t border-black/5 flex items-center justify-between text-[10px] sm:text-[11px] font-bengali opacity-50 select-none">
            <span>
              {date ? formatDate(date) : 'চিঠি লেখাই এআই'}
              {totalPages > 1 && ` • পৃষ্ঠা ${activePageIndex + 1}/${totalPages}`}
            </span>
            <span className="font-sans font-medium tracking-tight">chithi.ai • যে কথা মুখে বলা যায় না 💌</span>
          </div>
        </div>
      </div>

      {/* Download & Share Action Buttons */}
      <div className="bg-white/95 backdrop-blur-md border border-rose-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="text-xs font-bengali text-neutral-600">
          {statusMessage ? (
            <span className="text-rose-600 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              {statusMessage}
            </span>
          ) : (
            <span>{qualitySetting.descriptionBn}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Download Current Page */}
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadCurrentPage}
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
            <span>
              {totalPages > 1 ? `পৃষ্ঠা ${activePageIndex + 1} ডাউনলোড (PNG)` : 'ইমেজ ডাউনলোড (PNG)'}
            </span>
          </button>

          {/* Download All Pages (If Multi-page) */}
          {totalPages > 1 && (
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownloadAllPages}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
            >
              <Layers className="w-4 h-4 text-amber-600" />
              <span>সব পৃষ্ঠা ডাউনলোড ({totalPages}টি)</span>
            </button>
          )}

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
