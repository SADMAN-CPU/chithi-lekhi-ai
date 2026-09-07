'use client'

import { useSyncExternalStore, useCallback } from 'react'
import type { Language } from '@/types'

const STORAGE_KEY = 'chithi_writing_lang'
const DEFAULT_LANG: Language = 'bengali'
const EVENT_NAME = 'chithi_writing_lang_change'

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(EVENT_NAME, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(EVENT_NAME, callback)
  }
}

function getClientSnapshot(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null
    if (saved === 'bengali' || saved === 'english' || saved === 'banglish') {
      return saved
    }
  } catch {
    // Storage unavailable or SSR
  }
  return DEFAULT_LANG
}

function getServerSnapshot(): Language {
  return DEFAULT_LANG
}

export function useWritingLanguage() {
  const writingLanguage = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  const setWritingLanguage = useCallback((lang: Language) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
      window.dispatchEvent(new Event(EVENT_NAME))
    } catch {
      // Ignore
    }
  }, [])

  return { writingLanguage, setWritingLanguage }
}
