'use client'

import React, { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useLanguage } from '@/components/providers/LanguageProvider'

const emptySubscribe = () => () => {}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const { locale } = useLanguage()
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-xl border border-rose-100/60 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-800/50" />
    )
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={
        locale === 'en'
          ? theme === 'dark'
            ? 'Dark Mode Active (Switch to System)'
            : theme === 'light'
            ? 'Light Mode Active (Switch to Dark)'
            : 'System Mode Active (Switch to Light)'
          : theme === 'dark'
          ? 'ডার্ক মোড সক্রিয় (সিস্টেমে পরিবর্তন করুন)'
          : theme === 'light'
          ? 'লাইট মোড সক্রিয় (ডার্কে পরিবর্তন করুন)'
          : 'সিস্টেম মোড সক্রিয় (লাইটে পরিবর্তন করুন)'
      }
      aria-label="Toggle Theme"
      className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:hover:bg-neutral-700/80 border border-neutral-200/60 dark:border-neutral-700/60 transition-all active:scale-95 flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] cursor-pointer"
    >
      {theme === 'dark' ? (
        <Moon className="w-4 h-4 text-amber-300 transition-transform rotate-0 scale-100" />
      ) : theme === 'light' ? (
        <Sun className="w-4 h-4 text-amber-500 transition-transform rotate-0 scale-100" />
      ) : (
        <Monitor className="w-4 h-4 text-neutral-500 dark:text-neutral-400 transition-transform scale-100" />
      )}
    </button>
  )
}
