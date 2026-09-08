'use client'

import React from 'react'
import Link from 'next/link'
import { Heart, Feather, LayoutDashboard, LogIn } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export function Navbar() {
  const { isAuthenticated } = useAuth()
  const { t } = useLanguage()

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

          {/* Navigation links */}
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bengali font-medium text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 px-2.5 sm:px-3 py-2 rounded-xl transition-colors border border-rose-200/60 dark:border-rose-900/40 min-h-[36px] sm:min-h-[40px]"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden xs:inline">{t('nav.dashboard')}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 bg-neutral-100/80 hover:bg-rose-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 px-2.5 sm:px-3 py-2 rounded-xl transition-colors min-h-[36px] sm:min-h-[40px]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{t('nav.login')}</span>
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
