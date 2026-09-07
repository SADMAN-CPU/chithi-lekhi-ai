'use client'

import React, { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Navbar } from '@/components/layout/Navbar'
import { EmotionalStorytellerForm } from '@/components/generator/EmotionalStorytellerForm'
import type { GenerateLetterRequest, GenerateLetterResponse } from '@/types'
import { Sparkles } from 'lucide-react'

// Code-split LetterPreviewCard so initial landing page doesn't load preview & export modules
const LetterPreviewCard = dynamic(
  () => import('@/components/letter/LetterPreviewCard').then((mod) => mod.LetterPreviewCard),
  {
    ssr: false,
    loading: () => (
      <div className="paper-card rounded-2xl p-8 max-w-2xl mx-auto animate-pulse space-y-4 border border-rose-100">
        <div className="h-6 bg-rose-100/60 rounded w-1/3" />
        <div className="space-y-2 pt-4">
          <div className="h-4 bg-neutral-200/60 rounded w-full" />
          <div className="h-4 bg-neutral-200/60 rounded w-5/6" />
          <div className="h-4 bg-neutral-200/60 rounded w-4/6" />
        </div>
      </div>
    ),
  }
)

import { useLanguage } from '@/components/providers/LanguageProvider'

export default function Home() {
  const { t } = useLanguage()
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null)
  const [lastRequest, setLastRequest] = useState<GenerateLetterRequest | null>(null)
  const [currentLetterId, setCurrentLetterId] = useState<string | undefined>(undefined)

  const handleLetterGenerated = useCallback(
    (response: GenerateLetterResponse, request: GenerateLetterRequest) => {
      setGeneratedLetter(response.letter)
      setLastRequest(request)
      setCurrentLetterId(response.letterId)
      window.scrollTo({ top: 120, behavior: 'smooth' })
    },
    []
  )

  const handleReset = useCallback(() => {
    setGeneratedLetter(null)
    setLastRequest(null)
    setCurrentLetterId(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleEdit = useCallback(() => {
    setGeneratedLetter(null)
    window.scrollTo({ top: 180, behavior: 'smooth' })
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-chithi-gradient selection:bg-rose-100 selection:text-rose-800 transition-colors duration-200">
      {/* Navigation */}
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-3 xs:px-4 sm:px-6 py-6 sm:py-12 space-y-8 sm:space-y-10">
        {/* Hero Section */}
        {!generatedLetter && (
          <section className="text-center space-y-4 max-w-2xl mx-auto pt-2 sm:pt-4">
            <div className="inline-flex items-center gap-2 bg-rose-100/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 px-3.5 py-1.5 rounded-full text-xs font-bengali shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bengali font-bold text-neutral-900 dark:text-white tracking-tight leading-[1.2]">
              {t('hero.headingLine1')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500">
                {t('hero.headingLine2')}
              </span>
            </h1>

            <p className="text-neutral-600 dark:text-neutral-300 font-bengali text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              {t('hero.description')}
            </p>

            {/* Feature Highlights */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 text-xs font-bengali text-neutral-600 dark:text-neutral-300 bg-white/80 dark:bg-neutral-800/80 border border-rose-100 dark:border-neutral-700 px-3 py-1 rounded-lg">
                {t('hero.tagEra')}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bengali text-neutral-600 dark:text-neutral-300 bg-white/80 dark:bg-neutral-800/80 border border-rose-100 dark:border-neutral-700 px-3 py-1 rounded-lg">
                {t('hero.tagMemory')}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bengali text-neutral-600 dark:text-neutral-300 bg-white/80 dark:bg-neutral-800/80 border border-rose-100 dark:border-neutral-700 px-3 py-1 rounded-lg">
                {t('hero.tagLanguage')}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bengali text-neutral-600 dark:text-neutral-300 bg-white/80 dark:bg-neutral-800/80 border border-rose-100 dark:border-neutral-700 px-3 py-1 rounded-lg">
                {t('hero.tagPrivate')}
              </span>
            </div>
          </section>
        )}

        {/* Dynamic Content Area: Form vs. Letter Preview */}
        <section className="transition-all duration-300">
          {generatedLetter && lastRequest ? (
            <LetterPreviewCard
              letter={generatedLetter}
              letterId={currentLetterId}
              receiverName={lastRequest.receiverName}
              relationship={lastRequest.relationship}
              eraStyle={lastRequest.eraStyle}
              language={lastRequest.language}
              letterLength={lastRequest.letterLength}
              personality={lastRequest.personality}
              onReset={handleReset}
              onEdit={handleEdit}
            />
          ) : (
            <EmotionalStorytellerForm
              onLetterGenerated={handleLetterGenerated}
              initialValues={lastRequest || undefined}
            />
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-rose-100/80 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xs py-6 mt-12 transition-colors">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-2">
          <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-medium">
            চিঠি লেখাই AI (Chithi Lekhi AI) — &ldquo;যে কথা মুখে বলা যায় না, চিঠিতে লিখে ফেলুন।&rdquo;
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-sans">
            Crafted with tenderness for emotional storytelling • Bengali, English & Banglish
          </p>
        </div>
      </footer>
    </div>
  )
}
