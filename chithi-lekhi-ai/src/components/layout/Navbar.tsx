'use client'

import React from 'react'
import Link from 'next/link'
import { Heart, Feather, CircleUser, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export function Navbar() {
  const { isAuthenticated } = useAuth()
  const { t, locale } = useLanguage()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-rose-100/60 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-3 xs:px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-400 via-pink-400 to-amber-300 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
          </div>
          <div>
            <span className="font-bengali font-bold text-sm sm:text-base md:text-lg text-neutral-900 dark:text-white tracking-tight block leading-tight">
              {t('nav.title')} <span className="text-rose-500 font-sans text-xs sm:text-sm font-semibold">AI</span>
            </span>
            <span className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-bengali hidden sm:block">
              {t('nav.subtitle')}
            </span>
          </div>
        </Link>

        {/* Tagline & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-bengali text-rose-700/80 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 px-3 py-1.5 rounded-full">
            <Feather className="w-3.5 h-3.5 text-rose-500" />
            <span>&ldquo;{t('nav.quote')}&rdquo;</span>
          </div>

          {/* Theme & Language Switchers */}
          <LanguageSwitcher />
          <ThemeSwitcher />

          {/* User Account / Login CTA */}
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              title={locale === 'en' ? 'My Account' : 'আমার অ্যাকাউন্ট'}
              aria-label={locale === 'en' ? 'My Account' : 'আমার অ্যাকাউন্ট'}
              className="group inline-flex items-center justify-center gap-1.5 w-9 sm:w-auto h-9 sm:h-10 px-0 sm:px-3.5 rounded-full font-bengali text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-300 bg-gradient-to-r from-rose-50/90 via-pink-50/70 to-rose-50/90 dark:from-rose-950/50 dark:via-pink-950/40 dark:to-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700 shadow-xs hover:shadow-[0_0_15px_rgba(244,63,94,0.18)] dark:hover:shadow-[0_0_15px_rgba(244,63,94,0.25)] hover:scale-[1.02] active:scale-95 transition-all duration-200 shrink-0"
            >
              <CircleUser className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-500 dark:text-rose-400 group-hover:scale-105 transition-transform duration-200 shrink-0" />
              <span className="hidden sm:inline">
                {locale === 'en' ? 'My Account' : 'আমার অ্যাকাউন্ট'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-rose-400/80 dark:text-rose-400/60 group-hover:translate-x-0.5 group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-all duration-200 hidden md:inline" />
            </Link>
          ) : (
            <Link
              href="/login"
              title={locale === 'en' ? 'Log in' : 'লগইন করুন'}
              aria-label={locale === 'en' ? 'Log in' : 'লগইন করুন'}
              className="group inline-flex items-center justify-center gap-1.5 w-9 sm:w-auto h-9 sm:h-10 px-0 sm:px-3.5 rounded-full font-bengali text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-300 bg-gradient-to-r from-rose-50/90 via-pink-50/70 to-rose-50/90 dark:from-rose-950/50 dark:via-pink-950/40 dark:to-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700 shadow-xs hover:shadow-[0_0_15px_rgba(244,63,94,0.18)] dark:hover:shadow-[0_0_15px_rgba(244,63,94,0.25)] hover:scale-[1.02] active:scale-95 transition-all duration-200 shrink-0"
            >
              <CircleUser className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-500 dark:text-rose-400 group-hover:scale-105 transition-transform duration-200 shrink-0" />
              <span className="hidden sm:inline">
                {locale === 'en' ? 'Log in' : 'লগইন'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-rose-400/80 dark:text-rose-400/60 group-hover:translate-x-0.5 group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-all duration-200 hidden md:inline" />
            </Link>
          )}

          <Link
            href="/#storyteller-form"
            className="text-xs font-bengali font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 px-3 sm:px-3.5 py-2 rounded-xl transition-all shadow-xs shrink-0 min-h-[36px] sm:min-h-[40px] flex items-center gap-1"
          >
            <span className="hidden xs:inline">{t('nav.writeLetter')}</span>
            <span aria-hidden="true">✉️</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
