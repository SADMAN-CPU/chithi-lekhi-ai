'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Lock, Eye, EyeOff, Check, ArrowRight, KeyRound, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/components/providers/LanguageProvider'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { updatePassword, isConfigured } = useAuth()
  const { locale } = useLanguage()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password || password.length < 6) {
      setError(
        locale === 'en'
          ? 'Password must be at least 6 characters long.'
          : 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
      )
      return
    }

    if (password !== confirmPassword) {
      setError(
        locale === 'en'
          ? 'Passwords do not match. Please recheck.'
          : 'উভয় পাসওয়ার্ড মেলেনি। অনুগ্রহ করে আবার পরীক্ষা করুন।'
      )
      return
    }

    setSubmitting(true)
    const res = await updatePassword(password)
    setSubmitting(false)

    if (!res.success) {
      setError(
        res.error ||
          (locale === 'en'
            ? 'Failed to update password. Your reset link may have expired.'
            : 'পাসওয়ার্ড আপডেট করা সম্ভব হয়নি। লিংকটির মেয়াদ শেষ হয়ে থাকতে পারে।')
      )
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/dashboard')
    }, 2500)
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
            {locale === 'en' ? 'Set New Password' : 'নতুন পাসওয়ার্ড নির্ধারণ করুন'}
          </h1>
          <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            {locale === 'en'
              ? 'Enter your new secure password below.'
              : 'আপনার অ্যাকাউন্টের জন্য নতুন ও শক্তিশালী পাসওয়ার্ড লিখুন।'}
          </p>
        </div>

        {/* Card */}
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
              className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-bengali p-3.5 rounded-xl flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  {locale === 'en' ? 'New Password' : 'নতুন পাসওয়ার্ড'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950 outline-none text-sm font-sans bg-neutral-50/40 dark:bg-neutral-800/80 focus:bg-white dark:focus:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-all min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  {locale === 'en' ? 'Confirm New Password' : 'পাসওয়ার্ড নিশ্চিত করুন'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950 outline-none text-sm font-sans bg-neutral-50/40 dark:bg-neutral-800/80 focus:bg-white dark:focus:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 px-4 rounded-xl font-bengali font-semibold text-sm text-white transition-all shadow-xs flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                  submitting
                    ? 'bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] glow-pink'
                }`}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{locale === 'en' ? 'Update Password' : 'পাসওয়ার্ড সংরক্ষণ করুন'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-bengali font-bold text-base text-neutral-900 dark:text-neutral-100">
                {locale === 'en' ? 'Password Updated Successfully!' : 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!'}
              </h3>
              <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-sm mx-auto">
                {locale === 'en'
                  ? 'Your password has been changed. Redirecting to your dashboard...'
                  : 'আপনার নতুন পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে। ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...'}
              </p>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors shadow-2xs min-h-[44px]"
                >
                  <span>{locale === 'en' ? 'Go to Dashboard' : 'ড্যাশবোর্ডে যান'}</span>
                </Link>
              </div>
            </div>
          )}

          <div className="text-center pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <Link
              href="/forgot-password"
              className="text-xs font-bengali text-neutral-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors inline-block py-1"
            >
              {locale === 'en' ? 'Request a new reset link' : 'নতুন রিসেট লিংকের আবেদন করুন'}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
