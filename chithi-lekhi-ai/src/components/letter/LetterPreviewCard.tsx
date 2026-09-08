'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Copy,
  Check,
  Share2,
  Download,
  RefreshCw,
  Feather,
  Sparkles,
  Link as LinkIcon,
  Image as ImageIcon,
  Printer,
  Wand2,
  RotateCcw,
  Send,
  Heart,
  Scroll,
  PenTool,
  Scissors,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react'
import { downloadFormattedTxt } from '@/lib/export-utils'
import { WRITING_PERSONALITIES } from '@/constants'
import type { EraStyle, Language, LetterLength } from '@/types'
import type { RefineAction } from '@/lib/validations'
import { useLanguage } from '@/components/providers/LanguageProvider'

// Heavy visual and export modals are code-split and loaded asynchronously on demand
const VintageLetterVisualStudio = dynamic(
  () => import('./VintageLetterVisualStudio').then((mod) => mod.VintageLetterVisualStudio),
  { ssr: false }
)
const VintagePdfModal = dynamic(
  () => import('./VintagePdfModal').then((mod) => mod.VintagePdfModal),
  { ssr: false }
)
const ShareLetterModal = dynamic(
  () => import('./ShareLetterModal').then((mod) => mod.ShareLetterModal),
  { ssr: false }
)
const SaveLetterModal = dynamic(
  () => import('./SaveLetterModal').then((mod) => mod.SaveLetterModal),
  { ssr: false }
)
const VoiceLetterPlayer = dynamic(
  () => import('./VoiceLetterPlayer').then((mod) => mod.VoiceLetterPlayer),
  { ssr: false }
)

interface LetterPreviewCardProps {
  letter: string
  letterId?: string
  receiverName: string
  relationship: string
  eraStyle: EraStyle
  language: Language
  letterLength: LetterLength
  personality?: string
  onReset: () => void
  onEdit: () => void
}

interface CanonicalStyleItem {
  id: RefineAction
  labelKey: string
  descKey: string
  icon: React.ReactNode
  colorClass: string
  isDefault?: boolean
}

const CANONICAL_STYLES: CanonicalStyleItem[] = [
  {
    id: 'natural',
    labelKey: 'preview.styleNatural',
    descKey: 'preview.styleNaturalDesc',
    icon: <Feather className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    colorClass:
      'border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 text-emerald-950 dark:text-emerald-100',
    isDefault: true,
  },
  {
    id: 'emotional',
    labelKey: 'preview.styleEmotional',
    descKey: 'preview.styleEmotionalDesc',
    icon: <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400 fill-rose-500/20" />,
    colorClass:
      'border-rose-200/80 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 text-rose-950 dark:text-rose-100',
  },
  {
    id: 'elegant',
    labelKey: 'preview.styleElegant',
    descKey: 'preview.styleElegantDesc',
    icon: <PenTool className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    colorClass:
      'border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 text-indigo-950 dark:text-indigo-100',
  },
  {
    id: 'poetic',
    labelKey: 'preview.stylePoetic',
    descKey: 'preview.stylePoeticDesc',
    icon: <Scroll className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    colorClass:
      'border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 text-amber-950 dark:text-amber-100',
  },
]

function LetterPreviewCardInner({
  letter,
  letterId,
  receiverName,
  relationship,
  eraStyle,
  language,
  letterLength,
  personality,
  onReset,
  onEdit,
}: LetterPreviewCardProps) {
  const { t, locale } = useLanguage()

  // Dual Version Architecture
  const [originalLetter] = useState(letter)
  const [enhancedLetter, setEnhancedLetter] = useState<string | null>(null)
  const [enhancementStyle, setEnhancementStyle] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'original' | 'enhanced'>('original')

  // AI Editor Panel State (Defaults to OFF / closed as required)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<RefineAction>('natural')
  const [isRefining, setIsRefining] = useState(false)
  const [refiningStatus, setRefiningStatus] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [refineError, setRefineError] = useState<string | null>(null)
  const [qualityScore, setQualityScore] = useState<number | null>(null)

  // Modals & Action Feedback States
  const [copied, setCopied] = useState(false)
  const [txtDownloaded, setTxtDownloaded] = useState(false)
  const [showVisualStudio, setShowVisualStudio] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [activeLetterId, setActiveLetterId] = useState<string | undefined>(letterId)

  // Active letter content based on the selected tab
  const displayLetter = activeTab === 'enhanced' && enhancedLetter ? enhancedLetter : originalLetter

  // Timeout refs for feedback cleanup
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const txtTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      if (txtTimeoutRef.current) clearTimeout(txtTimeoutRef.current)
    }
  }, [])

  // Clipboard copy
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayLetter)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = displayLetter
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500)
    }
  }, [displayLetter])

  // TXT Download
  const handleDownloadTxt = useCallback(() => {
    downloadFormattedTxt({
      letter: displayLetter,
      receiverName,
      relationship,
    })
    setTxtDownloaded(true)
    if (txtTimeoutRef.current) clearTimeout(txtTimeoutRef.current)
    txtTimeoutRef.current = setTimeout(() => setTxtDownloaded(false), 2500)
  }, [displayLetter, receiverName, relationship])

  // AI Refine Action
  const handleRefine = useCallback(
    async (actionToApply: RefineAction, customInstruction?: string) => {
      if (isRefining) return
      setIsRefining(true)
      setRefineError(null)
      setSelectedStyle(actionToApply)

      const statusMapEn: Record<string, string> = {
        natural: 'Polishing grammar and natural flow...',
        emotional: 'Deepening heartfelt emotional warmth...',
        elegant: 'Polishing with dignified and courteous diction...',
        poetic: 'Weaving lyrical rhythm and cadence...',
        'short-version': 'Condensing to concise essence...',
        regenerate: 'Repolishing letter with fresh perspective...',
      }
      const statusMapBn: Record<string, string> = {
        natural: 'ব্যাকরণ ও স্বাভাবিক কথার সুর নিখুঁত করা হচ্ছে...',
        emotional: 'অকৃত্রিম আবেগ ও আন্তরিক উষ্ণতা বাড়ানো হচ্ছে...',
        elegant: 'মার্জিত ও শ্রদ্ধাপূর্ণ শিষ্টাচারে রূপ দেওয়া হচ্ছে...',
        poetic: 'ভাষায় কাব্যিক ছন্দ ও মাধুর্য সাজানো হচ্ছে...',
        'short-version': 'চিঠির সারমর্ম সংক্ষেপ ও নিবিড় করা হচ্ছে...',
        regenerate: 'চিঠির ভাষা নতুন আঙ্গিকে পরিমার্জন করা হচ্ছে...',
      }

      setRefiningStatus(
        locale === 'en'
          ? statusMapEn[actionToApply] || 'Polishing letter with AI editor...'
          : statusMapBn[actionToApply] || 'এআই এডিটর দিয়ে চিঠি পরিমার্জন চলছে...'
      )

      try {
        const res = await fetch('/api/refine-letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            letterId: activeLetterId,
            originalLetter,
            letter: originalLetter,
            action: actionToApply,
            customInstruction: customInstruction || undefined,
            personality,
            relationship,
            receiverName,
            language,
          }),
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(
            data.error?.message ||
              (locale === 'en' ? 'Failed to refine letter' : 'চিঠি পরিমার্জন সম্পন্ন করা যায়নি')
          )
        }

        if (data.letter) {
          setEnhancedLetter(data.letter)
          setEnhancementStyle(actionToApply)
          setActiveTab('enhanced')
          if (data.audit?.score) {
            setQualityScore(data.audit.score)
          }
          setRefiningStatus(null)
        }
      } catch (err: unknown) {
        console.error('Refine failed:', err)
        setRefineError(
          err instanceof Error
            ? err.message
            : locale === 'en'
            ? 'Failed to refine letter'
            : 'চিঠি পরিমার্জনে সাময়িক সমস্যা হয়েছে'
        )
      } finally {
        setIsRefining(false)
        setRefiningStatus(null)
      }
    },
    [isRefining, originalLetter, activeLetterId, personality, relationship, receiverName, language, locale]
  )

  // Revert back to original letter
  const handleUndo = useCallback(() => {
    setActiveTab('original')
    setEnhancedLetter(null)
    setEnhancementStyle(null)
    setQualityScore(null)
    setRefineError(null)
  }, [])

  const eraLabels: Record<EraStyle, string> = {
    '90s-handwritten': locale === 'en' ? '✉️ 90s Handwritten' : '✉️ ৯০-এর হাতে লেখা',
    vintage: locale === 'en' ? '📜 Vintage Classical' : '📜 ভিন্টেজ ক্লাসিক্যাল',
    modern: locale === 'en' ? '✨ Modern Style' : '✨ আধুনিক প্রকাশ',
  }

  const languageLabels: Record<Language, string> = {
    bengali: 'বাংলা',
    english: 'English',
    banglish: 'বাংলিশ',
  }

  const lengthLabels: Record<LetterLength, string> = {
    short: locale === 'en' ? 'Short' : 'সংক্ষিপ্ত',
    medium: locale === 'en' ? 'Medium' : 'আদর্শ',
    long: locale === 'en' ? 'Long' : 'দীর্ঘ',
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-in fade-in-50 duration-500">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-rose-100/80 dark:border-neutral-800 px-3.5 py-2.5 rounded-2xl shadow-xs transition-colors">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-bengali font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200/60 dark:border-rose-900/40">
            <Sparkles className="w-3 h-3 text-rose-500" />
            {t('preview.ready')}
          </span>
          <span className="text-[11px] text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg font-bengali">
            {eraLabels[eraStyle]}
          </span>
          <span className="text-[11px] text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg font-bengali">
            {languageLabels[language]} • {lengthLabels[letterLength]}
          </span>
          {personality && (
            <span className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 px-2 py-1 rounded-lg font-bengali font-medium">
              {WRITING_PERSONALITIES.find((p) => p.value === personality)?.emoji}{' '}
              {WRITING_PERSONALITIES.find((p) => p.value === personality)?.label || personality}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bengali font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 px-3 py-2 rounded-xl transition-all shadow-xs glow-pink active:scale-95 min-h-[40px] cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 fill-white" />
            <span>{t('preview.saveLetter')}</span>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-bengali text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 px-2.5 py-2 rounded-xl transition-colors min-h-[40px] cursor-pointer"
          >
            {t('preview.editInfo')}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-bengali text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-900/50 px-2.5 py-2 rounded-xl transition-colors border border-rose-200/50 dark:border-rose-900/40 min-h-[40px] cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            {t('preview.newLetter')}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          DUAL-VERSION SWITCHER TABS (Original vs Enhanced)
         ───────────────────────────────────────────────────────────── */}
      {enhancedLetter && (
        <div className="flex items-center justify-between gap-2 p-1.5 bg-white/90 dark:bg-neutral-900/90 border border-rose-200/80 dark:border-neutral-800 rounded-2xl shadow-xs transition-all animate-in fade-in-50 duration-300">
          <div className="flex items-center gap-1 flex-1">
            <button
              type="button"
              onClick={() => setActiveTab('original')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bengali font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] ${
                activeTab === 'original'
                  ? 'bg-rose-500 text-white shadow-xs glow-pink'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t('preview.tabOriginal')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('enhanced')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bengali font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] ${
                activeTab === 'enhanced'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('preview.tabEnhanced')}</span>
              {enhancementStyle && (
                <span className="hidden xs:inline-block text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full capitalize">
                  {enhancementStyle}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleUndo}
            title={t('preview.revertOriginal')}
            className="text-xs font-bengali text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 px-2.5 py-2 rounded-xl transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 cursor-pointer shrink-0 min-h-[40px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('preview.revertOriginal')}</span>
          </button>
        </div>
      )}

      {/* Realistic Paper Letter Card */}
      <div className="relative paper-card rounded-2xl sm:rounded-3xl p-4 xs:p-6 sm:p-10 transition-all duration-300 overflow-hidden shadow-md">
        {/* Vintage Postmark / Stamp Decorator */}
        <div className="absolute top-4 right-4 sm:top-7 sm:right-7 flex flex-col items-center pointer-events-none select-none opacity-85">
          <div className="w-12 h-14 sm:w-16 sm:h-20 border-2 border-dashed border-rose-400/70 bg-rose-50/60 dark:bg-rose-950/40 rounded-md flex flex-col items-center justify-center p-1 shadow-xs transform rotate-3">
            <Feather className="w-4 h-4 sm:w-6 sm:h-6 text-rose-600 dark:text-rose-400 mb-0.5" />
            <span className="text-[7px] sm:text-[9px] font-sans font-bold text-rose-700 dark:text-rose-300 uppercase tracking-widest">
              CHITHI
            </span>
            <span className="text-[6px] sm:text-[8px] font-bengali text-rose-600/80 dark:text-rose-400/80">
              {t('preview.stampTitle')}
            </span>
          </div>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 sm:w-11 sm:h-11 rounded-full border border-rose-800/40 dark:border-rose-400/40 flex items-center justify-center -rotate-12 bg-white/30 dark:bg-neutral-900/50 backdrop-blur-xs">
            <span className="text-[5px] sm:text-[7px] font-mono text-rose-900/60 dark:text-rose-300/80 font-semibold tracking-tighter">
              DHAKA 90s
            </span>
          </div>
        </div>

        {/* Letter Header */}
        <div className="mb-6 sm:mb-8 pr-14 sm:pr-20">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-sans font-medium mb-1">
              PERSONAL LETTER
            </p>
            {activeTab === 'enhanced' && (
              <span className="text-[10px] font-bengali font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                {t('preview.refinedBadge')} {qualityScore ? `• ${qualityScore}/১০০` : ''}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="font-bengali text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {receiverName ? `${t('preview.dear')} ${receiverName}` : t('preview.anonymousDear')}
            </h2>
            {relationship && (
              <span className="text-xs font-bengali text-rose-600/80 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/50">
                {relationship}
              </span>
            )}
          </div>
          <div className="h-0.5 w-16 bg-gradient-to-r from-rose-400 to-amber-300 mt-2 rounded-full" />
        </div>

        {/* Letter Body */}
        <div className="letter-body font-bengali text-neutral-800 dark:text-neutral-100 text-base sm:text-lg leading-relaxed sm:leading-loose whitespace-pre-wrap select-text">
          {displayLetter}
        </div>

        {/* Bottom Vintage Footer Line */}
        <div className="mt-8 sm:mt-10 pt-4 border-t border-rose-200/50 dark:border-neutral-700/50 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 font-bengali">
          <span>{t('preview.footerBrand')}</span>
          <span>{t('preview.footerQuote')}</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          AI VOICE LETTER MEMORIES (TTS with 4 Styles)
         ───────────────────────────────────────────────────────────── */}
      <VoiceLetterPlayer
        letterText={displayLetter}
        receiverName={receiverName}
        initialVoiceStyle="warm"
      />

      {/* ─────────────────────────────────────────────────────────────
          AI ENHANCEMENT EDITOR UI: "✨ সুন্দরভাবে সাজান" (Default OFF)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/95 dark:bg-neutral-900/90 border border-rose-200/80 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Header with primary toggle button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-xs shrink-0">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bengali font-bold text-sm text-neutral-900 dark:text-neutral-100 leading-tight flex items-center gap-1.5">
                <span>{t('preview.polishBtn')}</span>
              </h4>
              <p className="text-[11px] font-bengali text-neutral-500 dark:text-neutral-400">
                {t('preview.polishSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bengali font-bold transition-all min-h-[40px] cursor-pointer ${
              isPanelOpen
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-100/70'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>{isPanelOpen ? (locale === 'en' ? 'Hide Options' : 'অপশন লুকান') : (locale === 'en' ? 'Select Style' : 'শৈলী নির্বাচন করুন')}</span>
            {isPanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Panel with 4 Canonical Modes */}
        {isPanelOpen && (
          <div className="space-y-4 pt-2 border-t border-rose-100/70 dark:border-neutral-800/80 animate-in fade-in-50 duration-300">
            {/* 4 Canonical Modes */}
            <div className="space-y-2">
              <span className="text-xs font-bengali font-bold text-neutral-700 dark:text-neutral-300">
                {locale === 'en' ? 'Choose Polish Style:' : 'চিঠির পরিমার্জন শৈলী বেছে নিন:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CANONICAL_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    disabled={isRefining}
                    onClick={() => handleRefine(style.id)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all shadow-2xs active:scale-[0.99] disabled:opacity-50 min-h-[56px] cursor-pointer ${
                      style.colorClass
                    } ${selectedStyle === style.id ? 'ring-2 ring-rose-400 ring-offset-1' : ''}`}
                  >
                    <div className="p-1.5 rounded-lg bg-white/80 dark:bg-neutral-800/90 shadow-2xs shrink-0 mt-0.5">
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bengali font-bold text-xs text-neutral-900 dark:text-neutral-100">
                          {t(style.labelKey)}
                        </span>
                        {style.isDefault && (
                          <span className="text-[9px] font-bengali font-semibold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {t('preview.defaultTag')}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bengali text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                        {t(style.descKey)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick utility refinements: Shorten or Regenerate */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bengali text-neutral-500 dark:text-neutral-400">
                {locale === 'en' ? 'More tools:' : 'অন্যান্য:'}
              </span>
              <button
                type="button"
                disabled={isRefining}
                onClick={() => handleRefine('short-version')}
                className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bengali font-medium hover:bg-neutral-100 dark:hover:bg-neutral-750 transition-colors disabled:opacity-50 cursor-pointer min-h-[36px]"
              >
                <Scissors className="w-3 h-3 text-neutral-500" />
                <span>{locale === 'en' ? 'Make shorter' : 'সংক্ষিপ্ত করুন'}</span>
              </button>
              <button
                type="button"
                disabled={isRefining}
                onClick={() => handleRefine('regenerate')}
                className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bengali font-medium hover:bg-neutral-100 dark:hover:bg-neutral-750 transition-colors disabled:opacity-50 cursor-pointer min-h-[36px]"
              >
                <RefreshCw className={`w-3 h-3 text-neutral-500 ${isRefining ? 'animate-spin' : ''}`} />
                <span>{locale === 'en' ? 'Regenerate' : 'পুনরায় সাজান'}</span>
              </button>
            </div>

            {/* Custom instruction prompt */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
              <label className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300">
                {t('preview.customPromptLabel')}
              </label>
              <div className="flex flex-col xs:flex-row gap-2">
                <input
                  type="text"
                  maxLength={500}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={t('preview.customPromptPlaceholder')}
                  disabled={isRefining}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-800/80 text-xs sm:text-sm font-bengali text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 transition-all min-h-[44px]"
                />
                <button
                  type="button"
                  disabled={isRefining || !customPrompt.trim()}
                  onClick={() => {
                    const trimmed = customPrompt.trim().slice(0, 500)
                    if (trimmed) {
                      handleRefine('custom', trimmed)
                      setCustomPrompt('')
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bengali text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all disabled:opacity-40 min-h-[44px] cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('preview.customPromptSubmit')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading / Processing Indicator */}
        {isRefining && (
          <div className="p-3 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2.5 text-xs font-bengali text-rose-800 dark:text-rose-300 animate-pulse">
            <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span>{refiningStatus || t('preview.refiningProgress')}</span>
          </div>
        )}

        {/* Error Indicator */}
        {refineError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-bengali text-red-700 dark:text-red-300">
            {refineError}
          </div>
        )}
      </div>

      {/* Featured Banners: Anonymous Share & Visual Image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Anonymous Web Link Banner */}
        <div className="bg-white/90 dark:bg-neutral-900/90 border border-rose-100 dark:border-neutral-800 rounded-2xl p-3.5 flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 shadow-2xs transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bengali font-bold text-xs text-neutral-900 dark:text-neutral-100 leading-tight">
                {t('preview.anonymousLinkTitle')}
              </h5>
              <p className="text-[10px] font-bengali text-neutral-500 dark:text-neutral-400">
                {t('preview.anonymousLinkDesc')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="py-2 px-3 rounded-xl font-bengali text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50 transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer shrink-0"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{t('preview.anonymousLinkBtn')}</span>
          </button>
        </div>

        {/* Visual Card Studio Banner */}
        <div className="bg-white/90 dark:bg-neutral-900/90 border border-rose-100 dark:border-neutral-800 rounded-2xl p-3.5 flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 shadow-2xs transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bengali font-bold text-xs text-neutral-900 dark:text-neutral-100 leading-tight">
                {t('preview.visualStudioTitle')}
              </h5>
              <p className="text-[10px] font-bengali text-neutral-500 dark:text-neutral-400">
                {t('preview.visualStudioDesc')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowVisualStudio(true)}
            className="py-2 px-3 rounded-xl font-bengali text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50 transition-colors flex items-center justify-center min-h-[44px] cursor-pointer shrink-0"
          >
            <span>{t('preview.visualStudioBtn')}</span>
          </button>
        </div>
      </div>

      {/* Standard Action Buttons (Copy, Share, Formatted TXT, Vintage A4 PDF) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-medium transition-all shadow-xs min-h-[44px] cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white shadow-emerald-200'
              : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>{t('preview.copied')}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span>{t('preview.copyBtn')}</span>
            </>
          )}
        </button>

        {/* Universal Share Letter Button */}
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-bold shadow-xs transition-all min-h-[44px] cursor-pointer bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white active:scale-95 glow-pink"
        >
          <Share2 className="w-4 h-4" />
          <span>{locale === 'en' ? 'Share Letter 💌' : 'চিঠি শেয়ার করুন 💌'}</span>
        </button>

        {/* Formatted TXT Export Button */}
        <button
          type="button"
          onClick={handleDownloadTxt}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-medium transition-all min-h-[44px] cursor-pointer ${
            txtDownloaded
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800'
          }`}
        >
          {txtDownloaded ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>{locale === 'en' ? 'TXT Saved!' : 'TXT হয়েছে!'}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <span>{t('preview.txtBtn')}</span>
            </>
          )}
        </button>

        {/* Print-Ready A4 Vintage PDF Button */}
        <button
          type="button"
          onClick={() => setShowPdfModal(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 transition-colors shadow-xs min-h-[44px] cursor-pointer"
        >
          <Printer className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>{t('preview.pdfBtn')}</span>
        </button>
      </div>

      {/* Visual Studio Modal */}
      {showVisualStudio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="my-auto w-full">
            <VintageLetterVisualStudio
              letter={displayLetter}
              receiverName={receiverName}
              relationship={relationship}
              language={language}
              onClose={() => setShowVisualStudio(false)}
            />
          </div>
        </div>
      )}

      {/* Vintage A4 PDF Modal */}
      {showPdfModal && (
        <VintagePdfModal
          letter={displayLetter}
          receiverName={receiverName}
          relationship={relationship}
          language={language}
          onClose={() => setShowPdfModal(false)}
        />
      )}

      {/* Share Letter Modal */}
      {showShareModal && (
        <ShareLetterModal
          letter={displayLetter}
          receiverName={receiverName}
          relationship={relationship}
          eraStyle={eraStyle}
          letterId={activeLetterId}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Save Letter Modal */}
      {showSaveModal && (
        <SaveLetterModal
          letter={displayLetter}
          receiverName={receiverName}
          relationship={relationship}
          personality={personality}
          eraStyle={eraStyle}
          language={language}
          letterId={activeLetterId}
          originalLetter={originalLetter}
          enhancedLetter={enhancedLetter}
          enhancementStyle={enhancementStyle}
          onClose={() => setShowSaveModal(false)}
          onSaved={(savedId) => setActiveLetterId(savedId)}
        />
      )}
    </div>
  )
}

export const LetterPreviewCard = React.memo(LetterPreviewCardInner)
