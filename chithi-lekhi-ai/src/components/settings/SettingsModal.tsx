'use client'

import React, { useEffect, useSyncExternalStore } from 'react'
import {
  X,
  Sun,
  Moon,
  Monitor,
  Check,
  Sliders,
  Feather,
  Languages,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { useWritingLanguage } from '@/hooks/useWritingLanguage'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const emptySubscribe = () => () => {}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useLanguage()
  const { writingLanguage, setWritingLanguage } = useWritingLanguage()

  // Hydration protection for theme
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const currentTheme = mounted ? theme || 'system' : 'system'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl border border-rose-100/80 dark:border-neutral-800 shadow-2xl overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="font-bengali font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100"
              >
                {t('settings.title')}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bengali">
                {t('settings.subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 3 Structured Levels */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* ─────────────────────────────────────────────────────────────
              LEVEL 1: APPEARANCE (Light, Dark, System)
             ───────────────────────────────────────────────────────────── */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-sans">
                  {t('settings.appearanceTitle')}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bengali">
                  {t('settings.appearanceDesc')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Light */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`group relative p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[84px] cursor-pointer ${
                  currentTheme === 'light'
                    ? 'border-rose-400 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400/40 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Sun className="w-4 h-4" />
                  </div>
                  {currentTheme === 'light' && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="font-bengali font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 block">
                    {t('settings.themeLight')}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bengali block line-clamp-1">
                    {t('settings.themeLightDesc')}
                  </span>
                </div>
              </button>

              {/* Dark */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`group relative p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[84px] cursor-pointer ${
                  currentTheme === 'dark'
                    ? 'border-rose-400 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400/40 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Moon className="w-4 h-4" />
                  </div>
                  {currentTheme === 'dark' && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="font-bengali font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 block">
                    {t('settings.themeDark')}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bengali block line-clamp-1">
                    {t('settings.themeDarkDesc')}
                  </span>
                </div>
              </button>

              {/* System */}
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`group relative p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[84px] cursor-pointer ${
                  currentTheme === 'system'
                    ? 'border-rose-400 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400/40 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                    <Monitor className="w-4 h-4" />
                  </div>
                  {currentTheme === 'system' && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="font-bengali font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 block">
                    {t('settings.themeSystem')}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bengali block line-clamp-1">
                    {t('settings.themeSystemDesc')}
                  </span>
                </div>
              </button>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              LEVEL 2: LANGUAGE (বাংলা, English)
             ───────────────────────────────────────────────────────────── */}
          <section className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-sans flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5" />
                <span>{t('settings.languageTitle')}</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bengali">
                {t('settings.languageDesc')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* বাংলা */}
              <button
                type="button"
                onClick={() => setLocale('bn')}
                className={`group p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between min-h-[64px] cursor-pointer ${
                  locale === 'bn'
                    ? 'border-rose-400 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400/40 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label="Bangladesh Flag">
                    🇧🇩
                  </span>
                  <div>
                    <span className="font-bengali font-bold text-sm text-neutral-900 dark:text-neutral-100 block">
                      {t('settings.langBn')}
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bengali block">
                      {t('settings.langBnDesc')}
                    </span>
                  </div>
                </div>
                {locale === 'bn' && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>

              {/* English */}
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`group p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between min-h-[64px] cursor-pointer ${
                  locale === 'en'
                    ? 'border-rose-400 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400/40 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label="UK Flag">
                    🇬🇧
                  </span>
                  <div>
                    <span className="font-sans font-bold text-sm text-neutral-900 dark:text-neutral-100 block">
                      {t('settings.langEn')}
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-sans block">
                      {t('settings.langEnDesc')}
                    </span>
                  </div>
                </div>
                {locale === 'en' && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              LEVEL 3: LETTER WRITING LANGUAGE (বাংলা, English, Mixed)
             ───────────────────────────────────────────────────────────── */}
          <section className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-sans flex items-center gap-1.5">
                <Feather className="w-3.5 h-3.5" />
                <span>{t('settings.writingLangTitle')}</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bengali">
                {t('settings.writingLangDesc')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* বাংলা */}
              <button
                type="button"
                onClick={() => setWritingLanguage('bengali')}
                className={`group p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[88px] cursor-pointer ${
                  writingLanguage === 'bengali'
                    ? 'border-rose-400 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400/40 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bengali font-extrabold text-base text-rose-600 dark:text-rose-400">
                    বাংলা
                  </span>
                  {writingLanguage === 'bengali' && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="font-bengali font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 block">
                    {t('settings.writingBn')}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bengali block line-clamp-1">
                    {t('settings.writingBnDesc')}
                  </span>
                </div>
              </button>

              {/* English */}
              <button
                type="button"
                onClick={() => setWritingLanguage('english')}
                className={`group p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[88px] cursor-pointer ${
                  writingLanguage === 'english'
                    ? 'border-rose-400 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400/40 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-sans font-extrabold text-base text-rose-600 dark:text-rose-400">
                    English
                  </span>
                  {writingLanguage === 'english' && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="font-sans font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 block">
                    {t('settings.writingEn')}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-sans block line-clamp-1">
                    {t('settings.writingEnDesc')}
                  </span>
                </div>
              </button>

              {/* Mixed */}
              <button
                type="button"
                onClick={() => setWritingLanguage('banglish')}
                className={`group p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[88px] cursor-pointer ${
                  writingLanguage === 'banglish'
                    ? 'border-rose-400 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400/40 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bengali font-extrabold text-base text-rose-600 dark:text-rose-400">
                    বাংলিশ
                  </span>
                  {writingLanguage === 'banglish' && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="font-bengali font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 block">
                    {t('settings.writingMixed')}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bengali block line-clamp-1">
                    {t('settings.writingMixedDesc')}
                  </span>
                </div>
              </button>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-900/60">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-bengali">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t('settings.saveNotice')}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-black dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bengali text-xs sm:text-sm font-semibold transition-colors min-h-[44px] cursor-pointer shadow-xs"
          >
            {locale === 'bn' ? 'ঠিক আছে' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
