'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, Feather, CircleUser, ChevronRight, PenSquare } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export function Navbar() {
  const { isAuthenticated } = useAuth()
  const { t, locale } = useLanguage()
  const pathname = usePathname()

  // Smooth scroll to form or top if already on homepage
  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleWriteLetterClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault()
      const formEl = document.getElementById('storyteller-form')
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo({ top: 320, behavior: 'smooth' })
      }
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-rose-100/70 dark:border-neutral-800 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md pt-[env(safe-area-inset-top,0px)] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-2.5 xs:px-3 sm:px-6 h-16 flex items-center justify-between gap-1 xs:gap-1.5 sm:gap-4">
        {/* 1. BRAND NAVIGATION: Full logo + brand area clickable with Next.js Link */}
        <Link
          href="/"
          onClick={handleLogoClick}
          aria-label={locale === 'en' ? 'Chithi Lekhi AI Homepage' : 'চিঠি লেখাই AI হোমপেজ'}
          title={locale === 'en' ? 'Chithi Lekhi AI - Home' : 'চিঠি লেখাই AI - নীড়পাতা'}
          className="group flex items-center gap-2 sm:gap-2.5 shrink-0 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none rounded-xl p-1 -m-1 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-400 via-pink-400 to-amber-300 flex items-center justify-center text-white shadow-xs group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(244,63,94,0.35)] transition-all duration-200 shrink-0">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-white group-hover:scale-110 transition-transform duration-200" />
          </div>
          <div className="flex flex-col">
            <span className="font-bengali font-bold text-sm sm:text-base md:text-lg text-neutral-900 dark:text-white tracking-tight group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors duration-200 block leading-tight">
              {t('nav.title')} <span className="text-rose-500 font-sans text-xs sm:text-sm font-semibold">AI</span>
            </span>
            <span className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-bengali hidden sm:block leading-tight mt-0.5 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors duration-200">
              {t('nav.subtitle')}
            </span>
          </div>
        </Link>

        {/* 2. HEADER CONTROLS (Right side):
            Order: Language Selector → Dark/Light Mode Toggle → Write/Send Letter CTA → Login (always last) */}
        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2.5">
          {/* Desktop Tagline Pill (visible on large desktop >= xl) */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs font-bengali text-rose-700/80 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 px-3 py-1.5 rounded-full mr-1">
            <Feather className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate max-w-[220px]">&ldquo;{t('nav.quote')}&rdquo;</span>
          </div>

          {/* ORDER 1: Language Selector */}
          <LanguageSwitcher />

          {/* ORDER 2: Dark/Light Mode Toggle */}
          <ThemeSwitcher />

          {/* ORDER 3: Write/Send Letter CTA */}
          <Link
            href="/#storyteller-form"
            onClick={handleWriteLetterClick}
            title={locale === 'en' ? 'Write Letter' : 'চিঠি লিখুন'}
            aria-label={locale === 'en' ? 'Write Letter' : 'চিঠি লিখুন'}
            className="group relative inline-flex items-center justify-center gap-1.5 w-10 xs:w-auto h-10 px-0 xs:px-2.5 sm:px-3.5 rounded-xl font-bengali text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:via-pink-600 hover:to-rose-700 shadow-xs hover:shadow-[0_0_18px_rgba(244,63,94,0.38)] dark:hover:shadow-[0_0_22px_rgba(244,63,94,0.48)] hover:scale-[1.02] active:scale-95 transition-all duration-200 shrink-0 cursor-pointer min-h-[44px] min-w-[40px] focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
          >
            <PenSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-rotate-6 transition-transform duration-200 shrink-0" />
            <span className="hidden xs:inline">
              {t('nav.writeLetter')}
            </span>
          </Link>

          {/* ORDER 4: Login / Account (always last) */}
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              title={locale === 'en' ? 'My Account' : 'আমার অ্যাকাউন্ট'}
              aria-label={locale === 'en' ? 'My Account' : 'আমার অ্যাকাউন্ট'}
              className="group inline-flex items-center justify-center gap-1.5 w-10 sm:w-auto h-10 px-0 sm:px-3.5 rounded-xl font-bengali text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100/90 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/80 hover:border-rose-300 dark:hover:border-rose-700 shadow-2xs hover:shadow-[0_0_14px_rgba(244,63,94,0.2)] hover:scale-[1.02] active:scale-95 transition-all duration-200 shrink-0 min-h-[44px] min-w-[40px] focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none cursor-pointer"
            >
              <CircleUser className="w-4 h-4 text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform duration-200 shrink-0" />
              <span className="hidden sm:inline">
                {locale === 'en' ? 'My Account' : 'আমার অ্যাকাউন্ট'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-rose-400/80 dark:text-rose-400/60 group-hover:translate-x-0.5 group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-all duration-200 hidden md:inline" />
            </Link>
          ) : (
            <Link
              href="/login"
              title={locale === 'en' ? 'Log in to your account' : 'লগইন করুন'}
              aria-label={locale === 'en' ? 'Log in to your account' : 'লগইন করুন'}
              className="group inline-flex items-center justify-center gap-1.5 w-10 sm:w-auto h-10 px-0 sm:px-3.5 rounded-xl font-bengali text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100/90 hover:bg-neutral-200/90 dark:bg-neutral-800/90 dark:hover:bg-neutral-700/90 border border-neutral-200/80 dark:border-neutral-700/80 hover:border-rose-300 dark:hover:border-rose-700 shadow-2xs hover:text-rose-600 dark:hover:text-rose-300 hover:shadow-[0_0_14px_rgba(244,63,94,0.15)] hover:scale-[1.02] active:scale-95 transition-all duration-200 shrink-0 min-h-[44px] min-w-[40px] focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none cursor-pointer"
            >
              <CircleUser className="w-4 h-4 text-neutral-600 dark:text-neutral-300 group-hover:text-rose-500 dark:group-hover:text-rose-400 group-hover:scale-110 transition-all duration-200 shrink-0" />
              <span className="hidden sm:inline">
                {locale === 'en' ? 'Log in' : 'লগইন'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 group-hover:translate-x-0.5 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-all duration-200 hidden md:inline" />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
