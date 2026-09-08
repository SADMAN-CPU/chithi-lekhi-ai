'use client'

import React, { useState, useSyncExternalStore } from 'react'
import {
  Sun,
  Moon,
  Monitor,
  Check,
  Languages,
  Sparkles,
  Volume2,
  Lock,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { useWritingLanguage } from '@/hooks/useWritingLanguage'
import type { AuthUser } from '@/lib/auth'
import type { EraStyle, LetterLength } from '@/types'
import type { VoiceStyle } from '@/constants/voice'

interface DashboardSettingsViewProps {
  user: AuthUser
  stats?: {
    total?: number
    published?: number
    favorites?: number
    drafts?: number
  }
  onSignOut: () => void
}

interface UserPreferences {
  defaultEra: EraStyle
  defaultLength: LetterLength
  strictNeutrality: boolean
  autoAiSuggestions: boolean
  defaultVoice: VoiceStyle
  voicePlaybackSpeed: number
  autoAudioCaching: boolean
  defaultSharePrivacy: 'public' | 'private'
  defaultExpiration: '24h' | '7d' | 'never'
  anonymousSender: boolean
}

const DEFAULT_PREFS: UserPreferences = {
  defaultEra: '90s-handwritten',
  defaultLength: 'medium',
  strictNeutrality: true,
  autoAiSuggestions: true,
  defaultVoice: 'warm-mother',
  voicePlaybackSpeed: 1.0,
  autoAudioCaching: true,
  defaultSharePrivacy: 'public',
  defaultExpiration: 'never',
  anonymousSender: false,
}

const PREFS_KEY = 'chithi_saas_user_prefs'

const emptySubscribe = () => () => {}

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (val: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-neutral-100 dark:border-neutral-800/80 last:border-b-0">
      <div className="space-y-0.5 pr-2">
        <span className="text-xs sm:text-sm font-bengali font-semibold text-neutral-800 dark:text-neutral-200 block">
          {label}
        </span>
        {description && (
          <p className="text-[11px] sm:text-xs font-bengali text-neutral-500 dark:text-neutral-400 leading-normal">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:ring-offset-2 ${
          checked ? 'bg-rose-500' : 'bg-neutral-200 dark:bg-neutral-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export function DashboardSettingsView({ user, stats, onSignOut }: DashboardSettingsViewProps) {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useLanguage()
  const { writingLanguage, setWritingLanguage } = useWritingLanguage()

  // Hydration protection for theme
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(PREFS_KEY)
        if (saved) {
          return { ...DEFAULT_PREFS, ...JSON.parse(saved) }
        }
      } catch {
        // Fallback to default
      }
    }
    return DEFAULT_PREFS
  })
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)
  const [clearedDraftsFeedback, setClearedDraftsFeedback] = useState(false)

  // Helper to update and persist preferences
  const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value }
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next))
        setSaveFeedback(locale === 'en' ? 'Preferences saved' : 'পছন্দ সংরক্ষিত হয়েছে')
        setTimeout(() => setSaveFeedback(null), 2000)
      } catch {
        // Ignore
      }
      return next
    })
  }

  const handleClearDrafts = () => {
    try {
      localStorage.removeItem('chithi_autosave_draft')
      localStorage.removeItem('chithi_saved_drafts')
      setClearedDraftsFeedback(true)
      setTimeout(() => setClearedDraftsFeedback(false), 2500)
    } catch {
      // Ignore
    }
  }

  const currentTheme = mounted ? theme || 'system' : 'system'

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header Banner */}
      <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-rose-100/80 dark:border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0">
            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bengali font-bold text-lg sm:text-xl text-neutral-900 dark:text-neutral-100">
                {user.name || (locale === 'en' ? 'Valued User' : 'সম্মানিত ব্যবহারকারী')}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-sans font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Verified
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans mt-0.5">{user.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] font-bengali text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-lg border border-rose-200/60 dark:border-rose-900/40">
                {locale === 'en' ? 'Standard Plan' : 'ফ্রি মেম্বারশিপ'}
              </span>
              {stats && (
                <span className="text-[11px] font-bengali text-neutral-600 dark:text-neutral-400">
                  • {stats.published ?? 0} {locale === 'en' ? 'letters' : 'টি চিঠি'}
                  {typeof stats.favorites === 'number' && ` • ${stats.favorites} ${locale === 'en' ? 'favorites' : 'টি পছন্দের'}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Feedback Tag */}
        {saveFeedback && (
          <div className="text-xs font-bengali font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl self-start sm:self-center animate-in fade-in">
            ✓ {saveFeedback}
          </div>
        )}
      </div>

      {/* Grid of Sections: Linear / Notion Inspired */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ─────────────────────────────────────────────────────────────
            SECTION 1: APPEARANCE & DISPLAY (THEME)
           ───────────────────────────────────────────────────────────── */}
        <div className="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200/70 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bengali font-bold text-sm text-neutral-900 dark:text-neutral-100">
                {t('settings.appearanceTitle')}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bengali">
                {t('settings.appearanceDesc')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Light */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[88px] cursor-pointer ${
                currentTheme === 'light'
                  ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400/40 shadow-xs'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Sun className="w-4 h-4 text-amber-500" />
                {currentTheme === 'light' && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className="font-bengali font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                  {t('settings.themeLight')}
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bengali line-clamp-1">
                  ভিন্টেজ কাগজ
                </span>
              </div>
            </button>

            {/* Dark */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[88px] cursor-pointer ${
                currentTheme === 'dark'
                  ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400/40 shadow-xs'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Moon className="w-4 h-4 text-indigo-400" />
                {currentTheme === 'dark' && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className="font-bengali font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                  {t('settings.themeDark')}
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bengali line-clamp-1">
                  অবসিডিয়ান ডার্ক
                </span>
              </div>
            </button>

            {/* System */}
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[88px] cursor-pointer ${
                currentTheme === 'system'
                  ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-400/40 shadow-xs'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Monitor className="w-4 h-4 text-neutral-500" />
                {currentTheme === 'system' && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className="font-bengali font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                  {t('settings.themeSystem')}
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bengali line-clamp-1">
                  ডিভাইস অনুসরণ
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 2: LANGUAGE & REGIONAL
           ───────────────────────────────────────────────────────────── */}
        <div className="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200/70 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bengali font-bold text-sm text-neutral-900 dark:text-neutral-100">
                {t('settings.languageTitle')}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bengali">
                অ্যাপ ও চিঠি লেখার ভাষা নির্বাচন করুন
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* App Interface Language */}
            <div>
              <label className="block text-xs font-bengali font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                ডিসপ্লে ইন্টারফেস ভাষা:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setLocale('bn')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bengali font-bold min-h-[44px] cursor-pointer transition-all ${
                    locale === 'bn'
                      ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🇧🇩</span>
                    <span>বাংলা (BN)</span>
                  </span>
                  {locale === 'bn' && <Check className="w-3.5 h-3.5 text-rose-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLocale('en')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bengali font-bold min-h-[44px] cursor-pointer transition-all ${
                    locale === 'en'
                      ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🇬🇧</span>
                    <span>English (EN)</span>
                  </span>
                  {locale === 'en' && <Check className="w-3.5 h-3.5 text-rose-500" />}
                </button>
              </div>
            </div>

            {/* Default Letter Writing Language */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <label className="block text-xs font-bengali font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                ডিফল্ট চিঠি লেখার ভাষা:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'bengali', label: 'বাংলা লিপি' },
                    { id: 'english', label: 'English' },
                    { id: 'banglish', label: 'বাংলিশ' },
                  ] as const
                ).map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setWritingLanguage(lang.id)}
                    className={`py-2 px-2 text-center rounded-xl border text-[11px] font-bengali font-semibold min-h-[40px] cursor-pointer transition-all ${
                      writingLanguage === lang.id
                        ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 font-bold shadow-2xs'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 3: AI WRITING PREFERENCES
           ───────────────────────────────────────────────────────────── */}
        <div className="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200/70 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bengali font-bold text-sm text-neutral-900 dark:text-neutral-100">
                এআই চিঠি লেখার পছন্দসমূহ
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bengali">
                ডিফল্ট স্টাইল ও বুদ্ধিমত্তা কনফিগারেশন
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Default Era Style */}
            <div>
              <label className="block text-xs font-bengali font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                ডিফল্ট লেখার যুগ ও শৈলী:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: '90s-handwritten', label: '✉️ ৯০-এর চিঠি' },
                    { id: 'vintage', label: '📜 ক্লাসিক্যাল' },
                    { id: 'modern', label: '✨ আধুনিক' },
                  ] as const
                ).map((era) => (
                  <button
                    key={era.id}
                    type="button"
                    onClick={() => updatePref('defaultEra', era.id)}
                    className={`py-2 px-2 text-center rounded-xl border text-[11px] font-bengali font-semibold min-h-[40px] cursor-pointer transition-all ${
                      prefs.defaultEra === era.id
                        ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 shadow-2xs'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {era.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
              <ToggleSwitch
                checked={prefs.strictNeutrality}
                onChange={(val) => updatePref('strictNeutrality', val)}
                label="সাংস্কৃতিক ও ধর্মীয় নিরপেক্ষতা"
                description="সম্বোধন ও সমাপনী সবসময় সর্বজনীন ও শালীন রাখা হবে।"
              />
              <ToggleSwitch
                checked={prefs.autoAiSuggestions}
                onChange={(val) => updatePref('autoAiSuggestions', val)}
                label="স্মার্ট এআই পরিমার্জন প্রদর্শন"
                description="চিঠি তৈরির পর ৮টি পরিমার্জন শৈলীর দ্রুত সাজেশন দেখাবে।"
              />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 4: VOICE & AUDIO PREFERENCES
           ───────────────────────────────────────────────────────────── */}
        <div className="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200/70 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bengali font-bold text-sm text-neutral-900 dark:text-neutral-100">
                ভয়েস ও অডিও চিঠি পছন্দ
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bengali">
                প্রাকৃতিক বাংলা টিটিএস বাচনভঙ্গি
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Canonical Voice Profiles */}
            <div>
              <label className="block text-xs font-bengali font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                ডিফল্ট বাচনভঙ্গি (Voice Profile):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'warm-mother', label: '🤱 স্নেহময়ী মা' },
                    { id: 'emotional', label: '❤️ আবেগঘন কণ্ঠ' },
                    { id: 'storytelling', label: '📖 গল্পগাথা' },
                    { id: 'professional', label: '💼 মার্জিত পেশাদার' },
                  ] as const
                ).map((voice) => (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => updatePref('defaultVoice', voice.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bengali font-semibold min-h-[44px] cursor-pointer transition-all flex items-center justify-between ${
                      prefs.defaultVoice === voice.id
                        ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/40 text-pink-900 dark:text-pink-200 shadow-2xs'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span>{voice.label}</span>
                    {prefs.defaultVoice === voice.id && <Check className="w-3.5 h-3.5 text-pink-500" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Caching Toggle */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
              <ToggleSwitch
                checked={prefs.autoAudioCaching}
                onChange={(val) => updatePref('autoAudioCaching', val)}
                label="স্বয়ংক্রিয় অডিও ক্যাশিং"
                description="পূর্বের তৈরি অডিও দ্রুত ও ডেটা সাশ্রয়ী উপায়ে প্লে করবে।"
              />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 5: PRIVACY & SHARING DEFAULTS
           ───────────────────────────────────────────────────────────── */}
        <div className="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200/70 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bengali font-bold text-sm text-neutral-900 dark:text-neutral-100">
                গোপনীয়তা ও শেয়ারিং সেটিংস
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bengali">
                পাবলিক লিংক ও প্রেরকের সুরক্ষা
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bengali font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                ডিফল্ট লিংক মেয়াদ (Link Expiration):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: '24h', label: '২৪ ঘণ্টা' },
                    { id: '7d', label: '৭ দিন' },
                    { id: 'never', label: 'স্থায়ী' },
                  ] as const
                ).map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => updatePref('defaultExpiration', exp.id)}
                    className={`py-2 px-2 text-center rounded-xl border text-[11px] font-bengali font-semibold min-h-[40px] cursor-pointer transition-all ${
                      prefs.defaultExpiration === exp.id
                        ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-2xs'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {exp.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
              <ToggleSwitch
                checked={prefs.anonymousSender}
                onChange={(val) => updatePref('anonymousSender', val)}
                label="প্রেরকের নাম গোপন রাখা"
                description="শেয়ার করা লিংকে ডিফল্টভাবে নাম প্রকাশ না করে গোপন রাখবে।"
              />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 6: DATA & SESSION ZONE
           ───────────────────────────────────────────────────────────── */}
        <div className="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200/70 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bengali font-bold text-sm text-neutral-900 dark:text-neutral-100">
                অ্যাকাউন্ট ও সেশন নিয়ন্ত্রণ
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bengali">
                লোকাল ড্রাফট ও অ্যাকাউন্ট সেশন
              </p>
            </div>
          </div>

          <div className="space-y-3 font-bengali">
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 block">
                  ব্রাউজার ড্রাফট পরিষ্কার
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  {clearedDraftsFeedback ? '✓ ড্রাফট পরিষ্কার করা হয়েছে' : 'লোকাল মেমোরি থেকে খসড়া মুছে ফেলুন'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearDrafts}
                className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-600 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors min-h-[36px] cursor-pointer"
              >
                পরিষ্কার করুন
              </button>
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 block">
                  সেশন সমাপ্তি
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  বর্তমান ডিভাইস থেকে লগআউট
                </span>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs font-bold transition-all min-h-[40px] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>লগআউট করুন</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
