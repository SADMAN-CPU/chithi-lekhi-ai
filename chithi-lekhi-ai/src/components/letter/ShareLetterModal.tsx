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
  Mail,
  Smartphone,
  MessageCircle,
  Send,
} from 'lucide-react'
import type { ShareExpiration } from '@/lib/shares'
import { shareLetter } from '@/lib/share-engine'
import dynamic from 'next/dynamic'
import { useLanguage } from '@/components/providers/LanguageProvider'

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
  const { t, locale } = useLanguage()

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

  // Share feedback
  const [shareStatus, setShareStatus] = useState<{ platform: string; msg: string } | null>(null)

  // Track analytics event helper
  const trackShare = async (platform: string, eventType: 'share' | 'download' = 'share') => {
    if (!shareToken) return
    try {
      await fetch('/api/shares/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken, eventType, platform }),
      })
    } catch {
      // Non-blocking
    }
  }

  const handleGenerateLink = async () => {
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter_id: letterId || `local-${Date.now()}`,
          letter_content: letter,
          receiver_name: receiverName,
          relationship: relationship || null,
          era_style: _eraStyle || 'vintage',
          is_public: isPublic,
          expiration,
        }),
      })

      const data = await res.json()
      if (data.success && data.shareUrl) {
        setGeneratedUrl(data.shareUrl)
        setShareToken(data.shareToken)
      } else {
        setErrorMessage(
          data.error?.message ||
            (locale === 'en'
              ? 'Could not generate share link. Please try again.'
              : 'শেয়ার লিংক তৈরি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।')
        )
      }
    } catch (err) {
      console.error('Failed to generate share link:', err)
      setErrorMessage(
        locale === 'en'
          ? 'Network error while generating link. Please try again.'
          : 'লিংক তৈরিতে নেটওয়ার্ক সমস্যা হয়েছে। আবার চেষ্টা করুন।'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // ── Unified share handlers (all via shareLetter()) ────────────────────────

  const handleCopy = async () => {
    if (!generatedUrl) return
    const result = await shareLetter({
      platform: 'copy',
      shareUrl: generatedUrl,
      letterText: letter,
      receiverName,
    })
    if (result.success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      trackShare('copy_link')
    }
  }

  const handleWhatsAppShare = async () => {
    if (!generatedUrl) return
    trackShare('whatsapp')
    await shareLetter({
      platform: 'whatsapp',
      shareUrl: generatedUrl,
      letterText: letter,
      receiverName,
    })
    setShareStatus({ platform: 'whatsapp', msg: 'হোয়াটসঅ্যাপ খুলছে...' })
    setTimeout(() => setShareStatus(null), 2500)
  }

  const handleFacebookShare = async () => {
    if (!generatedUrl) return
    trackShare('facebook')
    await shareLetter({
      platform: 'facebook',
      shareUrl: generatedUrl,
      letterText: letter,
      receiverName,
    })
    setShareStatus({ platform: 'facebook', msg: 'ফেসবুক শেয়ার খুলছে...' })
    setTimeout(() => setShareStatus(null), 2500)
  }

  const handleMessengerShare = async () => {
    if (!generatedUrl) return
    trackShare('messenger')
    await shareLetter({
      platform: 'messenger',
      shareUrl: generatedUrl,
      letterText: letter,
      receiverName,
    })
    setShareStatus({ platform: 'messenger', msg: 'মেসেঞ্জার খুলছে...' })
    setTimeout(() => setShareStatus(null), 2500)
  }

  const handleTelegramShare = async () => {
    if (!generatedUrl) return
    trackShare('telegram')
    await shareLetter({
      platform: 'telegram',
      shareUrl: generatedUrl,
      letterText: letter,
      receiverName,
    })
    setShareStatus({ platform: 'telegram', msg: 'টেলিগ্রাম খুলছে...' })
    setTimeout(() => setShareStatus(null), 2500)
  }

  const handleLinkedInShare = async () => {
    if (!generatedUrl) return
    trackShare('linkedin')
    await shareLetter({
      platform: 'linkedin',
      shareUrl: generatedUrl,
      letterText: letter,
      receiverName,
    })
    setShareStatus({ platform: 'linkedin', msg: 'লিঙ্কডইন খুলছে...' })
    setTimeout(() => setShareStatus(null), 2500)
  }

  const handleEmailShare = async () => {
    if (!generatedUrl) return
    trackShare('email')
    const result = await shareLetter({
      platform: 'email',
      shareUrl: generatedUrl,
      letterText: letter,
      receiverName,
    })
    setShareStatus({ platform: 'email', msg: result.message })
    setTimeout(() => setShareStatus(null), 2500)
  }

  const handleNativeShare = async () => {
    if (!generatedUrl) return
    trackShare('native')
    const result = await shareLetter({
      platform: 'native',
      shareUrl: generatedUrl,
      letterText: letter,
      receiverName,
    })
    setShareStatus({ platform: 'native', msg: result.message })
    setTimeout(() => setShareStatus(null), 2500)
  }

  const handleDownloadImage = () => {
    trackShare('image', 'download')
    setShowStudio(true)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
        <div className="my-auto w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-rose-100 dark:border-neutral-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-rose-50/40 dark:bg-neutral-900/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
                <LinkIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bengali font-bold text-base text-neutral-900 dark:text-neutral-100 leading-tight">
                  {t('shareModal.title')}
                </h3>
                <p className="text-[11px] font-bengali text-neutral-500 dark:text-neutral-400">
                  {t('shareModal.subtitle')}
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

          {/* Modal Body */}
          <div className="p-6 space-y-5">
            {!generatedUrl ? (
              <>
                {/* 1. Privacy Mode */}
                <div className="space-y-2">
                  <label className="block text-xs font-bengali font-bold text-neutral-700 dark:text-neutral-300">
                    {t('shareModal.privacyLabel')}
                  </label>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all text-xs font-bengali min-h-[44px] cursor-pointer ${
                        isPublic
                          ? 'border-rose-400 dark:border-rose-700 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Globe className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold block">{t('shareModal.privacyPublic')}</span>
                        <span className="text-[11px] opacity-75">{t('shareModal.privacyPublicDesc')}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all text-xs font-bengali min-h-[44px] cursor-pointer ${
                        !isPublic
                          ? 'border-rose-400 dark:border-rose-700 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold block">{t('shareModal.privacyPrivate')}</span>
                        <span className="text-[11px] opacity-75">{t('shareModal.privacyPrivateDesc')}</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Expiration */}
                <div className="space-y-2">
                  <label className="block text-xs font-bengali font-bold text-neutral-700 dark:text-neutral-300">
                    {t('shareModal.expirationLabel')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: '24h', label: t('shareModal.exp24h'), desc: '24h' },
                        { id: '7d', label: t('shareModal.exp7d'), desc: '7d' },
                        { id: 'never', label: t('shareModal.expNever'), desc: 'Permanent' },
                      ] as const
                    ).map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => setExpiration(exp.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all text-xs font-bengali min-h-[44px] cursor-pointer ${
                          expiration === exp.id
                            ? 'border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold shadow-xs'
                            : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 mx-auto mb-1 opacity-75" />
                        <span className="block">{exp.label}</span>
                        <span className="text-[10px] opacity-60 font-sans">{exp.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-xs font-bengali text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-2 rounded-xl">
                    {errorMessage}
                  </p>
                )}

                {/* Generate Button */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGenerateLink}
                  className={`w-full py-3 rounded-xl font-bengali text-sm font-semibold text-white shadow-xs transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                    isLoading
                      ? 'bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] glow-pink'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isLoading ? t('shareModal.generatingBtn') : t('shareModal.generateBtn')}</span>
                </button>
              </>
            ) : (
              /* Result: Generated Link + Unified Share Buttons */
              <div className="space-y-4 text-center py-1 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="font-bengali font-bold text-base text-neutral-900 dark:text-neutral-100">
                    {t('shareModal.successTitle')}
                  </h4>
                  <p className="text-xs font-bengali text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {expiration === 'never'
                      ? t('shareModal.expForever')
                      : `${t('shareModal.expExpiresIn')} ${expiration === '24h' ? t('shareModal.exp24h') : t('shareModal.exp7d')}`}
                  </p>
                </div>

                {/* Link Box */}
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-neutral-800 dark:text-neutral-200 truncate select-all">
                    {generatedUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-3 py-1.5 rounded-xl font-bengali text-xs font-semibold shrink-0 transition-all flex items-center gap-1 min-h-[40px] cursor-pointer ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>{t('shareModal.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                        <span>{t('shareModal.copyLink')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Share Status Feedback */}
                {shareStatus && (
                  <p className="text-xs font-bengali text-rose-600 dark:text-rose-400 font-semibold animate-in fade-in duration-200">
                    {shareStatus.msg}
                  </p>
                )}

                {/* Share Buttons — 8 platforms grid */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-4 gap-2">
                    {/* WhatsApp */}
                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="p-2 rounded-xl font-bengali text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-xs min-h-[44px] cursor-pointer"
                      title={t('shareModal.whatsapp')}
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="text-[11px]">{t('shareModal.whatsapp')}</span>
                    </button>

                    {/* Messenger */}
                    <button
                      type="button"
                      onClick={handleMessengerShare}
                      className="p-2 rounded-xl font-bengali text-xs font-semibold bg-[#0084FF] hover:bg-[#0073e6] text-white flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-xs min-h-[44px] cursor-pointer"
                      title={t('shareModal.messenger')}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-[11px]">{t('shareModal.messenger')}</span>
                    </button>

                    {/* Telegram */}
                    <button
                      type="button"
                      onClick={handleTelegramShare}
                      className="p-2 rounded-xl font-bengali text-xs font-semibold bg-[#229ED9] hover:bg-[#1f8ec4] text-white flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-xs min-h-[44px] cursor-pointer"
                      title={t('shareModal.telegram')}
                    >
                      <Send className="w-4 h-4" />
                      <span className="text-[11px]">{t('shareModal.telegram')}</span>
                    </button>

                    {/* Facebook */}
                    <button
                      type="button"
                      onClick={handleFacebookShare}
                      className="p-2 rounded-xl font-bengali text-xs font-semibold bg-[#1877F2] hover:bg-[#166fe5] text-white flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-xs min-h-[44px] cursor-pointer"
                      title={t('shareModal.facebook')}
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="text-[11px]">{t('shareModal.facebook')}</span>
                    </button>

                    {/* Email */}
                    <button
                      type="button"
                      onClick={handleEmailShare}
                      className="p-2 rounded-xl font-bengali text-xs font-semibold bg-[#EA4335] hover:bg-[#d33828] text-white flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-xs min-h-[44px] cursor-pointer"
                      title={t('shareModal.email')}
                    >
                      <Mail className="w-4 h-4" />
                      <span className="text-[11px]">{t('shareModal.email')}</span>
                    </button>

                    {/* LinkedIn */}
                    <button
                      type="button"
                      onClick={handleLinkedInShare}
                      className="p-2 rounded-xl font-bengali text-xs font-semibold bg-[#0A66C2] hover:bg-[#084e96] text-white flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-xs min-h-[44px] cursor-pointer"
                      title={t('shareModal.linkedin')}
                    >
                      <Globe className="w-4 h-4" />
                      <span className="text-[11px]">{t('shareModal.linkedin')}</span>
                    </button>

                    {/* Native Share */}
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="p-2 rounded-xl font-bengali text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-xs min-h-[44px] cursor-pointer"
                      title={t('shareModal.mobile')}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span className="text-[11px]">{t('shareModal.mobile')}</span>
                    </button>

                    {/* Copy Link */}
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-2 rounded-xl font-bengali text-xs font-semibold bg-neutral-800 hover:bg-neutral-900 text-white flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-xs min-h-[44px] cursor-pointer"
                      title={t('shareModal.copyLink')}
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span className="text-[11px]">{copied ? t('shareModal.copied') : t('shareModal.copyLink')}</span>
                    </button>
                  </div>

                  {/* Actions: Image Card & View Letter */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      className="py-2.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center gap-1.5 transition-colors min-h-[44px] cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{t('shareModal.downloadCard')}</span>
                    </button>

                    <a
                      href={generatedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl font-bengali text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center gap-1.5 transition-colors min-h-[44px] cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t('shareModal.viewOnline')}</span>
                    </a>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Studio Modal for Image Download */}
      {showStudio && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="my-auto w-full">
            <VintageLetterVisualStudio
              letter={letter}
              receiverName={receiverName}
              relationship={relationship}
              shareUrl={generatedUrl || undefined}
              onClose={() => setShowStudio(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
