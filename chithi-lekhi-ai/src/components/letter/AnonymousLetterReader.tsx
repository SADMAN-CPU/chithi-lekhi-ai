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
} from 'lucide-react'
import { buildWhatsAppUrl, formatDate } from '@/utils/helpers'
import { VintageLetterVisualStudio } from './VintageLetterVisualStudio'

interface AnonymousLetterReaderProps {
  receiverName: string
  content: string
  relationship?: string | null
  eraStyle?: string | null
  createdAt: string
  slug: string
}

export function AnonymousLetterReader({
  receiverName,
  content,
  relationship,
  eraStyle,
  createdAt,
  slug,
}: AnonymousLetterReaderProps) {
  const [copiedText, setCopiedText] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showStudio, setShowStudio] = useState(false)

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/read/${slug}` : `/read/${slug}`
  const whatsappUrl = buildWhatsAppUrl(
    `💌 তোমার জন্য একটি চিঠি এসেছে, পড়ে দেখো:\n\n${shareUrl}\n\n— চিঠি লেখাই AI (Chithi Lekhi AI)`
  )

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(content)
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

  const eraLabel =
    eraStyle === '90s-handwritten'
      ? '✉️ ৯০-এর হাতে লেখা চিঠি'
      : eraStyle === 'vintage'
      ? '📜 ভিন্টেজ ক্লাসিক্যাল'
      : '✨ আন্তরিক চিঠি'

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Anonymous Arrival Banner */}
      <div className="text-center space-y-2 pb-2">
        <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 text-xs font-bengali px-3 py-1 rounded-full border border-rose-200/60 shadow-2xs">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span>গোপন ও ব্যক্তিগত চিঠি</span>
        </div>
        <h1 className="font-bengali text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
          তোমার জন্য একটি চিঠি এসেছে
        </h1>
        <p className="font-bengali text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
          কেউ একজন তার না-বলা মনের গভীর কথাগুলো এই চিঠিতে লিখে তোমার কাছে পাঠিয়েছে।
        </p>
      </div>

      {/* Realistic Paper Card (100% Anonymous - No author data) */}
      <div className="relative paper-card rounded-3xl p-6 sm:p-10 shadow-lg overflow-hidden border border-rose-100">
        {/* Vintage Postmark Decorator */}
        <div className="absolute top-5 right-5 sm:top-8 sm:right-8 flex flex-col items-center pointer-events-none select-none opacity-85">
          <div className="w-14 h-16 sm:w-16 sm:h-20 border-2 border-dashed border-rose-400/70 bg-rose-50/60 rounded-md flex flex-col items-center justify-center p-1 shadow-xs rotate-3">
            <Feather className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 mb-0.5" />
            <span className="text-[8px] sm:text-[9px] font-sans font-bold text-rose-700 uppercase tracking-widest">
              CHITHI
            </span>
            <span className="text-[7px] sm:text-[8px] font-bengali text-rose-600/80">
              ডাকটিকিট
            </span>
          </div>
          <div className="absolute -bottom-2 -left-3 w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-rose-800/40 flex items-center justify-center -rotate-12 bg-white/40 backdrop-blur-xs">
            <span className="text-[6px] sm:text-[7px] font-mono text-rose-900/60 font-semibold tracking-tighter">
              DHAKA 90s
            </span>
          </div>
        </div>

        {/* Letter Header */}
        <div className="mb-6 sm:mb-8 pr-20">
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-sans font-semibold mb-1 block">
            ANONYMOUS LETTER
          </span>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="font-bengali text-2xl sm:text-3xl font-bold text-neutral-900">
              প্রিয় {receiverName}
            </h2>
            {relationship && (
              <span className="text-xs font-bengali text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/50">
                {relationship}
              </span>
            )}
          </div>
          <div className="h-0.5 w-16 bg-gradient-to-r from-rose-400 to-amber-300 mt-2 rounded-full" />
        </div>

        {/* Letter Body */}
        <div className="letter-body font-bengali text-neutral-800 text-base sm:text-lg leading-relaxed sm:leading-loose whitespace-pre-wrap select-text">
          {content}
        </div>

        {/* Bottom Vintage Footer Line */}
        <div className="mt-8 sm:mt-12 pt-4 border-t border-rose-200/50 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400 font-bengali">
          <span>{formatDate(createdAt)}</span>
          <span className="font-sans font-medium text-neutral-500">{eraLabel}</span>
          <span>চিঠি লেখাই এআই • chithi.ai</span>
        </div>
      </div>

      {/* Reader Action Buttons */}
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
              <span>লিংক কপি</span>
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
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-medium bg-[#25D366] hover:bg-[#20bd5a] text-white transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>হোয়াটসঅ্যাপ</span>
        </a>

        {/* Visual Image Studio */}
        <button
          type="button"
          onClick={() => setShowStudio(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bengali text-xs sm:text-sm font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors"
        >
          <ImageIcon className="w-3.5 h-3.5 text-rose-600" />
          <span>ইমেজ কার্ড</span>
        </button>
      </div>

      {/* Write a reply or letter yourself CTA */}
      <div className="bg-white/80 backdrop-blur-xs border border-rose-100/90 rounded-2xl p-5 text-center space-y-2 shadow-2xs">
        <h3 className="font-bengali font-bold text-base text-neutral-900">
          আপনিও কাউকে চিঠি লিখতে চান?
        </h3>
        <p className="font-bengali text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
          যে কথা কখনো মুখে বলা হয়নি, আমাদের এআই দিয়ে তা একটি নিখুঁত চিঠিতে রূপ দিন সম্পূর্ণ বিনামূল্যে।
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
              letter={content}
              receiverName={receiverName}
              relationship={relationship || undefined}
              date={createdAt}
              onClose={() => setShowStudio(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
