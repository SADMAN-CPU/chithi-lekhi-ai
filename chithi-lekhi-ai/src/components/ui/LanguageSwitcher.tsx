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
      aria-label="Switch Language"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:hover:bg-neutral-700/80 border border-neutral-200/60 dark:border-neutral-700/60 transition-all active:scale-95 min-h-[36px] sm:min-h-[40px] cursor-pointer"
    >
      <Globe className="w-3.5 h-3.5 text-rose-500" />
      <span className="font-sans font-medium">
        {locale === 'bn' ? 'বাংলা' : 'EN'}
      </span>
    </button>
  )
}
