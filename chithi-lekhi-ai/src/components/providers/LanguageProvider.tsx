'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useSyncExternalStore } from 'react'
import bnMessages from '@/messages/bn.json'
import enMessages from '@/messages/en.json'

export type Locale = 'bn' | 'en'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (path: string, fallback?: string) => string
}

const messagesMap: Record<Locale, Record<string, unknown>> = {
  bn: bnMessages as Record<string, unknown>,
  en: enMessages as Record<string, unknown>,
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'bn',
  setLocale: () => {},
  t: (path: string, fallback?: string) => fallback || path,
})

function subscribeLocale(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('chithi_locale_change', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('chithi_locale_change', callback)
  }
}

function getClientLocale(): Locale {
  try {
    const saved = localStorage.getItem('chithi_locale')
    if (saved === 'en' || saved === 'bn') return saved
  } catch {
    // Ignore
  }
  return 'bn'
}

function getServerLocale(): Locale {
  return 'bn'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [localLocale, setLocalLocale] = useState<Locale | null>(null)

  const storedLocale = useSyncExternalStore(
    subscribeLocale,
    getClientLocale,
    getServerLocale
  )

  const locale = localLocale ?? storedLocale

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocalLocale(newLocale)
    try {
      localStorage.setItem('chithi_locale', newLocale)
      document.documentElement.lang = newLocale
      window.dispatchEvent(new Event('chithi_locale_change'))
    } catch {
      // Ignore
    }
  }, [])

  const t = useCallback(
    (path: string, fallback?: string): string => {
      const dict = messagesMap[locale] || messagesMap.bn
      const keys = path.split('.')
      let cur: unknown = dict
      for (const k of keys) {
        if (cur && typeof cur === 'object' && k in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[k]
        } else {
          return fallback || path
        }
      }
      return typeof cur === 'string' ? cur : fallback || path
    },
    [locale]
  )

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
