'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Lock, Mail, User, ArrowRight, Feather } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/components/providers/LanguageProvider'

export default function SignupPage() {
  const router = useRouter()
  const { signUp, isConfigured } = useAuth()
  const { t, locale } = useLanguage()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // OTP Verification Step
  const [isOtpStep, setIsOtpStep] = useState(false)
  const [otpToken, setOtpToken] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Countdown timer for resend OTP
  React.useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleResendOtp = async () => {
    if (resendLoading || resendCooldown > 0) return
    setError(null)
    setResendLoading(true)
    try {
      const { signInWithOtp } = await import('@/lib/auth')
      const res = await signInWithOtp(email)
      if (res.success) {
        setOtpSuccess(
          locale === 'en'
            ? 'A fresh verification code has been sent to your email.'
            : 'আপনার ইমেইলে নতুন ভেরিফিকেশন কোড পাঠানো হয়েছে।'
        )
        setResendCooldown(60)
      } else {
        setError(res.error || (locale === 'en' ? 'Failed to resend code' : 'কোড পুনরায় পাঠানো যায়নি'))
      }
    } catch {
      setError(locale === 'en' ? 'Failed to resend code' : 'কোড পুনরায় পাঠানো যায়নি')
    } finally {
      setResendLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (!email || !password) {
      setError(t('auth.emailPasswordRequired'))
      return
    }

    if (password.length < 6) {
      setError(t('auth.passwordMin'))
      return
    }

    setLoading(true)
    const { user, error: authError } = await signUp(email, password, name.trim())
    setLoading(false)

    if (authError) {
      setError(authError)
      return
    }

    if (user) {
      // If user session exists immediately, navigate to dashboard
      router.push('/dashboard')
      router.refresh()
    } else {
      // Email confirmation / OTP was sent
      setIsOtpStep(true)
      setOtpSuccess(t('auth.otpSubtitle'))
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpLoading) return
    setError(null)
    if (!otpToken || otpToken.length < 6) {
      setError(
        locale === 'en'
          ? 'Please enter the 6-digit code'
          : 'অনুগ্রহ করে ৬-সংখ্যার কোডটি প্রদান করুন'
      )
      return
    }

    setOtpLoading(true)
    const { verifyOtp } = await import('@/lib/auth')
    const res = await verifyOtp(email, otpToken.trim(), 'signup')
    setOtpLoading(false)

    if (res.user) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setError(
        res.error ||
          (locale === 'en'
            ? 'Failed to verify code. Please try again.'
            : 'কোড যাচাই করা সম্ভব হয়নি। আবার চেষ্টা করুন।')
      )
    }
  }

  return (
    <main className="min-h-screen bg-chithi-gradient flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6 animate-in fade-in-50 duration-500">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-400 via-pink-400 to-amber-300 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Heart className="w-6 h-6 fill-white" />
            </div>
          </Link>
          <h1 className="font-bengali text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {isOtpStep ? t('auth.otpTitle') : t('auth.signupTitle')}
          </h1>
          <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            {isOtpStep ? (otpSuccess || t('auth.otpSubtitle')) : t('auth.signupSubtitle')}
          </p>
        </div>

        {/* Signup / OTP Card */}
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-rose-100/90 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          {!isConfigured && (
            <div
              role="alert"
              className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs font-bengali p-3.5 rounded-xl flex items-center gap-2"
            >
              <span className="text-sm">⚠️</span>
              <span>
                {locale === 'en'
                  ? 'System setup is not complete. Please try again shortly.'
                  : 'সিস্টেম সেটআপ সম্পূর্ণ হয়নি। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।'}
              </span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-bengali p-3 rounded-xl"
            >
              ⚠️ {error}
            </div>
          )}

          {isOtpStep ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-otp"
                  className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  {t('auth.otpTitle')}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-otp"
                    type="text"
                    required
                    maxLength={8}
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950 outline-none text-center font-mono tracking-widest text-lg bg-neutral-50/40 dark:bg-neutral-800/80 focus:bg-white dark:focus:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className={`w-full py-3 px-4 rounded-xl font-bengali font-semibold text-sm text-white transition-all shadow-xs flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                  otpLoading
                    ? 'bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] glow-pink'
                }`}
              >
                {otpLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t('auth.verifyBtn')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsOtpStep(false)}
                  className="text-xs font-bengali text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  ← {t('auth.signupTitle')}
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading || resendCooldown > 0}
                  className={`text-xs font-bengali transition-colors cursor-pointer ${
                    resendCooldown > 0 || resendLoading
                      ? 'text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                      : 'text-rose-600 dark:text-rose-400 hover:underline'
                  }`}
                >
                  {resendLoading
                    ? (locale === 'en' ? 'Sending...' : 'পাঠানো হচ্ছে...')
                    : resendCooldown > 0
                    ? (locale === 'en' ? `Resend code (${resendCooldown}s)` : `পুনরায় পাঠান (${resendCooldown} সে.)`)
                    : (locale === 'en' ? 'Resend code' : 'পুনরায় কোড পাঠান')}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-name"
                  className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  {t('auth.name')}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('auth.namePlaceholder')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950 outline-none text-sm font-bengali bg-neutral-50/40 dark:bg-neutral-800/80 focus:bg-white dark:focus:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  {t('auth.email')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950 outline-none text-sm font-sans bg-neutral-50/40 dark:bg-neutral-800/80 focus:bg-white dark:focus:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  {t('auth.password')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordMin')}
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
                    <span>{t('auth.signupBtn')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center pt-2">
            <p className="text-xs font-bengali text-neutral-500 dark:text-neutral-400">
              {t('auth.hasAccount')}{' '}
              <Link href="/login" className="text-rose-600 dark:text-rose-400 font-semibold hover:underline">
                {t('auth.loginLink')}
              </Link>
            </p>
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
