'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Heart, Mail, ArrowRight, Check, Feather } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/components/providers/LanguageProvider'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const { t, locale } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (!email || !email.includes('@')) {
      setError(locale === 'en' ? 'Please provide a valid email address.' : 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন')
      return
    }

    setLoading(true)
    const res = await resetPassword(email.trim())
    setLoading(false)

    if (!res.success) {
      setError(res.error || (locale === 'en' ? 'Failed to send reset link. Please try again.' : 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'))
      return
    }

    setSuccess(true)
  }

  return (
    <main className="min-h-screen bg-chithi-gradient flex items-center justify-center p-4 sm:p-6 selection:bg-rose-100 selection:text-rose-800">
      <div className="w-full max-w-md space-y-6 animate-in fade-in-50 duration-500">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-400 via-pink-400 to-amber-300 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Heart className="w-6 h-6 fill-white" />
            </div>
          </Link>
          <h1 className="font-bengali text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {t('auth.resetTitle')}
          </h1>
          <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            {t('auth.resetSubtitle')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-rose-100/90 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          {!success ? (
            <>
              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-bengali p-3 rounded-xl"
                >
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950 outline-none text-sm font-sans bg-neutral-50/40 dark:bg-neutral-800/80 focus:bg-white dark:focus:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-all min-h-[44px]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-xl font-bengali font-semibold text-sm text-white transition-all shadow-xs flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                    loading
                      ? 'bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] glow-pink'
                  }`}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t('auth.sendResetBtn')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-bengali font-bold text-base text-neutral-900 dark:text-neutral-100">
                {locale === 'en' ? 'Email Sent!' : 'ইমেইল পাঠানো হয়েছে!'}
              </h3>
              <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-sm mx-auto">
                {locale === 'en' ? (
                  <>Password reset instructions have been sent to <span className="font-semibold text-neutral-800 dark:text-neutral-200">{email}</span>. Please check your inbox.</>
                ) : (
                  <><span className="font-semibold text-neutral-800 dark:text-neutral-200">{email}</span> ঠিকানায় পাসওয়ার্ড রিসেটের নির্দেশনা পাঠানো হয়েছে। আপনার ইনবক্স চেক করুন।</>
                )}
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors shadow-2xs min-h-[44px]"
                >
                  <span>{t('auth.loginBtn')}</span>
                </Link>
              </div>
            </div>
          )}

          <div className="text-center pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <Link href="/login" className="text-xs font-bengali text-rose-600 dark:text-rose-400 font-semibold hover:underline py-1 inline-block">
              ← {t('auth.loginBtn')}
            </Link>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bengali text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors py-2"
          >
            <Feather className="w-3.5 h-3.5" />
            <span>{t('auth.backHome')}</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
