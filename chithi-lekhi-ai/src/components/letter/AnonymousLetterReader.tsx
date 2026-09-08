'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart,
  Copy,
  Check,
  Share2,
  Link as LinkIcon,
  Feather,
  ArrowRight,
  Eye,
  Clock,
  Sparkles,
  Download,
  Mail,
  Send,
  MessageCircle,
  Headphones,
  RotateCcw,
  X,
} from 'lucide-react'
import { formatDate } from '@/utils/helpers'
import { shareLetter } from '@/lib/share-engine'
import { useLanguage } from '@/components/providers/LanguageProvider'
import dynamic from 'next/dynamic'

const VintageLetterVisualStudio = dynamic(
  () => import('./VintageLetterVisualStudio').then((mod) => mod.VintageLetterVisualStudio),
  { ssr: false }
)
const VintagePdfModal = dynamic(
  () => import('./VintagePdfModal').then((mod) => mod.VintagePdfModal),
  { ssr: false }
)
const VoiceLetterPlayer = dynamic(
  () => import('./VoiceLetterPlayer').then((mod) => mod.VoiceLetterPlayer),
  { ssr: false }
)

interface AnonymousLetterReaderProps {
  receiverName: string
  content: string
  relationship?: string | null
  eraStyle?: string | null
  createdAt: string
  slug: string
  views?: number
  expiresAt?: string | null
  expiration?: '24h' | '7d' | 'never' | string
}

export function AnonymousLetterReader({
  receiverName,
  content,
  relationship,
  eraStyle = 'vintage',
  createdAt,
  slug,
  views = 1,
  expiresAt,
  expiration = 'never',
}: AnonymousLetterReaderProps) {
  const { locale } = useLanguage()

  // Envelope state: begins closed for maximum emotional suspense
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false)
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false)

  // Feedback states
  const [copiedText, setCopiedText] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isLiked, setIsLiked] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`chithi_liked_${slug}`) === 'true'
    }
    return false
  })
  const [likeCount, setLikeCount] = useState(() => Math.max(1, Math.round(views * 0.85)))
  const [showHeartBurst, setShowHeartBurst] = useState(false)

  // Modals
  const [showStudio, setShowStudio] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  // Reading progress tracking
  const [readProgress, setReadProgress] = useState(0)
  const letterCardRef = useRef<HTMLDivElement | null>(null)

  const copyTextTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const copyLinkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (copyTextTimeoutRef.current) clearTimeout(copyTextTimeoutRef.current)
      if (copyLinkTimeoutRef.current) clearTimeout(copyLinkTimeoutRef.current)
    }
  }, [])

  // Reading progress scroll handler
  useEffect(() => {
    if (!isEnvelopeOpen) return

    const handleScroll = () => {
      if (!letterCardRef.current) return
      const rect = letterCardRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const totalHeight = rect.height
      const visibleScrolled = windowHeight - rect.top

      if (visibleScrolled <= 0) {
        setReadProgress(0)
      } else if (visibleScrolled >= totalHeight + windowHeight * 0.3) {
        setReadProgress(100)
      } else {
        const pct = Math.min(100, Math.max(0, (visibleScrolled / totalHeight) * 100))
        setReadProgress(Math.round(pct))
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isEnvelopeOpen])

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/read/${slug}`
      : `https://chithilekhi.com/read/${slug}`

  // Track analytics event
  const trackShareEvent = async (platform: string, eventType: 'share' | 'download' = 'share') => {
    try {
      await fetch('/api/shares/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: slug,
          eventType,
          platform,
        }),
      })
    } catch {
      // Non-blocking
    }
  }

  const handleOpenEnvelope = () => {
    setIsEnvelopeOpen(true)
    setHasOpenedOnce(true)
  }

  const handleToggleLike = () => {
    const nextState = !isLiked
    setIsLiked(nextState)
    setLikeCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)))
    if (nextState) {
      setShowHeartBurst(true)
      setTimeout(() => setShowHeartBurst(false), 1200)
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(`chithi_liked_${slug}`, nextState ? 'true' : 'false')
    }
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedText(true)
      if (copyTextTimeoutRef.current) clearTimeout(copyTextTimeoutRef.current)
      copyTextTimeoutRef.current = setTimeout(() => setCopiedText(false), 2200)
    } catch {
      // Fallback
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      if (copyLinkTimeoutRef.current) clearTimeout(copyLinkTimeoutRef.current)
      copyLinkTimeoutRef.current = setTimeout(() => setCopiedLink(false), 2200)
      trackShareEvent('copy_link')
    } catch {
      // Fallback
    }
  }

  const handleShareButton = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `💌 ${receiverName}-এর জন্য একটি বিশেষ চিঠি`,
          text: `চিঠি লেখাই এআই (Chithi Lekhi AI)-এর মাধ্যমে পাঠানো একটি বিশেষ vintage চিঠি।`,
          url: shareUrl,
        })
        trackShareEvent('native')
        return
      } catch {
        // User cancelled or share failed, fallback to modal
      }
    }
    setShowShareModal(true)
  }

  const handleDirectShare = async (platform: 'whatsapp' | 'facebook' | 'messenger' | 'telegram' | 'email') => {
    trackShareEvent(platform)
    await shareLetter({
      platform,
      shareUrl,
      receiverName,
      letterText: content,
    })
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 relative">
      {/* ─────────────────────────────────────────────────────────────
          TOP ATMOSPHERE & BRAND STRIP
         ───────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-rose-50/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bengali px-4 py-1.5 rounded-full border border-rose-200/70 dark:border-rose-900/50 shadow-xs backdrop-blur-xs">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
          <span>একটি বিশেষ গোপন চিঠি এসেছে</span>
          <span className="text-neutral-300 dark:text-neutral-600">•</span>
          <span className="inline-flex items-center gap-1 font-sans text-neutral-600 dark:text-neutral-300 font-medium">
            <Eye className="w-3.5 h-3.5 text-rose-500" />
            <span>{views} views</span>
          </span>
        </div>

        {/* Expiration warning tag */}
        {expiration !== 'never' && expiresAt && (
          <div className="block">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bengali text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/50 px-3 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                {locale === 'en' ? 'Letter Expiration:' : 'চিঠির মেয়াদ:'}{' '}
                {expiration === '24h'
                  ? locale === 'en' ? '24 Hours' : '২৪ ঘণ্টা'
                  : locale === 'en' ? '7 Days' : '৭ দিন'}{' '}
                ({locale === 'en' ? 'Expires:' : 'মেয়াদ শেষ:'} {formatDate(expiresAt, locale)})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          AUTHENTIC VINTAGE ENVELOPE (Suspense & Opening Experience)
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!isEnvelopeOpen ? (
          <motion.div
            key="envelope-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30, scale: 0.96 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="w-full max-w-lg mx-auto"
          >
            <div
              onClick={handleOpenEnvelope}
              className="group cursor-pointer relative bg-[#f7f2e7] dark:bg-[#2b241c] rounded-3xl p-5 xs:p-7 sm:p-10 shadow-2xl border-2 border-[#d5c3aa] dark:border-[#5a4834] overflow-hidden transition-all duration-300 hover:shadow-rose-500/10 hover:border-rose-400/80"
              style={{
                backgroundImage: 'radial-gradient(#d6c7b2 0.75px, transparent 0.75px)',
                backgroundSize: '16px 16px',
              }}
            >
              {/* Envelope Flap Triangular Top Effect */}
              <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#eee4d0] to-transparent dark:from-[#362d22] pointer-events-none opacity-80" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[110px] xs:border-l-[140px] sm:border-l-[180px] border-l-transparent border-r-[110px] xs:border-r-[140px] sm:border-r-[180px] border-r-transparent border-t-[80px] sm:border-t-[115px] border-t-[#e2d5bd] dark:border-t-[#3f3428] drop-shadow-md" />

              {/* Postage Stamp */}
              <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-10 select-none">
                <div className="w-14 h-18 sm:w-16 sm:h-20 border-2 border-dashed border-rose-400/80 bg-rose-50/90 dark:bg-rose-950/70 rounded-md flex flex-col items-center justify-center p-1 shadow-md rotate-3 group-hover:rotate-6 transition-transform">
                  <Feather className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 mb-0.5" />
                  <span className="text-[8px] sm:text-[9px] font-sans font-bold text-rose-700 dark:text-rose-300 uppercase tracking-widest">
                    CHITHI
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-bengali text-rose-600/90 dark:text-rose-400">
                    ডাকটিকিট
                  </span>
                </div>
                {/* Circular Postmark */}
                <div className="absolute -bottom-2 -left-3 w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-neutral-400/80 flex items-center justify-center -rotate-12 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-2xs">
                  <span className="text-[6px] sm:text-[7px] font-mono text-neutral-700 dark:text-neutral-300 font-semibold">
                    DHAKA GPO
                  </span>
                </div>
              </div>

              {/* Wax Seal Center Piece */}
              <div className="relative z-10 flex flex-col items-center justify-center pt-10 pb-6 text-center space-y-4">
                <div className="relative">
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-rose-700 via-rose-800 to-red-950 text-amber-200 border-2 border-amber-300/40 shadow-xl flex items-center justify-center cursor-pointer glow-pink"
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-dashed border-amber-200/50 flex items-center justify-center">
                      <Heart className="w-6 h-6 sm:w-8 sm:h-8 fill-amber-200 text-amber-200" />
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-widest text-[#8c7355] dark:text-[#bba182] font-sans font-semibold">
                    CONFIDENTIAL & PERSONAL
                  </p>
                  <p className="font-bengali text-lg sm:text-xl font-bold text-[#3d2714] dark:text-[#edd9c0]">
                    বরাবর, প্রিয় {receiverName}
                  </p>
                </div>

                <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 max-w-xs leading-relaxed">
                  আপনার জন্য একটি বিশেষ চিঠি এসেছে 💌
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenEnvelope()
                    }}
                    className="inline-flex items-center gap-2 py-3 px-6 rounded-2xl font-bengali text-sm font-semibold text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-700 shadow-md hover:shadow-lg transition-all min-h-[48px] cursor-pointer group-hover:scale-105"
                  >
                    <Mail className="w-4 h-4" />
                    <span>চিঠিটি খুলুন</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
              OPENED LETTER EXPERIENCE (Digital Handwritten Memory)
             ───────────────────────────────────────────────────────────── */
          <motion.div
            key="letter-view"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* Quick Action Top Controls */}
            {hasOpenedOnce && (
              <div className="flex items-center justify-between px-2 text-xs font-bengali text-neutral-500 dark:text-neutral-400">
                <button
                  type="button"
                  onClick={() => setIsEnvelopeOpen(false)}
                  className="inline-flex items-center gap-1.5 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors py-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>খাম আবার দেখুন</span>
                </button>
                <div className="flex items-center gap-2">
                  <span>পড়ার অগ্রগতি:</span>
                  <div className="w-24 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-300"
                      style={{ width: `${readProgress}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px]">{readProgress}%</span>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                PREMIUM VINTAGE LETTER PAPER CARD
               ───────────────────────────────────────────────────────────── */}
            <div
              ref={letterCardRef}
              className="relative bg-[#fdfbf7] dark:bg-[#27211a] rounded-3xl p-6 sm:p-12 shadow-2xl overflow-hidden border-2 sm:border-4 double border-[#b89767] dark:border-[#6a543b] transition-all duration-300"
              style={{
                backgroundImage:
                  'radial-gradient(#cfc2ad 0.65px, transparent 0.65px), linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0))',
                backgroundSize: '20px 20px, 100% 100%',
              }}
            >
              {/* Subtle top progress bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 transition-all duration-150"
                style={{ width: `${readProgress}%` }}
              />

              {/* Vintage Postmark Decorator */}
              <div className="absolute top-6 right-6 sm:top-10 sm:right-10 flex flex-col items-center pointer-events-none select-none opacity-90">
                <div className="w-14 h-16 sm:w-16 sm:h-20 border-2 border-dashed border-rose-400/80 bg-rose-50/70 dark:bg-rose-950/60 rounded-md flex flex-col items-center justify-center p-1 shadow-xs rotate-3">
                  <Feather className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 mb-0.5" />
                  <span className="text-[8px] sm:text-[9px] font-sans font-bold text-rose-700 dark:text-rose-300 uppercase tracking-widest">
                    CHITHI
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-bengali text-rose-600/90 dark:text-rose-400">
                    ডাকটিকিট
                  </span>
                </div>
                <div className="absolute -bottom-2 -left-3 w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-neutral-400 dark:border-neutral-600 flex items-center justify-center -rotate-12 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-2xs">
                  <span className="text-[6px] sm:text-[7px] font-mono text-neutral-700 dark:text-neutral-300 font-semibold tracking-tighter">
                    DHAKA GPO
                  </span>
                </div>
              </div>

              {/* Letter Header */}
              <div className="mb-6 sm:mb-8 pr-20 space-y-2">
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-[#8c7355] dark:text-[#bba182] font-sans font-semibold block">
                  VINTAGE DIGITAL MEMORY
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-bengali text-2xl sm:text-3xl font-bold text-[#3d2714] dark:text-[#edd9c0]">
                    {locale === 'en' ? `Dear ${receiverName}` : `প্রিয় ${receiverName}`}
                  </h1>
                  {relationship && (
                    <span className="text-xs font-bengali text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-3 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-900/50">
                      {relationship}
                    </span>
                  )}
                </div>

                {/* AI Enhancement Badge */}
                <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200/70 dark:border-amber-900/50 px-2.5 py-1 rounded-lg text-xs font-bengali">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-semibold">✨ AI দিয়ে সুন্দরভাবে লেখা</span>
                  <span className="text-amber-400 dark:text-amber-600 hidden sm:inline">•</span>
                  <span className="text-[11px] text-amber-700/90 dark:text-amber-300/80 hidden sm:inline">
                    অনুভূতি অক্ষুণ্ণ রেখে সুন্দরভাবে সাজানো
                  </span>
                </div>

                {/* Date & Styling Tag */}
                <div className="flex items-center gap-2 pt-1 text-xs font-bengali text-neutral-500 dark:text-neutral-400">
                  <span>
                    {locale === 'en' ? 'Date:' : 'তারিখ:'} {formatDate(createdAt, locale)}
                  </span>
                  <span>•</span>
                  <span className="font-sans text-[11px] uppercase tracking-wider">
                    {eraStyle === '90s-handwritten' ? '90s Handwritten' : 'Vintage Classical'}
                  </span>
                </div>

                <div className="h-0.5 w-16 bg-[#b89767] dark:bg-[#7d6549] mt-2 rounded-full" />
              </div>

              {/* Letter Body */}
              <div className="letter-body font-bengali text-base sm:text-[18px] leading-relaxed sm:leading-[2.2] text-[#2c1d11] dark:text-[#f3e9dc] whitespace-pre-wrap select-text my-6 tracking-wide">
                {content}
              </div>

              {/* Bottom Vintage Signature Line */}
              <div className="mt-8 sm:mt-12 pt-4 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-bengali select-none">
                <span>চিঠি লেখাই এআই • Chithi Lekhi AI</span>
                <span>যে কথা মুখে বলা যায় না 💌</span>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                AI VOICE LETTER PLAYER SECTION ("চিঠিটি শুনুন 🎧")
               ───────────────────────────────────────────────────────────── */}
            <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-rose-100 dark:border-neutral-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/50 flex items-center justify-center text-rose-500">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bengali text-base font-bold text-neutral-900 dark:text-neutral-100">
                      চিঠিটি শুনুন 🎧
                    </h3>
                    <p className="font-bengali text-xs text-neutral-500 dark:text-neutral-400">
                      বাস্তবসম্মত বাংলা কণ্ঠে চিঠিটি শুনে অনুভব করুন
                    </p>
                  </div>
                </div>
              </div>

              <VoiceLetterPlayer
                letterText={content}
                receiverName={receiverName}
                shareToken={slug}
                initialVoiceStyle="warm"
              />
            </div>

            {/* ─────────────────────────────────────────────────────────────
                STICKY BOTTOM ACTION BAR (Like, Share, PDF, Copy)
               ───────────────────────────────────────────────────────────── */}
            <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-rose-100 dark:border-neutral-800 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-[max(12px,env(safe-area-inset-bottom,0px))]">
              {/* Like Button */}
              <button
                type="button"
                onClick={handleToggleLike}
                className={`relative flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl font-bengali text-xs sm:text-sm font-semibold transition-all min-h-[44px] cursor-pointer ${
                  isLiked
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <Heart
                  className={`w-4 h-4 transition-transform ${
                    isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-neutral-500'
                  }`}
                />
                <span>ভালো লেগেছে</span>
                <span className="font-sans text-xs bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full font-bold">
                  {likeCount}
                </span>

                {/* Heart Burst Animation */}
                {showHeartBurst && (
                  <motion.div
                    initial={{ opacity: 1, scale: 0.5, y: 0 }}
                    animate={{ opacity: 0, scale: 1.8, y: -24 }}
                    transition={{ duration: 0.8 }}
                    className="absolute -top-3 left-6 pointer-events-none text-rose-500"
                  >
                    ❤️
                  </motion.div>
                )}
              </button>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
                {/* PDF Download Button */}
                <button
                  type="button"
                  onClick={() => setShowPdfModal(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200/80 dark:border-amber-900/50 shadow-2xs transition-colors min-h-[44px] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">PDF ডাউনলোড</span>
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={handleShareButton}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-2xs transition-colors min-h-[44px] cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">শেয়ার করুন</span>
                </button>

                {/* Copy Text Button */}
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 shadow-2xs transition-colors min-h-[44px] cursor-pointer"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">কপি হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="truncate">কপি</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                VIRAL GROWTH CTA ("আপনিও কি এমন একটি চিঠি লিখতে চান?")
               ───────────────────────────────────────────────────────────── */}
            <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs border border-rose-100 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-xs">
              <div className="inline-flex items-center gap-1.5 text-xs font-bengali font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>চিঠি লেখাই এআই</span>
              </div>
              <h3 className="font-bengali font-bold text-lg sm:text-xl text-neutral-900 dark:text-neutral-100">
                আপনিও কি কাউকে মনের কথা বলতে চান?
              </h3>
              <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                যে কথা কখনো মুখে বলা হয়নি, আমাদের এআই দিয়ে তা একটি নিখুঁত ভিন্টেজ চিঠিতে রূপ দিন সম্পূর্ণ বিনামূল্যে।
              </p>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 py-3 px-6 rounded-2xl font-bengali text-sm font-semibold text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-700 shadow-md transition-all glow-pink min-h-[46px]"
                >
                  <span>একটি চিঠি লিখুন</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          SHARE MODAL (Direct Social Channels & Copy)
         ───────────────────────────────────────────────────────────── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-neutral-900 rounded-3xl p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bengali font-bold text-lg text-neutral-900 dark:text-neutral-100">
                চিঠিটি শেয়ার করুন 💌
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="font-bengali text-xs text-neutral-600 dark:text-neutral-400">
              নিচের যে কোনো মাধ্যমে প্রিয়জনের কাছে এই চিঠিটি পৌঁছে দিন:
            </p>

            {/* Social Share Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleDirectShare('whatsapp')}
                className="flex items-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-bengali text-xs font-semibold transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>হোয়াটসঅ্যাপ</span>
              </button>

              <button
                type="button"
                onClick={() => handleDirectShare('telegram')}
                className="flex items-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] font-bengali text-xs font-semibold transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>টেলিগ্রাম</span>
              </button>

              <button
                type="button"
                onClick={() => handleDirectShare('messenger')}
                className="flex items-center gap-2 p-3 rounded-xl bg-[#0084FF]/10 hover:bg-[#0084FF]/20 text-[#0084FF] font-bengali text-xs font-semibold transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>মেসেঞ্জার</span>
              </button>

              <button
                type="button"
                onClick={() => handleDirectShare('email')}
                className="flex items-center gap-2 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bengali text-xs font-semibold transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>ইমেইল</span>
              </button>
            </div>

            {/* Copy Link Row */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bengali text-xs font-semibold bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer min-h-[44px]"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>লিংক কপি হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    <span>সরাসরি লিংক কপি করুন</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VINTAGE PDF DOWNLOAD MODAL
         ───────────────────────────────────────────────────────────── */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="my-auto w-full max-w-4xl">
            <VintagePdfModal
              letter={content}
              receiverName={receiverName}
              relationship={relationship || undefined}
              date={createdAt}
              language={locale === 'en' ? 'english' : 'bengali'}
              onClose={() => setShowPdfModal(false)}
            />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VINTAGE LETTER VISUAL STUDIO MODAL (Image Export)
         ───────────────────────────────────────────────────────────── */}
      {showStudio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="my-auto w-full">
            <VintageLetterVisualStudio
              letter={content}
              receiverName={receiverName}
              relationship={relationship || undefined}
              date={createdAt}
              language={locale === 'en' ? 'english' : 'bengali'}
              onClose={() => setShowStudio(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
