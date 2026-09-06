'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import {
  Download,
  Share2,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sliders,
  CheckCircle2,
  Merge,
} from 'lucide-react'
import {
  partitionLetterIntoPages,
  QUALITY_CONFIG,
  type QualityTier,
  type TargetAspectRatio,
  type FontSizeChoice,
} from '@/lib/letter-layout-engine'
import {
  captureElementAsPng,
  exportMergedLetterPng,
  getSafePixelRatio,
} from '@/lib/export-utils'
import { shareLetter } from '@/lib/share-engine'
import { LetterCanvas, type CanvasThemeId } from './LetterCanvas'

export type VintageCardStyle =
  | '90s-paper'
  | 'romantic-vintage'
  | 'minimal-premium'
  | 'modern-card'

// Map VintageCardStyle → CanvasThemeId (same keys, just typed)
const STYLE_TO_THEME: Record<VintageCardStyle, CanvasThemeId> = {
  '90s-paper': '90s-paper',
  'romantic-vintage': 'romantic-vintage',
  'minimal-premium': 'minimal-premium',
  'modern-card': 'modern-card',
}

const STYLE_META: Record<
  VintageCardStyle,
  { name: string; emoji: string }
> = {
  '90s-paper': { name: '৯০-এর পুরোনো কাগজ', emoji: '✉️' },
  'romantic-vintage': { name: 'রোমান্টিক ভিন্টেজ', emoji: '🌸' },
  'minimal-premium': { name: 'মিনিমাল প্রিমিয়াম', emoji: '✨' },
  'modern-card': { name: 'মডার্ন কার্ড', emoji: '💎' },
}

interface VintageLetterVisualProps {
  letter: string
  receiverName: string
  relationship?: string
  date?: string
  shareUrl?: string
  onClose?: () => void
}

export function VintageLetterVisualStudio({
  letter,
  receiverName,
  relationship,
  date,
  shareUrl,
  onClose,
}: VintageLetterVisualProps) {
  // ── Studio state ────────────────────────────────────────────────────────
  const [cardStyle, setCardStyle] = useState<VintageCardStyle>('90s-paper')
  const [aspectRatio, setAspectRatio] = useState<TargetAspectRatio>('portrait')
  const [fontSizeChoice, setFontSizeChoice] = useState<FontSizeChoice>('auto')
  const [qualityTier, setQualityTier] = useState<QualityTier>('high')
  const [currentPageIndex, setCurrentPageIndex] = useState(0)

  // ── UX state ─────────────────────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // ── Refs ─────────────────────────────────────────────────────────────────
  /** Ref for the currently-visible preview card */
  const cardRef = useRef<HTMLDivElement>(null)
  /** Ref for the hidden batch render container (all pages, captured for PDF/batch download) */
  const batchContainerRef = useRef<HTMLDivElement>(null)
  /** Ref for the hidden merged canvas (auto-height, entire letter) */
  const mergedCanvasRef = useRef<HTMLDivElement>(null)

  // ── Layout engine ────────────────────────────────────────────────────────
  const layout = useMemo(
    () => partitionLetterIntoPages(letter, { ratio: aspectRatio, fontSizeChoice }),
    [letter, aspectRatio, fontSizeChoice]
  )

  const totalPages = layout.totalPages
  const activePageIndex = Math.min(currentPageIndex, totalPages - 1)
  const activePageText = layout.pages[activePageIndex] || letter

  // Merged mode = aspectRatio 'natural'
  const isMergedMode = aspectRatio === 'natural'

  const qualitySetting = QUALITY_CONFIG[qualityTier]
  const themeId = STYLE_TO_THEME[cardStyle]

  // ── Status helpers ───────────────────────────────────────────────────────
  const showStatus = (msg: string, durationMs = 2800) => {
    setStatusMessage(msg)
    setTimeout(() => setStatusMessage(null), durationMs)
  }

  // ── Download: Single page (or merged canvas) ─────────────────────────────
  const handleDownloadCurrentPage = useCallback(async () => {
    setDownloading(true)
    setStatusMessage(`${qualitySetting.labelBn} এ রেন্ডার হচ্ছে...`)
    try {
      const safePR = getSafePixelRatio(qualitySetting.pixelRatio)

      if (isMergedMode && mergedCanvasRef.current) {
        // Export full continuous letter as single PNG
        await exportMergedLetterPng(
          mergedCanvasRef.current,
          `chithi-${(receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}-full`,
          (msg) => setStatusMessage(msg)
        )
      } else if (cardRef.current) {
        const dataUrl = await captureElementAsPng(cardRef.current, safePR, qualitySetting.quality)
        const pageSuffix = totalPages > 1 ? `-page-${activePageIndex + 1}` : ''
        const link = document.createElement('a')
        link.download = `chithi-${(receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}-${cardStyle}${pageSuffix}.png`
        link.href = dataUrl
        link.click()
      }
      showStatus('ইমেজ ডাউনলোড সম্পন্ন! ✓')
    } catch (err) {
      console.error('[VintageLetterVisualStudio] download failed:', err)
      showStatus('ইমেজ রূপান্তরে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 3500)
    } finally {
      setDownloading(false)
    }
  }, [
    isMergedMode,
    qualitySetting,
    receiverName,
    cardStyle,
    totalPages,
    activePageIndex,
  ])

  // ── Download: All pages (batch, no state mutation mid-loop) ─────────────
  const handleDownloadAllPages = useCallback(async () => {
    if (totalPages <= 1) {
      await handleDownloadCurrentPage()
      return
    }

    if (isMergedMode && mergedCanvasRef.current) {
      // In merged mode, all text is already in one element
      await handleDownloadCurrentPage()
      return
    }

    setDownloading(true)
    setStatusMessage(`সবগুলো ${totalPages}টি পৃষ্ঠা রেন্ডার হচ্ছে...`)

    try {
      const safePR = getSafePixelRatio(qualitySetting.pixelRatio)

      // Capture all page elements from the hidden batch container
      // These are rendered simultaneously (no React state mutation per page)
      const batchEls = batchContainerRef.current
        ? Array.from(
            batchContainerRef.current.querySelectorAll<HTMLElement>('[data-batch-page]')
          )
        : []

      if (batchEls.length === 0) {
        // Fallback: sequential current-page switching (slower but safe)
        for (let i = 0; i < totalPages; i++) {
          setCurrentPageIndex(i)
          setStatusMessage(`পৃষ্ঠা ${i + 1}/${totalPages} রেন্ডার হচ্ছে...`)
          await new Promise((r) => setTimeout(r, 350))
          if (cardRef.current) {
            const dataUrl = await captureElementAsPng(cardRef.current, safePR, qualitySetting.quality)
            const link = document.createElement('a')
            link.download = `chithi-${(receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}-page-${i + 1}.png`
            link.href = dataUrl
            link.click()
          }
        }
      } else {
        // Fast path: all pages pre-rendered in batch container, no state mutation
        for (let i = 0; i < batchEls.length; i++) {
          setStatusMessage(`পৃষ্ঠা ${i + 1}/${batchEls.length} ডাউনলোড হচ্ছে...`)
          await new Promise((r) => setTimeout(r, 60))
          const dataUrl = await captureElementAsPng(batchEls[i], safePR, qualitySetting.quality)
          const link = document.createElement('a')
          link.download = `chithi-${(receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}-page-${i + 1}.png`
          link.href = dataUrl
          link.click()
        }
      }

      showStatus(`${totalPages}টি পৃষ্ঠা সফলভাবে ডাউনলোড হয়েছে! ✓`, 3500)
    } catch (err) {
      console.error('[VintageLetterVisualStudio] batch download failed:', err)
      showStatus('ব্যাচ ডাউনলোডে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 3500)
    } finally {
      setDownloading(false)
    }
  }, [
    totalPages,
    isMergedMode,
    qualitySetting,
    receiverName,
    handleDownloadCurrentPage,
  ])

  // ── Social / Native Share ────────────────────────────────────────────────
  const handleShareImage = useCallback(async () => {
    setSharing(true)
    setStatusMessage('শেয়ারের জন্য প্রস্তুত হচ্ছে...')
    try {
      const safePR = getSafePixelRatio(qualitySetting.pixelRatio)
      const sourceEl = isMergedMode ? mergedCanvasRef.current : cardRef.current
      if (!sourceEl) return

      const dataUrl = await captureElementAsPng(sourceEl, safePR, qualitySetting.quality)
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File(
        [blob],
        `chithi-for-${(receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}.png`,
        { type: 'image/png' }
      )

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `চিঠি — ${receiverName}`,
          text: `💌 ${receiverName}-এর জন্য একটি চিঠি\n— চিঠি লেখাই এআই`,
          files: [file],
          ...(shareUrl ? { url: shareUrl } : {}),
        })
        showStatus('শেয়ার সম্পন্ন! ✓')
      } else {
        // Fallback: download the image + copy link
        const link = document.createElement('a')
        link.download = file.name
        link.href = dataUrl
        link.click()
        if (shareUrl) {
          const result = await shareLetter({
            platform: 'copy',
            shareUrl,
            letterText: letter,
            receiverName,
          })
          showStatus(`ইমেজ ডাউনলোড হয়েছে • ${result.message}`)
        } else {
          showStatus('ইমেজ ডাউনলোড হয়েছে!')
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        showStatus('শেয়ার বাতিল করা হয়েছে।')
      } else {
        console.error('[VintageLetterVisualStudio] share failed:', err)
        showStatus('শেয়ার করতে সমস্যা হয়েছে।', 3500)
      }
    } finally {
      setSharing(false)
    }
  }, [isMergedMode, qualitySetting, receiverName, shareUrl, letter])

  // ── Container style per ratio ────────────────────────────────────────────
  const ratioContainerStyles: Record<TargetAspectRatio, string> = {
    portrait: 'max-w-[440px] min-h-[550px]',
    square: 'max-w-[480px] min-h-[480px]',
    a4: 'max-w-[460px] min-h-[650px]',
    natural: 'max-w-[500px]', // auto-height, no min
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">

      {/* ── Studio Controls ──────────────────────────────────────────────── */}
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
                  {isMergedMode
                    ? 'একটানা মার্জড ছবি'
                    : layout.metrics.category === 'short'
                    ? 'সংক্ষিপ্ত চিঠি (১ পৃষ্ঠা)'
                    : layout.metrics.category === 'medium'
                    ? `আদর্শ দৈর্ঘ্য (${totalPages} পৃষ্ঠা)`
                    : `দীর্ঘ চিঠি (${totalPages} পৃষ্ঠা • জিরো ক্রপ)`}
                </span>
              </div>
              <p className="text-[11px] font-bengali text-neutral-500">
                চিঠির কোনো অংশ ক্রপ হবে না — সম্ভাষণ, বডি ও স্বাক্ষর ১০০% অক্ষুণ্ণ
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
            {(Object.keys(STYLE_META) as VintageCardStyle[]).map((stKey) => {
              const cfg = STYLE_META[stKey]
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

        {/* 2. Aspect Ratio / Mode Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bengali">
            <span className="text-neutral-500">মোড / রেশিও:</span>
            {(
              [
                { ratio: 'portrait', label: '📱 ৪:৫', sub: '(১০৮০×১৩৫০)' },
                { ratio: 'square', label: '⬛ ১:১', sub: '(১০৮০×১০৮০)' },
                { ratio: 'a4', label: '📜 এ৪', sub: '(A4)' },
              ] as const
            ).map(({ ratio, label, sub }) => (
              <button
                key={ratio}
                type="button"
                onClick={() => {
                  setAspectRatio(ratio)
                  setCurrentPageIndex(0)
                }}
                className={`px-2.5 py-1 rounded-lg border transition-all ${
                  aspectRatio === ratio
                    ? 'border-rose-400 bg-rose-50 text-rose-800 font-semibold shadow-xs'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {label} <span className="opacity-60 text-[10px]">{sub}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setAspectRatio('natural')
                setCurrentPageIndex(0)
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                aspectRatio === 'natural'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Merge className="w-3 h-3 text-emerald-600" />
              <span>একটানা (সম্পূর্ণ)</span>
            </button>
          </div>

          {/* Typography Scale */}
          <div className="flex items-center gap-1 text-xs font-bengali">
            <span className="text-neutral-500 mr-1">ফন্ট:</span>
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
                {sz === 'auto' ? 'অটো' : sz === 'small' ? 'ছোট' : sz === 'normal' ? 'স্বাভাবিক' : 'বড়'}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Image Quality */}
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
                      ? 'border-rose-400 bg-rose-50 text-rose-800 font-semibold shadow-xs'
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

        {/* 4. Multi-page pagination bar */}
        {!isMergedMode && totalPages > 1 && (
          <div className="flex items-center justify-between p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs font-bengali text-amber-900">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>
                চিঠি দীর্ঘ হওয়ায় <strong>{totalPages}টি পৃষ্ঠায়</strong> বিভক্ত (কোনো বাক্য কাটা পড়বে না)
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

      {/* ── Letter Canvas Preview ─────────────────────────────────────────── */}
      <div className="flex justify-center p-2 overflow-x-auto bg-neutral-100/50 rounded-2xl border border-neutral-200/60">
        {isMergedMode ? (
          /* Merged / Continuous canvas — entire letter in one scrollable card */
          <LetterCanvas
            ref={mergedCanvasRef}
            pageContent={letter}
            pageNum={1}
            totalPages={1}
            isFirstPage
            isLastPage
            receiverName={receiverName}
            relationship={relationship}
            date={date}
            themeId={themeId}
            fontSizeClass={layout.computedFontSize.cssClass}
            merged
            className={ratioContainerStyles.natural}
          />
        ) : (
          /* Paged canvas — shows the current active page */
          <LetterCanvas
            ref={cardRef}
            pageContent={activePageText}
            pageNum={activePageIndex + 1}
            totalPages={totalPages}
            isFirstPage={activePageIndex === 0}
            isLastPage={activePageIndex === totalPages - 1}
            receiverName={receiverName}
            relationship={relationship}
            date={date}
            themeId={themeId}
            fontSizeClass={layout.computedFontSize.cssClass}
            className={`w-full ${ratioContainerStyles[aspectRatio]}`}
          />
        )}
      </div>

      {/* ── Hidden Batch Container (all pages simultaneously for batch download) */}
      {!isMergedMode && totalPages > 1 && (
        <div
          ref={batchContainerRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
            width: '460px',
          }}
        >
          {layout.pages.map((pageText, idx) => (
            <div key={idx} data-batch-page="true" style={{ marginBottom: '32px' }}>
              <LetterCanvas
                pageContent={pageText}
                pageNum={idx + 1}
                totalPages={totalPages}
                isFirstPage={idx === 0}
                isLastPage={idx === totalPages - 1}
                receiverName={receiverName}
                relationship={relationship}
                date={date}
                themeId={themeId}
                fontSizeClass={layout.computedFontSize.cssClass}
                style={{ width: '460px' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Download & Share Actions ──────────────────────────────────────── */}
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
          {/* Download Current Page / Merged */}
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
              {isMergedMode
                ? 'একটানা ছবি ডাউনলোড'
                : totalPages > 1
                ? `পৃষ্ঠা ${activePageIndex + 1} ডাউনলোড (PNG)`
                : 'ইমেজ ডাউনলোড (PNG)'}
            </span>
          </button>

          {/* Download All Pages (multi-page only) */}
          {!isMergedMode && totalPages > 1 && (
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

          {/* Social Share */}
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
            <span>সোশ্যাল শেয়ার</span>
          </button>
        </div>
      </div>
    </div>
  )
}
