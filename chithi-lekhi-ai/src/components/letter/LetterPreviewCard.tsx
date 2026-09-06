'use client'

import React, { useState } from 'react'
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
} from 'lucide-react'
import { buildWhatsAppUrl } from '@/utils/helpers'
import { WRITING_PERSONALITIES } from '@/constants'
import type { EraStyle, Language, LetterLength } from '@/types'
import { VintageLetterVisualStudio } from './VintageLetterVisualStudio'

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

export function LetterPreviewCard({
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
  const [copied, setCopied] = useState(false)
  const [copiedShareLink, setCopiedShareLink] = useState(false)
  const [sharingLoading, setSharingLoading] = useState(false)
  const [showVisualStudio, setShowVisualStudio] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = letter
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleDownload = () => {
    const element = document.createElement('a')
    const file = new Blob([letter], { type: 'text/plain;charset=utf-8' })
    element.href = URL.createObjectURL(file)
    element.download = `chithi-for-${receiverName.replace(/\s+/g, '-').toLowerCase() || 'someone'}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Handle Generating / Copying Public Anonymous Link
  const handleGetShareLink = async () => {
    setSharingLoading(true)
    try {
      let targetId = letterId

      // If not yet saved with an ID, save it to the database
      if (!targetId) {
        const saveRes = await fetch('/api/letters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiver_name: receiverName,
            relationship,
            content: letter,
            language,
            era_style: eraStyle,
            is_public: true,
          }),
        })
        const saveData = await saveRes.json()
        if (saveData.success && saveData.letter) {
          targetId = saveData.letter.id
        }
      }

      if (targetId) {
        const res = await fetch('/api/letters/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ letterId: targetId, isPublic: true }),
        })
        const data = await res.json()
        if (data.success && data.shareUrl) {
          try {
            await navigator.clipboard.writeText(data.shareUrl)
          } catch {
            const textarea = document.createElement('textarea')
            textarea.value = data.shareUrl
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
          }
          setCopiedShareLink(true)
          setTimeout(() => setCopiedShareLink(false), 3000)
        }
      }
    } catch (err) {
      console.error('Share link generation failed:', err)
    } finally {
      setSharingLoading(false)
    }
  }

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
    `💌 তোমার জন্য একটি চিঠি এসেছে:\n\n${letter}\n\n— চিঠি লেখাই AI (Chithi Lekhi AI)`
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
      <div className="relative paper-card rounded-2xl p-6 sm:p-10 transition-all duration-300 overflow-hidden">
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
          <p className="text-xs uppercase tracking-widest text-neutral-400 font-sans font-medium mb-1">
            PERSONAL LETTER
          </p>
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
          {letter}
        </div>

        {/* Bottom Vintage Footer Line */}
        <div className="mt-8 sm:mt-10 pt-4 border-t border-rose-200/50 flex items-center justify-between text-[11px] text-neutral-400 font-bengali">
          <span>চিঠি লেখাই এআই • Chithi Lekhi AI</span>
          <span>যে কথা মুখে বলা যায় না 💌</span>
        </div>
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
            disabled={sharingLoading}
            onClick={handleGetShareLink}
            className={`py-1.5 px-3 rounded-xl font-bengali text-xs font-semibold transition-all ${
              copiedShareLink
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60'
            }`}
          >
            {copiedShareLink ? (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-white" />
                কপি হয়েছে
              </span>
            ) : sharingLoading ? (
              <span>লিংক তৈরি হচ্ছে...</span>
            ) : (
              <span>লিংক কপি</span>
            )}
          </button>
        </div>

        {/* Visual Card Banner */}
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
                ছবি আকারে ডাউনলোড ও স্টোরিতে শেয়ার
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowVisualStudio(true)}
            className="py-1.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 transition-colors"
          >
            <span>ইমেজ বানান</span>
          </button>
        </div>
      </div>

      {/* Standard Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bengali text-sm font-medium transition-all shadow-xs ${
            copied
              ? 'bg-emerald-600 text-white shadow-emerald-200'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 hover:border-neutral-300'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>কপি সম্পন্ন হয়েছে!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-neutral-500" />
              <span>চিঠি কপি করুন</span>
            </>
          )}
        </button>

        {/* WhatsApp Share Button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bengali text-sm font-medium bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xs transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span>হোয়াটসঅ্যাপে পাঠান</span>
        </a>

        {/* Download Button */}
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bengali text-sm font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>চিঠি ডাউনলোড (.txt)</span>
        </button>
      </div>

      {/* Visual Studio Modal */}
      {showVisualStudio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="my-auto w-full">
            <VintageLetterVisualStudio
              letter={letter}
              receiverName={receiverName}
              relationship={relationship}
              onClose={() => setShowVisualStudio(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
