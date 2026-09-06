'use client'

import React from 'react'
import Link from 'next/link'
import { Heart, Feather, LayoutDashboard, LogIn } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function Navbar() {
  const { isAuthenticated } = useAuth()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-rose-100/60 bg-white/80 backdrop-blur-md transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-400 via-pink-400 to-amber-300 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
            <Heart className="w-5 h-5 fill-white" />
          </div>
          <div>
            <span className="font-bengali font-bold text-lg text-neutral-900 tracking-tight block leading-tight">
              চিঠি লেখাই <span className="text-rose-500 font-sans text-sm font-semibold">AI</span>
            </span>
            <span className="text-[11px] text-neutral-500 font-bengali hidden sm:block">
              হাতে লেখা অনুভূতির ডিজিটাল রূপ
            </span>
          </div>
        </Link>

        {/* Tagline / Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-bengali text-rose-700/80 bg-rose-50/80 border border-rose-200/60 px-3 py-1.5 rounded-full">
            <Feather className="w-3.5 h-3.5 text-rose-500" />
            <span>&ldquo;যে কথা মুখে বলা যায় না, চিঠিতে লিখে ফেলুন&rdquo;</span>
          </div>

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bengali font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors border border-rose-200/60"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-rose-500" />
              <span>ড্যাশবোর্ড</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bengali font-medium text-neutral-700 hover:text-rose-600 bg-neutral-100/80 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>লগইন</span>
            </Link>
          )}

          <Link
            href="/#storyteller-form"
            className="text-xs font-bengali font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 px-3.5 py-1.5 rounded-xl transition-all shadow-xs"
          >
            চিঠি লিখুন ✉️
          </Link>
        </div>
      </div>
    </header>
  )
}
