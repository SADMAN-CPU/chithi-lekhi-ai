'use client'

import React, { useState, useCallback } from 'react'
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
  Flame,
} from 'lucide-react'
import { buildWhatsAppUrl } from '@/utils/helpers'
import { downloadFormattedTxt } from '@/lib/export-utils'
import { WRITING_PERSONALITIES } from '@/constants'
import type { EraStyle, Language, LetterLength } from '@/types'
import type { RefineAction } from '@/lib/validations'

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

interface RefineQuickChip {
  id: RefineAction
  labelBn: string
  labelEn: string
  icon: React.ReactNode
  colorClass: string
}

const REFINE_QUICK_CHIPS: RefineQuickChip[] = [
  {
    id: 'more-emotional',
    labelBn: '❤️ More Emotional',
    labelEn: 'More Emotional',
    icon: <Heart className="w-3.5 h-3.5 text-rose-600" />,
    colorClass: 'border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-rose-900',
  },
  {
    id: 'more-romantic',
    labelBn: '🌹 Romantic',
    labelEn: 'Romantic',
    icon: <Sparkles className="w-3.5 h-3.5 text-pink-600" />,
    colorClass: 'border-pink-200 bg-pink-50/70 hover:bg-pink-100/80 text-pink-900',
  },
  {
    id: 'vintage-90s',
    labelBn: '📜 90s Style',
    labelEn: '90s Style',
    icon: <Scroll className="w-3.5 h-3.5 text-amber-700" />,
    colorClass: 'border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-900',
  },
  {
    id: 'better-writing',
    labelBn: '✍ Better Writing',
    labelEn: 'Better Writing',
    icon: <PenTool className="w-3.5 h-3.5 text-indigo-600" />,
    colorClass: 'border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-900',
  },
  {
    id: 'deeper-feeling',
    labelBn: '😭 Deeper Feeling',
    labelEn: 'Deeper Feeling',
    icon: <Flame className="w-3.5 h-3.5 text-orange-600" />,
    colorClass: 'border-orange-200 bg-orange-50/70 hover:bg-orange-100/80 text-orange-900',
  },
  {
    id: 'make-shorter',
    labelBn: '✂ Short Version',
    labelEn: 'Short Version',
    icon: <Scissors className="w-3.5 h-3.5 text-teal-600" />,
    colorClass: 'border-teal-200 bg-teal-50/70 hover:bg-teal-100/80 text-teal-900',
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
  // Current active letter (supports live refinement & undo)
  const [currentLetter, setCurrentLetter] = useState(letter)
  const [originalLetter] = useState(letter)
  const [isRefined, setIsRefined] = useState(false)

  // Feedback & Modal States
  const [copied, setCopied] = useState(false)
  const [showVisualStudio, setShowVisualStudio] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [activeLetterId, setActiveLetterId] = useState<string | undefined>(letterId)

  // AI Assistant States
  const [isRefining, setIsRefining] = useState(false)
  const [refiningStatus, setRefiningStatus] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [refineError, setRefineError] = useState<string | null>(null)
  const [qualityScore, setQualityScore] = useState<number | null>(null)

  // Handle Clipboard Copy
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentLetter)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = currentLetter
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [currentLetter])

  // Handle Formatted TXT Download
  const handleDownloadTxt = useCallback(() => {
    downloadFormattedTxt({
      letter: currentLetter,
      receiverName,
      relationship,
    })
  }, [currentLetter, receiverName, relationship])

  // Handle AI Refinement Request
  const handleRefine = useCallback(
    async (action: RefineAction, customInstruction?: string) => {
      setIsRefining(true)
      setRefineError(null)
      setRefiningStatus(
        action === 'more-emotional'
          ? 'শব্দে গভীর আবেগ ছড়ানো হচ্ছে...'
          : action === 'more-romantic'
          ? 'মিষ্টি রোমান্টিক সুবাস যোগ করা হচ্ছে...'
          : action === 'vintage-90s'
          ? 'নব্বই দশকের নীল খামের স্মৃতি সাজানো হচ্ছে...'
          : action === 'make-shorter'
          ? 'চিঠির সারমর্ম নিবিড় করা হচ্ছে...'
          : action === 'better-writing'
          ? 'সাহিত্যিক মান নিখুঁত করা হচ্ছে...'
          : 'চিঠির ভাষা পরিশোধন চলছে...'
      )

      try {
        const res = await fetch('/api/refine-letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalLetter: currentLetter,
            letter: currentLetter,
            action,
            customInstruction: customInstruction || undefined,
            personality,
            relationship,
            receiverName,
            language,
          }),
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || 'চিঠি পরিমার্জন ব্যর্থ হয়েছে')
        }

        if (data.letter) {
          setCurrentLetter(data.letter)
          setIsRefined(true)
          if (data.audit?.score) {
            setQualityScore(data.audit.score)
          }
          setRefiningStatus(null)
        }
      } catch (err: unknown) {
        console.error('Refine failed:', err)
        setRefineError(err instanceof Error ? err.message : 'চিঠি পরিমার্জনে সাময়িক সমস্যা হয়েছে')
      } finally {
        setIsRefining(false)
        setRefiningStatus(null)
      }
    },
    [currentLetter, personality, relationship, receiverName, language]
  )

  // Revert back to original letter
  const handleUndo = useCallback(() => {
    setCurrentLetter(originalLetter)
    setIsRefined(false)
    setQualityScore(null)
    setRefineError(null)
  }, [originalLetter])



  const eraLabels: Record<EraStyle, string> = {
    '90s-handwritten': '✉️ ৯০-এর হাতে লেখা',
    vintage: '📜 ভিন্টেজ ক্লাসিক্যাল',
    modern: '✨ আধুনিক প্রকাশ',
  }

  const languageLabels: Record<Language, string> = {
    bengali: 'বাংলা',
    english: 'English',
    banglish: 'বাংলিশ',
  }

  const lengthLabels: Record<LetterLength, string> = {
    short: 'সংক্ষিপ্ত',
    medium: 'আদর্শ',
    long: 'দীর্ঘ',
  }

  const whatsappUrl = buildWhatsAppUrl(
    `💌 তোমার জন্য একটি চিঠি এসেছে:\n\n${currentLetter}\n\n— চিঠি লেখাই AI (Chithi Lekhi AI)`
  )

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-in fade-in-50 duration-500">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 backdrop-blur-sm border border-rose-100 px-4 py-2.5 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-bengali font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
            <Sparkles className="w-3 h-3 text-rose-500" />
            চিঠি প্রস্তুত
          </span>
          <span className="text-[11px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md font-bengali">
            {eraLabels[eraStyle]}
          </span>
          <span className="text-[11px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md font-bengali">
            {languageLabels[language]} • {lengthLabels[letterLength]}
          </span>
          {personality && (
            <span className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md font-bengali font-medium">
              {WRITING_PERSONALITIES.find((p) => p.value === personality)?.emoji}{' '}
              {WRITING_PERSONALITIES.find((p) => p.value === personality)?.label || personality}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bengali font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 px-3 py-1.5 rounded-lg transition-all shadow-xs glow-pink active:scale-95"
          >
            <Heart className="w-3.5 h-3.5 fill-white" />
            <span>Save Letter ❤️</span>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-bengali text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            তথ্য পরিবর্তন
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-bengali text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1.5 rounded-lg transition-colors border border-rose-200/50"
          >
            <RefreshCw className="w-3 h-3" />
            নতুন চিঠি
          </button>
        </div>
      </div>

      {/* Realistic Paper Letter Card */}
      <div className="relative paper-card rounded-2xl p-6 sm:p-10 transition-all duration-300 overflow-hidden shadow-md">
        {/* Vintage Postmark / Stamp Decorator */}
        <div className="absolute top-5 right-5 sm:top-7 sm:right-7 flex flex-col items-center pointer-events-none select-none opacity-85">
          <div className="w-14 h-16 sm:w-16 sm:h-20 border-2 border-dashed border-rose-400/70 bg-rose-50/60 rounded-md flex flex-col items-center justify-center p-1 shadow-xs transform rotate-3">
            <Feather className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 mb-0.5" />
            <span className="text-[8px] sm:text-[9px] font-sans font-bold text-rose-700 uppercase tracking-widest">
              CHITHI
            </span>
            <span className="text-[7px] sm:text-[8px] font-bengali text-rose-600/80">
              ডাকটিকিট
            </span>
          </div>
          <div className="absolute -bottom-2 -left-3 w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-rose-800/40 flex items-center justify-center -rotate-12 bg-white/30 backdrop-blur-xs">
            <span className="text-[6px] sm:text-[7px] font-mono text-rose-900/60 font-semibold tracking-tighter">
              DHAKA 90s
            </span>
          </div>
        </div>

        {/* Letter Header */}
        <div className="mb-6 sm:mb-8 pr-20">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-widest text-neutral-400 font-sans font-medium mb-1">
              PERSONAL LETTER
            </p>
            {isRefined && (
              <span className="text-[10px] font-bengali font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                এআই পরিমার্জিত {qualityScore ? `• ${qualityScore}/১০০` : ''}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="font-bengali text-xl sm:text-2xl font-bold text-neutral-900">
              {receiverName ? `প্রিয় ${receiverName}` : 'কাছের মানুষ'}
            </h2>
            {relationship && (
              <span className="text-xs font-bengali text-rose-600/80 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                {relationship}
              </span>
            )}
          </div>
          <div className="h-0.5 w-16 bg-gradient-to-r from-rose-400 to-amber-300 mt-2 rounded-full" />
        </div>

        {/* Letter Body */}
        <div className="letter-body font-bengali text-neutral-800 text-base sm:text-lg leading-relaxed sm:leading-loose whitespace-pre-wrap select-text">
          {currentLetter}
        </div>

        {/* Bottom Vintage Footer Line */}
        <div className="mt-8 sm:mt-10 pt-4 border-t border-rose-200/50 flex items-center justify-between text-[11px] text-neutral-400 font-bengali">
          <span>চিঠি লেখাই এআই • Chithi Lekhi AI</span>
          <span>যে কথা মুখে বলা যায় না 💌</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          AI VOICE LETTER MEMORIES (TTS with 4 Styles)
         ───────────────────────────────────────────────────────────── */}
      <VoiceLetterPlayer
        letterText={currentLetter}
        receiverName={receiverName}
        initialVoiceStyle="warm"
      />

      {/* ─────────────────────────────────────────────────────────────
          PHASE 7: LETTER AI ASSISTANT UI ("Improve with AI ✨")
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/95 border border-rose-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-2xs">
              <Wand2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="font-bengali font-bold text-sm text-neutral-900 leading-tight flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Improve with AI (এআই দিয়ে চিঠি উন্নত করুন ✨)</span>
              </h4>
              <p className="text-[11px] font-bengali text-neutral-500">
                এক ক্লিকে চিঠির অনুভূতি, ভাষা বা গভীরতা মনের মতো সাজিয়ে নিন
              </p>
            </div>
          </div>

          {isRefined && (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 text-xs font-bengali text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-lg transition-colors border border-neutral-200"
            >
              <RotateCcw className="w-3 h-3" />
              পূর্বের চিঠি ফেরত আনুন
            </button>
          )}
        </div>

        {/* Quick Refine Action Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {REFINE_QUICK_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              disabled={isRefining}
              onClick={() => handleRefine(chip.id)}
              className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all text-xs font-bengali font-semibold shadow-2xs active:scale-[0.98] disabled:opacity-50 ${chip.colorClass}`}
            >
              <span className="p-1 rounded-md bg-white/70 shadow-2xs">{chip.icon}</span>
              <span className="truncate">{chip.labelBn}</span>
            </button>
          ))}
        </div>

        {/* Custom AI Instruction Box */}
        <div className="pt-2 border-t border-neutral-100 space-y-2">
          <label className="block text-xs font-bengali font-medium text-neutral-700">
            Tell AI how you want to improve (এআই-কে আপনার মনের মতো নির্দেশনা দিন):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder='যেমন: "Make this like a son writing to his mother" / "মায়ের প্রতি এক সন্তানের গভীর ভালোবাসার মতো করো..."'
              disabled={isRefining}
              className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50/70 text-xs sm:text-sm font-bengali text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 transition-all"
            />
            <button
              type="button"
              disabled={isRefining || !customPrompt.trim()}
              onClick={() => {
                if (customPrompt.trim()) {
                  handleRefine('custom', customPrompt.trim())
                  setCustomPrompt('')
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bengali text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>উন্নত করুন</span>
            </button>
          </div>
        </div>

        {/* Loading / Processing Indicator */}
        {isRefining && (
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-bengali text-rose-800 animate-pulse">
            <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span>{refiningStatus || 'চিঠি পরিমার্জন চলছে...'}</span>
          </div>
        )}

        {/* Error Indicator */}
        {refineError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bengali text-red-700">
            {refineError}
          </div>
        )}
      </div>

      {/* Featured Banners: Anonymous Share & Visual Image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Anonymous Web Link Banner */}
        <div className="bg-white/90 border border-rose-100 rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bengali font-bold text-xs text-neutral-900 leading-tight">
                গোপন ওয়েব রিডিং লিংক
              </h5>
              <p className="text-[10px] font-bengali text-neutral-500">
                পরিচয় গোপন রেখে লিংকটি কাউকে পাঠান
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="py-1.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 transition-all flex items-center gap-1.5"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>শেয়ার লিংক তৈরি</span>
          </button>
        </div>

        {/* Visual Card Studio Banner */}
        <div className="bg-white/90 border border-rose-100 rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bengali font-bold text-xs text-neutral-900 leading-tight">
                ভিজ্যুয়াল ইমেজ কার্ড
              </h5>
              <p className="text-[10px] font-bengali text-neutral-500">
                জিরো-ক্রপ সম্পূর্ণ চিঠি PNG আকারে সংরক্ষণ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowVisualStudio(true)}
            className="py-1.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 transition-colors"
          >
            <span>ইমেজ স্টুডিও</span>
          </button>
        </div>
      </div>

      {/* Standard Action Buttons (Copy, WhatsApp, Formatted TXT, Vintage A4 PDF) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-medium transition-all shadow-xs ${
            copied
              ? 'bg-emerald-600 text-white shadow-emerald-200'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>কপি হয়েছে!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-neutral-500" />
              <span>চিঠি কপি</span>
            </>
          )}
        </button>

        {/* WhatsApp Share Button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-medium bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xs transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span>হোয়াটসঅ্যাপ</span>
        </a>

        {/* Formatted TXT Export Button */}
        <button
          type="button"
          onClick={handleDownloadTxt}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-medium bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border border-neutral-200 transition-colors"
        >
          <Download className="w-4 h-4 text-neutral-600" />
          <span>ফরম্যাটেড TXT</span>
        </button>

        {/* Print-Ready A4 Vintage PDF Button */}
        <button
          type="button"
          onClick={() => setShowPdfModal(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors shadow-2xs"
        >
          <Printer className="w-4 h-4 text-rose-600" />
          <span>এ৪ পিডিএফ</span>
        </button>
      </div>

      {/* Visual Studio Modal (Phase 5) */}
      {showVisualStudio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="my-auto w-full">
            <VintageLetterVisualStudio
              letter={currentLetter}
              receiverName={receiverName}
              relationship={relationship}
              onClose={() => setShowVisualStudio(false)}
            />
          </div>
        </div>
      )}

      {/* Vintage A4 PDF Modal (Phase 6) */}
      {showPdfModal && (
        <VintagePdfModal
          letter={currentLetter}
          receiverName={receiverName}
          relationship={relationship}
          onClose={() => setShowPdfModal(false)}
        />
      )}

      {/* Share Letter Modal (Public Sharing System) */}
      {showShareModal && (
        <ShareLetterModal
          letter={currentLetter}
          receiverName={receiverName}
          relationship={relationship}
          eraStyle={eraStyle}
          letterId={activeLetterId}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Save Letter Modal (Phase 8: User Letter Vault) */}
      {showSaveModal && (
        <SaveLetterModal
          letter={currentLetter}
          receiverName={receiverName}
          relationship={relationship}
          personality={personality}
          eraStyle={eraStyle}
          language={language}
          letterId={activeLetterId}
          onClose={() => setShowSaveModal(false)}
          onSaved={(savedId) => setActiveLetterId(savedId)}
        />
      )}
    </div>
  )
}

export const LetterPreviewCard = React.memo(LetterPreviewCardInner)
