'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Lock, Mail, User, ArrowRight, Feather } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function SignupPage() {
  const router = useRouter()
  const { signUp } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড দিন')
      return
    }

    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
      return
    }

    setLoading(true)
    const { user, error: authError } = await signUp(email, password, name.trim())
    setLoading(false)

    if (authError || !user) {
      setError(authError || 'নিবন্ধন সম্পন্ন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।')
      return
    }

    router.push('/dashboard')
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
          <h1 className="font-bengali text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            নতুন অ্যাকাউন্ট খুলুন
          </h1>
          <p className="font-bengali text-xs sm:text-sm text-neutral-600">
            চিঠি লিখুন, প্রিয় চিঠি সংরক্ষণ করুন এবং ইতিহাস বজায় রাখুন
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white/90 backdrop-blur-md border border-rose-100/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bengali p-3 rounded-xl">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bengali font-medium text-neutral-700">
                আপনার নাম (Your Name)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: সাদমান"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-sm font-bengali bg-neutral-50/40 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bengali font-medium text-neutral-700">
                ইমেইল ঠিকানা (Email) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-sm font-sans bg-neutral-50/40 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bengali font-medium text-neutral-700">
                পাসওয়ার্ড (Password) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-sm font-sans bg-neutral-50/40 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-bengali font-semibold text-sm text-white transition-all shadow-xs flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-neutral-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] glow-pink'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>অ্যাকাউন্ট তৈরি করুন</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs font-bengali text-neutral-500">
              ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
              <Link href="/login" className="text-rose-600 font-semibold hover:underline">
                এখানে লগইন করুন
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bengali text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <Feather className="w-3.5 h-3.5" />
            <span>মূল পাতায় ফিরে যান</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
