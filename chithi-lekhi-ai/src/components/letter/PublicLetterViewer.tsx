'use client'

import React, { useState } from 'react'
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
import { buildWhatsAppUrl, formatDate } from '@/utils/helpers'
import { PDF_THEMES, type PdfThemeId } from '@/lib/export-utils'
import dynamic from 'next/dynamic'
import type { PublicLetterRow } from '@/types/database'

const VintageLetterVisualStudio = dynamic(
  () => import('./VintageLetterVisualStudio').then((mod) => mod.VintageLetterVisualStudio),
  { ssr: false }
)

interface PublicLetterViewerProps {
  letter: PublicLetterRow
}

export function PublicLetterViewer({ letter }: PublicLetterViewerProps) {
  const [copiedText, setCopiedText] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showStudio, setShowStudio] = useState(false)

  // Map theme or default to 90s-post
  const themeKey = (letter.theme in PDF_THEMES ? letter.theme : '90s-post') as PdfThemeId
  const theme = PDF_THEMES[themeKey] || PDF_THEMES['90s-post']

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/c/${letter.short_id}`
      : `https://chithilekhi.com/c/${letter.short_id}`

  const whatsappUrl = buildWhatsAppUrl(
    `💌 ${letter.receiver_name}-এর জন্য একটি বিশেষ চিঠি এসেছে, পড়ে দেখো:\n\n${shareUrl}\n\n— চিঠি লেখাই AI (Chithi Lekhi AI)`
  )

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(letter.letter_content)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Top Banner / Info Strip */}
      <div className="text-center space-y-2 pb-1">
        <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 text-xs font-bengali px-3 py-1 rounded-full border border-rose-200/60 shadow-2xs">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
          <span>একটি বিশেষ চিঠি এসেছে</span>
          <span className="text-neutral-300">•</span>
          <span className="inline-flex items-center gap-1 font-sans text-neutral-600">
            <Eye className="w-3 h-3 text-rose-500" />
            <span>{letter.views} views</span>
          </span>
        </div>

        <h1 className="font-bengali text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
          {letter.title || `প্রিয় ${letter.receiver_name}-এর চিঠি`}
        </h1>
        <p className="font-bengali text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
          কেউ একজন মনের গভীর ভালোবাসা ও শ্রদ্ধা নিয়ে এই চিঠিটি পাঠিয়েছে।
        </p>

        {/* Expiration Tag if applicable */}
        {letter.expiration !== 'permanent' && letter.expires_at && (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bengali text-amber-800 bg-amber-50/90 border border-amber-200/80 px-2.5 py-0.5 rounded-md mt-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>
              চিঠিটি {letter.expiration === '24h' ? '২৪ ঘণ্টার' : '৭ দিনের'} জন্য সক্রিয় (মেয়াদ:{' '}
              {formatDate(letter.expires_at)})
            </span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          REALISTIC 90s VINTAGE PAPER LETTER CARD
         ───────────────────────────────────────────────────────────── */}
      <div
        className={`relative ${theme.bgClass} rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden border-2 sm:border-4 double ${theme.borderClass} transition-all duration-300`}
        style={{
          backgroundImage: 'radial-gradient(#cfc2ad 0.65px, transparent 0.65px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* Vintage Postmark Decorator */}
        <div className="absolute top-5 right-5 sm:top-8 sm:right-8 flex flex-col items-center pointer-events-none select-none opacity-90">
          <div
            className={`w-14 h-16 sm:w-16 sm:h-20 border-2 border-dashed ${theme.stampBorder} ${theme.stampBg} rounded-md flex flex-col items-center justify-center p-1 shadow-xs rotate-3`}
          >
            <Feather className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.stampText} mb-0.5`} />
            <span
              className={`text-[8px] sm:text-[9px] font-sans font-bold uppercase tracking-widest ${theme.stampText}`}
            >
              CHITHI
            </span>
            <span className={`text-[7px] sm:text-[8px] font-bengali ${theme.stampText} opacity-90`}>
              ডাকটিকিট
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
            VINTAGE AIRMAIL ARCHIVE
          </span>
          <h2
            className="font-bengali text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: theme.textColor }}
          >
            প্রিয় {letter.receiver_name}
          </h2>
          <div className="flex items-center gap-2 mt-1.5 text-xs font-bengali text-neutral-500">
            <span>তারিখ: {formatDate(letter.created_at)}</span>
            <span>•</span>
            <span className="font-sans text-[11px] uppercase tracking-wider">{theme.nameEn}</span>
          </div>
          <div
            className="h-0.5 w-16 mt-2 rounded-full"
            style={{ backgroundColor: theme.accentColor }}
          />
        </div>

        {/* Letter Body — Bengali Ligatures Native Render */}
        <div
          className="letter-body font-bengali text-base sm:text-[16.5px] leading-relaxed sm:leading-loose whitespace-pre-wrap select-text my-4"
          style={{ color: theme.textColor }}
        >
          {letter.letter_content}
        </div>

        {/* Bottom Vintage Footer & Ornament */}
        <div className="mt-8 sm:mt-12 pt-5 border-t border-black/10 flex flex-col items-center justify-center gap-2 select-none">
          <span className="text-xs font-serif opacity-40 tracking-widest">{theme.ornament}</span>
          <div className="w-full flex flex-wrap items-center justify-between gap-2 text-[11px] font-bengali text-neutral-500">
            <span>চিঠি লেখাই এআই • Chithi Lekhi AI</span>
            <span>যে কথা মুখে বলা যায় না 💌</span>
          </div>
        </div>
      </div>

      {/* Reader Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Copy Text */}
        <button
          type="button"
          onClick={handleCopyText}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-medium bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 shadow-2xs transition-colors"
        >
          {copiedText ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>কপি হয়েছে</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-neutral-500" />
              <span>চিঠি কপি</span>
            </>
          )}
        </button>

        {/* Copy Share Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-medium bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 shadow-2xs transition-colors"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>লিংক কপি!</span>
            </>
          ) : (
            <>
              <LinkIcon className="w-3.5 h-3.5 text-rose-500" />
              <span>লিংক কপি</span>
            </>
          )}
        </button>

        {/* WhatsApp Share */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-medium bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-2xs transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>হোয়াটসঅ্যাপ</span>
        </a>

        {/* Visual Image Studio */}
        <button
          type="button"
          onClick={() => setShowStudio(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs transition-colors"
        >
          <ImageIcon className="w-3.5 h-3.5 text-rose-600" />
          <span>ইমেজ কার্ড</span>
        </button>
      </div>

      {/* Chithi Lekhi AI CTA Card */}
      <div className="bg-white/90 backdrop-blur-xs border border-rose-100 rounded-3xl p-6 text-center space-y-2.5 shadow-xs">
        <div className="inline-flex items-center gap-1 text-xs font-bengali font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>চিঠি লেখাই এআই</span>
        </div>
        <h3 className="font-bengali font-bold text-base sm:text-lg text-neutral-900">
          আপনিও কি কাউকে মনের কথা বলতে চান?
        </h3>
        <p className="font-bengali text-xs sm:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
          যে কথা কখনো মুখে বলা হয়নি, আমাদের এআই দিয়ে তা একটি নিখুঁত ভিন্টেজ চিঠিতে রূপ দিন সম্পূর্ণ
          বিনামূল্যে।
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl font-bengali text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-xs transition-all glow-pink"
          >
            <span>একটি চিঠি লিখুন</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Visual Studio Modal */}
      {showStudio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="my-auto w-full">
            <VintageLetterVisualStudio
              letter={letter.letter_content}
              receiverName={letter.receiver_name}
              date={letter.created_at}
              onClose={() => setShowStudio(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
