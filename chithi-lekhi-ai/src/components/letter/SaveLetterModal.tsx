'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Heart,
  Lock,
  Globe,
  X,
  Check,
  Copy,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface SaveLetterModalProps {
  letter: string
  receiverName: string
  relationship?: string
  emotion?: string
  personality?: string
  eraStyle?: string
  language?: string
  letterId?: string
  onClose: () => void
  onSaved?: (savedId: string, isPublic: boolean) => void
}

export function SaveLetterModal({
  letter,
  receiverName,
  relationship,
  emotion,
  personality,
  eraStyle,
  language,
  letterId,
  onClose,
  onSaved,
}: SaveLetterModalProps) {
  const { user } = useAuth()
  const [saveMode, setSaveMode] = useState<'private' | 'share'>('private')
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMsg(null)

    try {
      const isPublic = saveMode === 'share'

      // 1. Save or update letter in database
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: letterId,
          user_id: user?.id || null,
          title: `চিঠি — প্রিয় ${receiverName}-এর জন্য`,
          receiver_name: receiverName,
          relationship,
          emotion,
          personality,
          era_style: eraStyle,
          language: language || 'bengali',
          content: letter,
          letter_content: letter,
          theme: 'vintage',
          is_public: isPublic,
          is_favorite: false,
          status: 'published',
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'চিঠি সংরক্ষণ করতে সমস্যা হয়েছে')
      }

      const activeLetterId = data.letter?.id || letterId

      // 2. If Save & Share mode, also generate public share link
      if (isPublic && activeLetterId) {
        const shareRes = await fetch('/api/shares', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            letter_id: activeLetterId,
            is_public: true,
            expiration: 'never',
          }),
        })
        const shareData = await shareRes.json()
        if (shareData.success && shareData.shareUrl) {
          setShareUrl(shareData.shareUrl)
        }
      }

      setSavedSuccess(true)
      if (onSaved && activeLetterId) {
        onSaved(activeLetterId, isPublic)
      }
    } catch (err: unknown) {
      console.error('Failed to save letter:', err)
      setErrorMsg(err instanceof Error ? err.message : 'চিঠি সংরক্ষণ করা যায়নি')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="my-auto w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-2xs">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h3 className="font-bengali font-bold text-base text-neutral-900 leading-tight">
                Save Letter ❤️ (চিঠি সংরক্ষণ করুন)
              </h3>
              <p className="text-[11px] font-bengali text-neutral-500">
                চিঠিটি আপনার ব্যক্তিগত স্মৃতি ভল্ট বা ড্যাশবোর্ডে সংরক্ষণ করুন
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {!savedSuccess ? (
            <>
              {/* Option 1 & 2 Choice Cards */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bengali font-bold text-neutral-700">
                  সংরক্ষণের ধরন বেছে নিন:
                </label>

                {/* Option 1: Save as private */}
                <button
                  type="button"
                  onClick={() => setSaveMode('private')}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                    saveMode === 'private'
                      ? 'border-rose-400 bg-rose-50/70 text-rose-950 shadow-xs ring-2 ring-rose-200/50'
                      : 'border-neutral-200 bg-neutral-50/40 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali font-bold text-sm">Save as private (ব্যক্তিগত হিসেবে সংরক্ষণ)</h4>
                    <p className="font-bengali text-xs text-neutral-500 mt-0.5 leading-relaxed">
                      চিঠিটি শুধুমাত্র আপনার ব্যক্তিগত ড্যাশবোর্ডে সংরক্ষিত থাকবে। অন্য কেউ এটি দেখতে পারবে না।
                    </p>
                  </div>
                </button>

                {/* Option 2: Save and share */}
                <button
                  type="button"
                  onClick={() => setSaveMode('share')}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                    saveMode === 'share'
                      ? 'border-rose-400 bg-rose-50/70 text-rose-950 shadow-xs ring-2 ring-rose-200/50'
                      : 'border-neutral-200 bg-neutral-50/40 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali font-bold text-sm">Save and share (সংরক্ষণ ও শেয়ার লিংক তৈরি)</h4>
                    <p className="font-bengali text-xs text-neutral-500 mt-0.5 leading-relaxed">
                      ড্যাশবোর্ডে সংরক্ষণের সাথে সাথে চিঠিটির একটি সুন্দর অনলাইন পাবলিক রিডিং লিংক তৈরি হবে।
                    </p>
                  </div>
                </button>
              </div>

              {/* Guest hint */}
              {!user && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2 text-xs font-bengali text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    আপনি অতিথি হিসেবে সংরক্ষণ করতে পারবেন। আজীবনের জন্য সুরক্ষিত রাখতে পরে একটি{' '}
                    <Link href="/signup" className="underline font-semibold">
                      একাউন্ট খুলুন
                    </Link>
                    ।
                  </span>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs font-bengali text-red-600 text-center bg-red-50 p-2 rounded-xl">
                  {errorMsg}
                </p>
              )}

              {/* Save Button */}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bengali text-sm font-semibold text-white shadow-xs transition-all flex items-center justify-center gap-2 ${
                  isSaving
                    ? 'bg-neutral-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] glow-pink'
                }`}
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Heart className="w-4 h-4 fill-white" />
                )}
                <span>
                  {isSaving
                    ? 'সংরক্ষণ করা হচ্ছে...'
                    : saveMode === 'private'
                    ? 'ব্যক্তিগতভাবে সংরক্ষণ করুন'
                    : 'সংরক্ষণ ও শেয়ার লিংক তৈরি'}
                </span>
              </button>
            </>
          ) : (
            /* Success State */
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-bengali font-bold text-base text-neutral-900">
                  চিঠি সফলভাবে সংরক্ষিত হয়েছে ❤️
                </h4>
                <p className="text-xs font-bengali text-neutral-500 mt-1">
                  {saveMode === 'private'
                    ? 'আপনার চিঠিটি ড্যাশবোর্ডে সুরক্ষিত আছে।'
                    : 'চিঠিটি সংরক্ষিত হয়েছে এবং পড়ার লিংক তৈরি হয়েছে:'}
                </p>
              </div>

              {/* Share URL if share mode */}
              {shareUrl && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-neutral-800 truncate select-all">
                    {shareUrl}
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3 py-1.5 rounded-xl font-bengali text-xs font-semibold shrink-0 transition-all flex items-center gap-1 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-white" />
                        <span>কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-neutral-500" />
                        <span>কপি</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  href="/dashboard"
                  onClick={onClose}
                  className="py-2.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>ড্যাশবোর্ডে দেখুন</span>
                </Link>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center transition-colors"
                >
                  <span>সম্পন্ন</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
