'use client'

import React from 'react'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  const toggleLanguage = () => {
    setLocale(locale === 'bn' ? 'en' : 'bn')
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      title={locale === 'bn' ? 'Switch to English 🇬🇧' : 'বাংলায় দেখুন 🇧🇩'}
      aria-label={locale === 'en' ? 'Switch to Bengali' : 'ইংরেজিতে পরিবর্তন করুন'}
      className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 h-9 sm:h-10 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100/90 hover:bg-neutral-200/90 dark:bg-neutral-800/90 dark:hover:bg-neutral-700/90 border border-neutral-200/80 dark:border-neutral-700/80 hover:border-rose-300 dark:hover:border-rose-700 transition-all active:scale-95 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
    >
      <Globe className="w-3.5 h-3.5 text-rose-500 shrink-0" />
      <span className="font-sans font-medium text-[11px] sm:text-xs">
        {locale === 'bn' ? 'বাং' : 'EN'}
      </span>
      <span className="hidden sm:inline font-sans font-medium text-xs">
        {locale === 'bn' ? 'লা' : ''}
      </span>
    </button>
  )
}
