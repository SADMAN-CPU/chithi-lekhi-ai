'use client'

import React, { useState } from 'react'
import {
  X,
  Link as LinkIcon,
  Globe,
  Lock,
  Clock,
  Check,
  Copy,
  Share2,
  ExternalLink,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react'
import type { ShareExpiration } from '@/lib/shares'
import dynamic from 'next/dynamic'

const VintageLetterVisualStudio = dynamic(
  () => import('./VintageLetterVisualStudio').then((mod) => mod.VintageLetterVisualStudio),
  { ssr: false }
)

interface ShareLetterModalProps {
  letter: string
  receiverName: string
  title?: string
  relationship?: string
  eraStyle?: string
  letterId?: string
  onClose: () => void
}

export function ShareLetterModal({
  letter,
  receiverName,
  title: _title,
  relationship,
  eraStyle: _eraStyle,
  letterId,
  onClose,
}: ShareLetterModalProps) {
  // Config state
  const [isPublic, setIsPublic] = useState(true)
  const [expiration, setExpiration] = useState<ShareExpiration>('never')

  // Loading & Result state
  const [isLoading, setIsLoading] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showStudio, setShowStudio] = useState(false)

  // Track analytics event helper
  const trackShare = async (platform: string, eventType: 'share' | 'download' = 'share') => {
    if (!shareToken) return
    try {
      await fetch('/api/shares/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          eventType,
          platform,
        }),
      })
    } catch {
      // Non-blocking
    }
  }

  const handleGenerateLink = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      // Create share in database
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter_id: letterId || `local-${Date.now()}`,
          is_public: isPublic,
          expiration: expiration,
        }),
      })

      const data = await res.json()
      if (data.success && data.shareUrl) {
        setGeneratedUrl(data.shareUrl)
        setShareToken(data.shareToken)
      } else {
        // Fallback to client URL generator
        const fallbackToken = Math.random().toString(36).slice(2, 8)
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://chithilekhi.com'
        setGeneratedUrl(`${origin}/read/${fallbackToken}`)
        setShareToken(fallbackToken)
      }
    } catch (err) {
      console.error('Failed to generate share link:', err)
      const fallbackToken = Math.random().toString(36).slice(2, 8)
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://chithilekhi.com'
      setGeneratedUrl(`${origin}/read/${fallbackToken}`)
      setShareToken(fallbackToken)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedUrl) return
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      trackShare('copy_link')
    } catch {
      // Fallback
    }
  }

  const handleWhatsAppShare = () => {
    trackShare('whatsapp')
    const message = `💌 ${receiverName}-এর জন্য একটি বিশেষ চিঠি এসেছে, পড়ে দেখো:\n\n${generatedUrl}\n\n— চিঠি লেখাই AI (Chithi Lekhi AI)`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleFacebookShare = () => {
    trackShare('facebook')
    if (!generatedUrl) return
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(generatedUrl)}`, '_blank')
  }

  const handleDownloadImage = () => {
    trackShare('image', 'download')
    setShowStudio(true)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
        <div className="my-auto w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-rose-50/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-2xs">
                <LinkIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bengali font-bold text-base text-neutral-900 leading-tight">
                  পাবলিক শেয়ার লিংক তৈরি করুন
                </h3>
                <p className="text-[11px] font-bengali text-neutral-500">
                  চিঠিটি অনলাইনে পড়ার জন্য একটি সুন্দর শর্ট লিংক তৈরি করুন
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5">
            {!generatedUrl ? (
              <>
                {/* 1. Privacy Mode Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bengali font-bold text-neutral-700">
                    নিরাপত্তা ও প্রাইভেসি (Privacy Mode):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all text-xs font-bengali ${
                        isPublic
                          ? 'border-rose-400 bg-rose-50/60 text-rose-900 shadow-2xs'
                          : 'border-neutral-200 bg-neutral-50/40 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <Globe className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold block">পাবলিক (Public)</span>
                        <span className="text-[11px] opacity-75">লিংক থাকা যে কেউ পড়তে পারবে</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all text-xs font-bengali ${
                        !isPublic
                          ? 'border-rose-400 bg-rose-50/60 text-rose-900 shadow-2xs'
                          : 'border-neutral-200 bg-neutral-50/40 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold block">প্রাইভেট (Private)</span>
                        <span className="text-[11px] opacity-75">শুধুমাত্র আপনার ড্যাশবোর্ডে থাকবে</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Expiration Option */}
                <div className="space-y-2">
                  <label className="block text-xs font-bengali font-bold text-neutral-700">
                    মেয়াদ নির্বাচন (Expire Option):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: '24h', labelBn: '২৪ ঘণ্টা', desc: '24 Hours' },
                        { id: '7d', labelBn: '৭ দিন', desc: '7 Days' },
                        { id: 'never', labelBn: 'আজীবন', desc: 'Never' },
                      ] as const
                    ).map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => setExpiration(exp.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all text-xs font-bengali ${
                          expiration === exp.id
                            ? 'border-rose-400 bg-rose-50 text-rose-900 font-bold shadow-2xs'
                            : 'border-neutral-200 bg-neutral-50/40 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" />
                        <span className="block">{exp.labelBn}</span>
                        <span className="text-[10px] opacity-60 font-sans">{exp.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-xs font-bengali text-red-600 text-center bg-red-50 p-2 rounded-xl">
                    {errorMessage}
                  </p>
                )}

                {/* Generate Action Button */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGenerateLink}
                  className={`w-full py-3 rounded-xl font-bengali text-sm font-semibold text-white shadow-xs transition-all flex items-center justify-center gap-2 ${
                    isLoading
                      ? 'bg-neutral-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] glow-pink'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isLoading ? 'লিংক তৈরি হচ্ছে...' : 'শেয়ার লিংক তৈরি করুন (Generate Share)'}</span>
                </button>
              </>
            ) : (
              /* Result State: Generated Link Display & 4 Growth Action Buttons */
              <div className="space-y-4 text-center py-1 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="font-bengali font-bold text-base text-neutral-900">
                    লিংক তৈরি সম্পন্ন হয়েছে!
                  </h4>
                  <p className="text-xs font-bengali text-neutral-500 mt-0.5">
                    {expiration === 'never'
                      ? 'লিংকটি স্থায়ীভাবে সক্রিয় থাকবে'
                      : `চিঠির মেয়াদ: ${expiration === '24h' ? '২৪ ঘণ্টা' : '৭ দিন'}`}
                  </p>
                </div>

                {/* Link Box with Copy Button */}
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-neutral-800 truncate select-all">
                    {generatedUrl}
                  </span>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-3 py-1.5 rounded-xl font-bengali text-xs font-semibold shrink-0 transition-all flex items-center gap-1 ${
                      copied
                        ? 'bg-emerald-600 text-white shadow-emerald-200'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-500" />
                        <span>লিংক কপি</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 4 Growth Share & Download Buttons (WhatsApp, Facebook, Image Download, Read View) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* WhatsApp Share */}
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="py-2.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>হোয়াটসঅ্যাপ</span>
                  </button>

                  {/* Facebook Share */}
                  <button
                    type="button"
                    onClick={handleFacebookShare}
                    className="py-2.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-[#1877F2] hover:bg-[#166fe5] text-white flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>ফেসবুক শেয়ার</span>
                  </button>

                  {/* Download Image Card */}
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    className="py-2.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                    <span>ইমেজ ডাউনলোড</span>
                  </button>

                  {/* Open Reader Page */}
                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>চিঠিটি দেখুন</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Studio Modal for Image Download */}
      {showStudio && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="my-auto w-full">
            <VintageLetterVisualStudio
              letter={letter}
              receiverName={receiverName}
              relationship={relationship}
              onClose={() => setShowStudio(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
