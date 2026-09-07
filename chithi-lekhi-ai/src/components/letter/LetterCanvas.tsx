'use client'

/**
 * 💌 LetterCanvas — Chithi Lekhi AI
 *
 * Single source-of-truth vintage letter card renderer.
 * Both VintageLetterVisualStudio (image export) and VintagePdfModal (PDF export)
 * use this component so the rendered output is ALWAYS pixel-identical.
 *
 * Modes:
 *  - Standard: one page chunk displayed in a fixed-dimension card
 *  - Merged: entire letter body in one auto-height continuous canvas
 */

import React, { forwardRef } from 'react'
import { Feather } from 'lucide-react'
import { formatDate } from '@/utils/helpers'

// ─── Theme Definitions ─────────────────────────────────────────────────────

export type CanvasThemeId =
  | '90s-paper'
  | 'romantic-vintage'
  | 'minimal-premium'
  | 'modern-card'
  | 'old-love'
  | 'mother-letter'
  | '90s-post'
  | 'royal-vintage'

export interface CanvasThemeConfig {
  bgClass: string
  textClass: string
  borderClass: string
  postmarkColorClass: string
  stampBgClass: string
  ornament?: string
}

export const CANVAS_THEMES: Record<CanvasThemeId, CanvasThemeConfig> = {
  '90s-paper': {
    bgClass: 'bg-[#F7F2E7]',
    textClass: 'text-[#1E293B]',
    borderClass: 'border-[#D9CFBE]',
    postmarkColorClass: 'text-[#8C4A32] border-[#8C4A32]',
    stampBgClass: 'bg-[#F2E8D5] border-[#B89F7D]',
    ornament: '══ ✉ ══',
  },
  'romantic-vintage': {
    bgClass: 'bg-gradient-to-br from-[#FFF0F3] via-[#FFE4E8] to-[#FFF5F7]',
    textClass: 'text-[#500724]',
    borderClass: 'border-[#FDA4AF]',
    postmarkColorClass: 'text-[#BE123C] border-[#BE123C]',
    stampBgClass: 'bg-[#FFE4E6] border-[#FB7185]',
    ornament: '❦ ❧',
  },
  'minimal-premium': {
    bgClass: 'bg-[#FAF9F6]',
    textClass: 'text-[#27272A]',
    borderClass: 'border-[#E4E4E7]',
    postmarkColorClass: 'text-[#52525B] border-[#71717A]',
    stampBgClass: 'bg-white border-[#D4D4D8]',
    ornament: '◈ ◇ ◈',
  },
  'modern-card': {
    bgClass: 'bg-gradient-to-br from-[#FDF2F8] via-[#FFFFFF] to-[#EFF6FF]',
    textClass: 'text-[#1E293B]',
    borderClass: 'border-[#E2E8F0]',
    postmarkColorClass: 'text-[#E11D48] border-[#E11D48]',
    stampBgClass: 'bg-white border-[#CBD5E1]',
    ornament: '❖ ◈ ❖',
  },
  'old-love': {
    bgClass: 'bg-[#FFF8F8]',
    textClass: 'text-[#4C0519]',
    borderClass: 'border-[#F4B4C0]',
    postmarkColorClass: 'text-[#BE123C] border-[#BE123C]',
    stampBgClass: 'bg-[#FFE4E6] border-[#FB7185]',
    ornament: '❦ ❧',
  },
  'mother-letter': {
    bgClass: 'bg-[#FAF7F0]',
    textClass: 'text-[#292524]',
    borderClass: 'border-[#D5C7A3]',
    postmarkColorClass: 'text-[#57534E] border-[#78716C]',
    stampBgClass: 'bg-[#F5EFE6] border-[#C8B698]',
    ornament: '✦ ✧ ✦',
  },
  '90s-post': {
    bgClass: 'bg-[#F9F6EE]',
    textClass: 'text-[#1E293B]',
    borderClass: 'border-[#C2A677]',
    postmarkColorClass: 'text-[#1E3A8A] border-[#93C5FD]',
    stampBgClass: 'bg-[#EBF3FB] border-[#93C5FD]',
    ornament: '══ ✉ ══',
  },
  'royal-vintage': {
    bgClass: 'bg-[#F7F3EB]',
    textClass: 'text-[#272018]',
    borderClass: 'border-[#B49A67]',
    postmarkColorClass: 'text-[#78350F] border-[#D97706]',
    stampBgClass: 'bg-[#F4E8D1] border-[#D97706]',
    ornament: '❖ ◈ ❖',
  },
}

// ─── Component Props ────────────────────────────────────────────────────────

export interface LetterCanvasProps {
  /** The text content to render (one page chunk, or entire letter in merged mode) */
  pageContent: string
  /** Current page number (1-indexed) — used for running header */
  pageNum?: number
  /** Total pages in the letter — used for running header/footer */
  totalPages?: number
  /** Whether this is the first page (shows full header + stamp badge) */
  isFirstPage?: boolean
  /** Whether this is the last page (shows ornament footer) */
  isLastPage?: boolean
  /** Receiver's name */
  receiverName: string
  /** Optional relationship label */
  relationship?: string
  /** Optional date string (ISO or formatted) */
  date?: string
  /** Letter language or user locale for authentic salutations & dates */
  language?: string
  /** Theme to apply */
  themeId?: CanvasThemeId
  /** Font size CSS class */
  fontSizeClass?: string
  /**
   * Merged mode: renders the entire letter in one auto-height continuous canvas.
   * No page splitting — no fixed min-height constraint.
   */
  merged?: boolean
  /** Additional CSS class for the outer wrapper */
  className?: string
  /** Inline style overrides for the outer wrapper */
  style?: React.CSSProperties
  /** Whether to add a dot-paper texture background (90s aesthetic) */
  dotTexture?: boolean
}

// ─── LetterCanvas Component ─────────────────────────────────────────────────

/**
 * The single vintage letter card renderer.
 *
 * Accepts a `ref` so callers can pass it to html-to-image for PNG/PDF capture.
 *
 * Usage:
 * ```tsx
 * const canvasRef = useRef<HTMLDivElement>(null)
 * <LetterCanvas ref={canvasRef} pageContent={text} receiverName="Jannat" themeId="90s-paper" />
 * // then: captureElementAsPng(canvasRef.current!, 2.5)
 * ```
 */
export const LetterCanvas = forwardRef<HTMLDivElement, LetterCanvasProps>(function LetterCanvas(
  {
    pageContent,
    pageNum = 1,
    totalPages = 1,
    isFirstPage = true,
    isLastPage = true,
    receiverName,
    relationship,
    date,
    language,
    themeId = '90s-paper',
    fontSizeClass = 'text-base',
    merged = false,
    className = '',
    style,
    dotTexture,
  },
  ref
) {
  const theme = CANVAS_THEMES[themeId] || CANVAS_THEMES['90s-paper']
  const isEnglish = language === 'english' || language === 'en'

  const salutation = (() => {
    const relLower = relationship?.toLowerCase() || ''
    if (isEnglish) {
      if (relLower.includes('father') || relLower.includes('বাবা')) {
        return `Dearest Father${receiverName ? ` (${receiverName})` : ''}`
      }
      if (relLower.includes('mother') || relLower.includes('মা')) {
        return `Dearest Mother${receiverName ? ` (${receiverName})` : ''}`
      }
      return `Dear ${receiverName || 'Special Someone'}`
    }
    // Bengali default
    if (relLower.includes('father') || relLower.includes('বাবা')) {
      return `শ্রদ্ধেয় বাবা${receiverName ? ` (${receiverName})` : ''}`
    }
    if (relLower.includes('mother') || relLower.includes('মা')) {
      return `শ্রদ্ধেয়া মা${receiverName ? ` (${receiverName})` : ''}`
    }
    return `প্রিয় ${receiverName || 'কাছের মানুষ'}`
  })()

  const formattedDate = date
    ? /^\d{4}-\d{2}-\d{2}/.test(date)
      ? formatDate(date, isEnglish ? 'en' : 'bn')
      : date
    : formatDate(new Date().toISOString(), isEnglish ? 'en' : 'bn')

  // Use dot texture for 90s themes by default
  const showDotTexture =
    dotTexture !== undefined ? dotTexture : themeId === '90s-paper' || themeId === '90s-post'

  // Merged mode: no fixed height, width fixed for proper text reflow
  const mergedStyles: React.CSSProperties = merged
    ? { width: '100%' }
    : {}

  return (
    <div
      ref={ref}
      className={`
        ${theme.bgClass}
        ${theme.borderClass}
        border-4
        rounded-2xl
        shadow-xl
        p-4 xs:p-6 sm:p-11
        flex flex-col
        relative
        transition-colors duration-300
        select-text
        ${merged ? 'min-h-0' : 'min-h-[420px] sm:min-h-[550px]'}
        ${className}
      `}
      style={{
        backgroundImage: showDotTexture
          ? 'radial-gradient(#d3c5ad 0.65px, transparent 0.65px)'
          : undefined,
        backgroundSize: showDotTexture ? '18px 18px' : undefined,
        ...mergedStyles,
        ...style,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      {isFirstPage ? (
        /* First page: full header with stamp badge */
        <div className="flex items-start justify-between mb-5 select-none">
          <div>
            <span className="text-[10px] font-sans font-semibold tracking-widest uppercase opacity-50 block">
              {totalPages > 1
                ? `AIRMAIL LETTER • PAGE 1/${totalPages}`
                : 'PERSONAL AIRMAIL LETTER'}
            </span>
            <h2 className={`font-bengali font-bold text-xl leading-tight ${theme.textClass}`}>
              {salutation}
            </h2>
            {relationship && (
              <span className={`text-[10px] font-bengali opacity-60 block mt-0.5 ${theme.textClass}`}>
                {relationship}
              </span>
            )}
            <span className={`text-[10px] font-bengali opacity-50 block mt-0.5 ${theme.textClass}`}>
              {formattedDate}
            </span>
          </div>

          {/* Vintage Postmark Stamp */}
          <div className="flex items-center gap-1.5 opacity-90 pointer-events-none shrink-0">
            <div
              className={`w-12 h-14 sm:w-14 sm:h-16 border-2 border-dashed ${theme.stampBgClass} rounded flex flex-col items-center justify-center p-1 shadow-xs rotate-3`}
            >
              <Feather className={`w-4 h-4 sm:w-5 sm:h-5 opacity-70 mb-0.5 ${theme.textClass}`} />
              <span
                className={`text-[7px] sm:text-[8px] font-sans font-bold uppercase tracking-wider opacity-80 ${theme.textClass}`}
              >
                CHITHI
              </span>
              <span className={`text-[6px] sm:text-[7px] font-bengali opacity-70 ${theme.textClass}`}>
                {isEnglish ? 'POSTAGE' : 'ডাকটিকিট'}
              </span>
            </div>
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border ${theme.postmarkColorClass} flex items-center justify-center -rotate-12 opacity-60`}
            >
              <span className="text-[5px] sm:text-[6px] font-mono font-bold tracking-tighter">
                DHAKA
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Subsequent pages: compact running header */
        <div
          className={`flex items-center justify-between border-b border-black/10 pb-3 mb-5 select-none text-xs font-bengali opacity-60 ${theme.textClass}`}
        >
          <span>
            {isEnglish ? `Chithi Lekhi AI • ${salutation}` : `চিঠি লেখাই এআই • ${salutation}`}
          </span>
          <span>
            {isEnglish ? `Page ${pageNum} / ${totalPages}` : `পৃষ্ঠা ${pageNum} / ${totalPages}`}
          </span>
        </div>
      )}

      {/* ── Letter Body ─────────────────────────────────────────────── */}
      <div
        className={`font-bengali ${fontSizeClass} whitespace-pre-wrap leading-relaxed ${theme.textClass} ${merged ? '' : 'flex-1'} py-2`}
      >
        {pageContent}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div
        className={`pt-4 mt-4 border-t border-black/5 flex items-center justify-between text-[10px] sm:text-[11px] font-bengali opacity-50 select-none ${theme.textClass}`}
      >
        {isLastPage ? (
          <>
            <span className="tracking-widest font-serif">{theme.ornament || '❦ ❧'}</span>
            <span className="font-sans font-medium tracking-tight">
              {isEnglish ? 'chithi.ai • words the heart longs to say 💌' : 'chithi.ai • যে কথা মুখে বলা যায় না 💌'}
            </span>
          </>
        ) : (
          <>
            <span>
              {isEnglish ? `Page ${pageNum} / ${totalPages}` : `পৃষ্ঠা ${pageNum} / ${totalPages}`}
            </span>
            <span>{isEnglish ? 'Continues on next page... ➔' : 'পরবর্তী পৃষ্ঠায় সমাপ্য... ➔'}</span>
          </>
        )}
      </div>
    </div>
  )
})
