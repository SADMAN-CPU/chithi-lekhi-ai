'use client'

import React, { useState, useRef, useEffect } from 'react'
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
import { useLanguage } from '@/components/providers/LanguageProvider'

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
  const { locale } = useLanguage()
  const [saveMode, setSaveMode] = useState<'private' | 'share'>('private')
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const handleSave = async () => {
    if (isSaving) return
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
        throw new Error(data.error?.message || (locale === 'en' ? 'Failed to save letter' : 'চিঠি সংরক্ষণ করতে সমস্যা হয়েছে'))
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
      setErrorMsg(err instanceof Error ? err.message : (locale === 'en' ? 'Could not save letter' : 'চিঠি সংরক্ষণ করা যায়নি'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="my-auto w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-rose-100 dark:border-neutral-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-rose-50/50 dark:bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-2xs">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h3 className="font-bengali font-bold text-base text-neutral-900 dark:text-neutral-100 leading-tight">
                {locale === 'en' ? 'Save Letter ❤️' : 'চিঠি সংরক্ষণ করুন ❤️'}
              </h3>
              <p className="text-[11px] font-bengali text-neutral-500 dark:text-neutral-400">
                {locale === 'en'
                  ? 'Save this letter to your private dashboard or memory vault'
                  : 'চিঠিটি আপনার ব্যক্তিগত স্মৃতি ভল্ট বা ড্যাশবোর্ডে সংরক্ষণ করুন'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
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
                <label className="block text-xs font-bengali font-bold text-neutral-700 dark:text-neutral-300">
                  {locale === 'en' ? 'Choose save option:' : 'সংরক্ষণের ধরন বেছে নিন:'}
                </label>

                {/* Option 1: Save as private */}
                <button
                  type="button"
                  onClick={() => setSaveMode('private')}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all min-h-[44px] cursor-pointer ${
                    saveMode === 'private'
                      ? 'border-rose-400 dark:border-rose-700 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 shadow-xs ring-2 ring-rose-200/50 dark:ring-rose-900/50'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali font-bold text-sm">
                      {locale === 'en' ? 'Save as private' : 'Save as private (ব্যক্তিগত হিসেবে সংরক্ষণ)'}
                    </h4>
                    <p className="font-bengali text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      {locale === 'en'
                        ? 'The letter will be kept strictly in your private dashboard. No one else can view it.'
                        : 'চিঠিটি শুধুমাত্র আপনার ব্যক্তিগত ড্যাশবোর্ডে সংরক্ষিত থাকবে। অন্য কেউ এটি দেখতে পারবে না।'}
                    </p>
                  </div>
                </button>

                {/* Option 2: Save and share */}
                <button
                  type="button"
                  onClick={() => setSaveMode('share')}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all min-h-[44px] cursor-pointer ${
                    saveMode === 'share'
                      ? 'border-rose-400 dark:border-rose-700 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 shadow-xs ring-2 ring-rose-200/50 dark:ring-rose-900/50'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bengali font-bold text-sm">
                      {locale === 'en' ? 'Save and share' : 'Save and share (সংরক্ষণ ও শেয়ার লিংক তৈরি)'}
                    </h4>
                    <p className="font-bengali text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      {locale === 'en'
                        ? 'Saves to your dashboard and automatically generates a beautiful public reading link.'
                        : 'ড্যাশবোর্ডে সংরক্ষণের সাথে সাথে চিঠিটির একটি সুন্দর অনলাইন পাবলিক রিডিং লিংক তৈরি হবে।'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Guest hint */}
              {!user && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-xl p-3 flex items-start gap-2 text-xs font-bengali text-amber-900 dark:text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    {locale === 'en' ? (
                      <>
                        You can save as a guest. To keep it safe forever, you can{' '}
                        <Link href="/signup" className="underline font-semibold">
                          create a free account
                        </Link>
                        .
                      </>
                    ) : (
                      <>
                        আপনি অতিথি হিসেবে সংরক্ষণ করতে পারবেন। আজীবনের জন্য সুরক্ষিত রাখতে পরে একটি{' '}
                        <Link href="/signup" className="underline font-semibold">
                          একাউন্ট খুলুন
                        </Link>
                        ।
                      </>
                    )}
                  </span>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs font-bengali text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-2 rounded-xl">
                  {errorMsg}
                </p>
              )}

              {/* Save Button */}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bengali text-sm font-semibold text-white shadow-xs transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                  isSaving
                    ? 'bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed'
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
                    ? (locale === 'en' ? 'Saving...' : 'সংরক্ষণ করা হচ্ছে...')
                    : saveMode === 'private'
                    ? (locale === 'en' ? 'Save Privately' : 'ব্যক্তিগতভাবে সংরক্ষণ করুন')
                    : (locale === 'en' ? 'Save & Create Link' : 'সংরক্ষণ ও শেয়ার লিংক তৈরি')}
                </span>
              </button>
            </>
          ) : (
            /* Success State */
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-bengali font-bold text-base text-neutral-900 dark:text-neutral-100">
                  {locale === 'en' ? 'Letter Saved Successfully ❤️' : 'চিঠি সফলভাবে সংরক্ষিত হয়েছে ❤️'}
                </h4>
                <p className="text-xs font-bengali text-neutral-500 dark:text-neutral-400 mt-1">
                  {saveMode === 'private'
                    ? (locale === 'en' ? 'Your letter is safely stored in your dashboard.' : 'আপনার চিঠিটি ড্যাশবোর্ডে সুরক্ষিত আছে।')
                    : (locale === 'en' ? 'Letter saved and shareable link created:' : 'চিঠিটি সংরক্ষিত হয়েছে এবং পড়ার লিংক তৈরি হয়েছে:')}
                </p>
              </div>

              {/* Share URL if share mode */}
              {shareUrl && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-neutral-800 dark:text-neutral-200 truncate select-all">
                    {shareUrl}
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3 py-1.5 rounded-xl font-bengali text-xs font-semibold shrink-0 transition-all flex items-center gap-1 min-h-[40px] cursor-pointer ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-white" />
                        <span>{locale === 'en' ? 'Copied' : 'কপি হয়েছে'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                        <span>{locale === 'en' ? 'Copy' : 'কপি'}</span>
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
                  className="py-2.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
                >
                  <span>{locale === 'en' ? 'View Dashboard' : 'ড্যাশবোর্ডে দেখুন'}</span>
                </Link>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white flex items-center justify-center transition-colors min-h-[44px] cursor-pointer"
                >
                  <span>{locale === 'en' ? 'Done' : 'সম্পন্ন'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
