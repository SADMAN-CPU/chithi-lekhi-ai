'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Heart,
  Copy,
  Check,
  Share2,
  Link as LinkIcon,
  Feather,
  Image as ImageIcon,
  ArrowRight,
  Eye,
  Clock,
  Sparkles,
} from 'lucide-react'
import { formatDate } from '@/utils/helpers'
import { shareLetter } from '@/lib/share-engine'
import { useLanguage } from '@/components/providers/LanguageProvider'
import dynamic from 'next/dynamic'

const VintageLetterVisualStudio = dynamic(
  () => import('./VintageLetterVisualStudio').then((mod) => mod.VintageLetterVisualStudio),
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
  eraStyle,
  createdAt,
  slug,
  views = 1,
  expiresAt,
  expiration = 'never',
}: AnonymousLetterReaderProps) {
  const { locale } = useLanguage()
  const [copiedText, setCopiedText] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showStudio, setShowStudio] = useState(false)

  const copyTextTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const copyLinkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (copyTextTimeoutRef.current) clearTimeout(copyTextTimeoutRef.current)
      if (copyLinkTimeoutRef.current) clearTimeout(copyLinkTimeoutRef.current)
    }
  }, [])

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/read/${slug}`
      : `https://chithilekhi.com/read/${slug}`

  // Track analytics event helper
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

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedText(true)
      if (copyTextTimeoutRef.current) clearTimeout(copyTextTimeoutRef.current)
      copyTextTimeoutRef.current = setTimeout(() => setCopiedText(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      if (copyLinkTimeoutRef.current) clearTimeout(copyLinkTimeoutRef.current)
      copyLinkTimeoutRef.current = setTimeout(() => setCopiedLink(false), 2000)
      trackShareEvent('copy_link')
    } catch {
      // Fallback
    }
  }

  const handleWhatsApp = async () => {
    trackShareEvent('whatsapp')
    await shareLetter({
      platform: 'whatsapp',
      shareUrl,
      receiverName,
      letterText: content,
    })
  }

  const handleFacebook = async () => {
    trackShareEvent('facebook')
    await shareLetter({
      platform: 'facebook',
      shareUrl,
      receiverName,
      letterText: content,
    })
  }

  const handleDownloadImage = () => {
    trackShareEvent('image', 'download')
    setShowStudio(true)
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-700">
      {/* Anonymous Arrival Top Strip */}
      <div className="text-center space-y-2 pb-1">
        <div className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-bengali px-3.5 py-1 rounded-full border border-rose-200/60 dark:border-rose-900/40 shadow-2xs">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
          <span>একটি বিশেষ গোপন চিঠি এসেছে</span>
          <span className="text-neutral-300 dark:text-neutral-600">•</span>
          <span className="inline-flex items-center gap-1 font-sans text-neutral-600 dark:text-neutral-400">
            <Eye className="w-3 h-3 text-rose-500" />
            <span>{views} views</span>
          </span>
        </div>

        <h1 className="font-bengali text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
          প্রিয় {receiverName}-এর উদ্দেশ্যে চিঠি
        </h1>
        <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
          কেউ একজন মনের গভীর ভালোবাসা ও শ্রদ্ধা নিয়ে এই চিঠিটি পাঠিয়েছে।
        </p>

        {/* Expiration Tag if applicable */}
        {expiration !== 'never' && expiresAt && (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bengali text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/50 px-2.5 py-0.5 rounded-md mt-1">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>
              {locale === 'en' ? 'Letter Expiration:' : 'চিঠির মেয়াদ:'}{' '}
              {expiration === '24h'
                ? (locale === 'en' ? '24 Hours' : '২৪ ঘণ্টা')
                : (locale === 'en' ? '7 Days' : '৭ দিন')}{' '}
              ({locale === 'en' ? 'Expires:' : 'মেয়াদ শেষ:'} {formatDate(expiresAt, locale)})
            </span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          REALISTIC 90s VINTAGE PAPER LETTER CARD
         ───────────────────────────────────────────────────────────── */}
      <div
        className="relative bg-[#fbf8f1] rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden border-2 sm:border-4 double border-[#b89767] transition-all duration-300"
        style={{
          backgroundImage: 'radial-gradient(#cfc2ad 0.65px, transparent 0.65px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* Vintage Postmark Decorator */}
        <div className="absolute top-5 right-5 sm:top-8 sm:right-8 flex flex-col items-center pointer-events-none select-none opacity-90">
          <div className="w-14 h-16 sm:w-16 sm:h-20 border-2 border-dashed border-rose-400/80 bg-rose-50/70 rounded-md flex flex-col items-center justify-center p-1 shadow-xs rotate-3">
            <Feather className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 mb-0.5" />
            <span className="text-[8px] sm:text-[9px] font-sans font-bold text-rose-700 uppercase tracking-widest">
              CHITHI
            </span>
            <span className="text-[7px] sm:text-[8px] font-bengali text-rose-600/90">
              {locale === 'en' ? 'POSTAGE' : 'ডাকটিকিট'}
            </span>
          </div>
          <div className="absolute -bottom-2 -left-3 w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-neutral-400 flex items-center justify-center -rotate-12 bg-white/50 backdrop-blur-xs">
            <span className="text-[6px] sm:text-[7px] font-mono text-neutral-700 font-semibold tracking-tighter">
              DHAKA GPO
            </span>
          </div>
        </div>

        {/* Letter Header */}
        <div className="mb-6 sm:mb-8 pr-20">
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-sans font-semibold mb-1 block">
            VINTAGE ANONYMOUS ARCHIVE
          </span>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="font-bengali text-2xl sm:text-3xl font-bold text-[#3d2714]">
              {locale === 'en' ? `Dear ${receiverName}` : `প্রিয় ${receiverName}`}
            </h2>
            {relationship && (
              <span className="text-xs font-bengali text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/50">
                {relationship}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs font-bengali text-neutral-500">
            <span>{locale === 'en' ? 'Date:' : 'তারিখ:'} {formatDate(createdAt, locale)}</span>
            <span>•</span>
            <span className="font-sans text-[11px] uppercase tracking-wider">
              {eraStyle === '90s-handwritten' ? '90s Handwritten' : 'Vintage Classical'}
            </span>
          </div>
          <div className="h-0.5 w-16 bg-[#b89767] mt-2 rounded-full" />
        </div>

        {/* Letter Body */}
        <div className="letter-body font-bengali text-base sm:text-[17px] leading-relaxed sm:leading-loose text-[#2c1d11] whitespace-pre-wrap select-text my-4">
          {content}
        </div>

        {/* Bottom Vintage Footer Line */}
        <div className="mt-8 sm:mt-12 pt-4 border-t border-black/10 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 font-bengali select-none">
          <span>চিঠি লেখাই এআই • Chithi Lekhi AI</span>
          <span>যে কথা মুখে বলা যায় না 💌</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          AI VOICE LETTER PLAYER (Integrated into Reader)
         ───────────────────────────────────────────────────────────── */}
      <VoiceLetterPlayer
        letterText={content}
        receiverName={receiverName}
        shareToken={slug}
        initialVoiceStyle="warm"
      />

      {/* ─────────────────────────────────────────────────────────────
          READER GROWTH ACTIONS (Copy Link, WhatsApp, Facebook, Image)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Copy Share Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 shadow-2xs transition-colors min-h-[44px] cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>লিংক কপি!</span>
            </>
          ) : (
            <>
              <LinkIcon className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>লিংক কপি</span>
            </>
          )}
        </button>

        {/* WhatsApp Share */}
        <button
          type="button"
          onClick={handleWhatsApp}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-2xs transition-colors min-h-[44px] cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>হোয়াটসঅ্যাপ</span>
        </button>

        {/* Facebook Share */}
        <button
          type="button"
          onClick={handleFacebook}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-2xs transition-colors min-h-[44px] cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>ফেসবুক শেয়ার</span>
        </button>

        {/* Download Image */}
        <button
          type="button"
          onClick={handleDownloadImage}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900/40 shadow-2xs transition-colors min-h-[44px] cursor-pointer"
        >
          <ImageIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>ইমেজ ডাউনলোড</span>
        </button>
      </div>

      {/* Copy Text Option */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleCopyText}
          className="inline-flex items-center gap-1.5 text-xs font-bengali text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors py-2 min-h-[40px] cursor-pointer"
        >
          {copiedText ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>সম্পূর্ণ টেক্সট কপি হয়েছে</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>চিঠির টেক্সট কপি করতে এখানে ক্লিক করুন</span>
            </>
          )}
        </button>
      </div>

      {/* Chithi Lekhi AI Viral CTA */}
      <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs border border-rose-100 dark:border-neutral-800 rounded-3xl p-6 text-center space-y-2.5 shadow-xs">
        <div className="inline-flex items-center gap-1 text-xs font-bengali font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-full">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>চিঠি লেখাই এআই</span>
        </div>
        <h3 className="font-bengali font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100">
          আপনিও কি কাউকে মনের কথা বলতে চান?
        </h3>
        <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
          যে কথা কখনো মুখে বলা হয়নি, আমাদের এআই দিয়ে তা একটি নিখুঁত ভিন্টেজ চিঠিতে রূপ দিন সম্পূর্ণ বিনামূল্যে।
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl font-bengali text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-xs transition-all glow-pink min-h-[44px]"
          >
            <span>একটি চিঠি লিখুন</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Visual Studio Modal for Image Export */}
      {showStudio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
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
