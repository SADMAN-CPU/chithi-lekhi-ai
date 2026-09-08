'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Heart, Lock, Mail, ArrowRight, Feather } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/components/providers/LanguageProvider'

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get('redirectedFrom') || '/dashboard'
  const isPasswordResetRedirect = searchParams.get('passwordReset') === 'true'
  const callbackError = searchParams.get('error')

  const { signIn, isConfigured } = useAuth()
  const { t, locale } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    callbackError === 'auth-callback-failed'
      ? (locale === 'en'
          ? 'Verification link expired or invalid. Please try again.'
          : 'ভেরিফিকেশন লিংকটির মেয়াদ শেষ হয়েছে বা কোডটি অকার্যকর। অনুগ্রহ করে আবার চেষ্টা করুন।')
      : null
  )

  // If user arrives via old reset link, redirect to dedicated reset page
  React.useEffect(() => {
    if (isPasswordResetRedirect) {
      router.replace('/reset-password')
    }
  }, [isPasswordResetRedirect, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (!email || !password) {
      setError(t('auth.emailPasswordRequired'))
      return
    }

    setLoading(true)
    const { user, error: authError } = await signIn(email, password)
    setLoading(false)

    if (authError || !user) {
      setError(
        authError ||
          (locale === 'en'
            ? 'Failed to sign in. Please verify your credentials.'
            : 'সাইন ইন ব্যর্থ হয়েছে। অনুগ্রহ করে তথ্য যাচাই করুন।')
      )
      return
    }

    if (user.role === 'admin') {
      router.push('/admin')
    } else {
      router.push(redirectedFrom)
    }
    router.refresh()
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
            {t('auth.loginTitle')}
          </h1>
          <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Auth Card */}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
              >
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
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
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  {t('auth.password')}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-bengali text-rose-600 dark:text-rose-400 hover:underline"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                  <span>{t('auth.loginBtn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs font-bengali text-neutral-500 dark:text-neutral-400">
              {t('auth.noAccount')}{' '}
              <Link href="/signup" className="text-rose-600 dark:text-rose-400 font-semibold hover:underline">
                {t('auth.signupLink')}
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-chithi-gradient flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  )
}
