'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Heart,
  Feather,
  Sparkles,
  Lightbulb,
  BookOpen,
} from 'lucide-react'
import {
  RELATIONSHIP_OPTIONS,
  ERA_STYLE_OPTIONS,
  LETTER_LENGTH_OPTIONS,
  WRITING_PERSONALITIES,
  CORE_WRITING_STYLES,
  LANGUAGES,
  getRelationshipPromptConfig,
  detectRelationshipIntent,
} from '@/constants'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { useWritingLanguage } from '@/hooks/useWritingLanguage'
import { getErrorMessage } from '@/utils/helpers'
import type {
  GenerateLetterRequest,
  GenerateLetterResponse,
  Relationship,
  EraStyle,
  LetterLength,
  Language,
  WritingPersonality,
  CoreWritingStyle,
} from '@/types'

interface EmotionalStorytellerFormProps {
  onLetterGenerated: (response: GenerateLetterResponse, request: GenerateLetterRequest) => void
  initialValues?: Partial<GenerateLetterRequest>
}

export function EmotionalStorytellerForm({
  onLetterGenerated,
  initialValues,
}: EmotionalStorytellerFormProps) {
  const { t, locale } = useLanguage()
  const { writingLanguage } = useWritingLanguage()

  // Form States
  const [receiverName, setReceiverName] = useState(initialValues?.receiverName || '')
  const [relationship, setRelationship] = useState<Relationship>(
    (initialValues?.relationship as Relationship) || 'first-love'
  )
  const [writingStyle, setWritingStyle] = useState<CoreWritingStyle>(
    (initialValues?.writingStyle as CoreWritingStyle) || 'emotional'
  )
  const [personality, setPersonality] = useState<WritingPersonality>(
    (initialValues?.personality as WritingPersonality) || 'deep-emotional'
  )
  const [showAdvancedPersonalities, setShowAdvancedPersonalities] = useState(false)
  const [memory, setMemory] = useState(initialValues?.memory || '')
  const [situation, setSituation] = useState(initialValues?.situation || '')
  const [feeling, setFeeling] = useState(initialValues?.feeling || '')
  const [letterLength, setLetterLength] = useState<LetterLength>(
    initialValues?.letterLength || 'medium'
  )
  const [eraStyle, setEraStyle] = useState<EraStyle>(
    initialValues?.eraStyle || '90s-handwritten'
  )
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(
    initialValues?.language || null
  )
  const language = selectedLanguage || writingLanguage

  // Smart Intent & Dynamic Relationship State
  const [userManuallySelectedRel, setUserManuallySelectedRel] = useState(Boolean(initialValues?.relationship))
  const [suggestedIntent, setSuggestedIntent] = useState<{
    rel: Relationship
    labelBn: string
    reasonBn: string
  } | null>(null)

  // Dynamic config tailored to selected relationship
  const relConfig = useMemo(() => {
    return getRelationshipPromptConfig(relationship)
  }, [relationship])

  // Intelligent text intent detection on typing
  const handleTextIntentCheck = (nameText: string, memText: string) => {
    const combinedText = `${nameText} ${memText}`.trim()
    if (!combinedText || combinedText.length < 2) {
      setSuggestedIntent(null)
      return
    }

    const detected = detectRelationshipIntent(combinedText, relationship)

    // 1. Check deceased / remembrance intent
    if (detected.isDeceased && relationship !== 'lost-person') {
      const labelBn = '🕊️ স্মৃতির মানুষ'
      const reasonBn = detected.matchedIntent || 'স্মৃতির ওপারে থাকা প্রিয়জন'
      setSuggestedIntent({ rel: 'lost-person', labelBn, reasonBn })
      if (!userManuallySelectedRel) {
        setRelationship('lost-person')
      }
      return
    }

    // 2. Check lost connection intent
    if (detected.isLostConnection && relationship !== 'lost-connection') {
      const labelBn = '📩 হারিয়ে যাওয়া যোগাযোগ'
      const reasonBn = 'যোগাযোগ বিচ্ছিন্ন হওয়ার স্মৃতি'
      setSuggestedIntent({ rel: 'lost-connection', labelBn, reasonBn })
      if (!userManuallySelectedRel) {
        setRelationship('lost-connection')
      }
      return
    }

    // 3. General relationship auto-selection when user hasn't explicitly locked it
    if (!userManuallySelectedRel && detected.relationship && detected.relationship !== relationship) {
      setRelationship(detected.relationship)
      setSuggestedIntent(null)
      return
    }

    setSuggestedIntent(null)
  }

  // UI / Loading states
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clear pending interval on unmount
  useEffect(() => {
    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current)
      }
    }
  }, [])

  // Quick sample story filler
  const fillSampleStory = () => {
    setReceiverName('তানিয়া')
    setRelationship('first-love')
    setUserManuallySelectedRel(true)
    setSuggestedIntent(null)
    setWritingStyle('emotional')
    setPersonality('90s-handwritten')
    setMemory('টিএসসির চায়ের দোকানে সেই বৃষ্টিভেজা বিকেলে তোমার ভেজা কাজল আর একটুকরো মিষ্টি হাসি')
    setSituation('অনেক দিন হলো আমাদের কথা হয় না, সময়ের স্রোতে দুজন দুদিকে ব্যস্ত')
    setFeeling('তীব্র মিস করছি তোমাকে, বুকের ভেতর আজও সেই পুরোনো অনুভূতি তেমনি জীবন্ত')
    setLetterLength('medium')
    setEraStyle('90s-handwritten')
    setSelectedLanguage('bengali')
    setError(null)
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (!receiverName.trim()) {
      setError(locale === 'en' ? 'Please enter the receiver’s name' : 'অনুগ্রহ করে প্রাপকের নাম লিখুন')
      return
    }

    if (!feeling.trim()) {
      setError(locale === 'en' ? 'Please express your core feeling' : 'মনের মূল অনুভূতিটি লিখুন')
      return
    }

    setLoading(true)
    setLoadingStep(1)

    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current)
    stepIntervalRef.current = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev))
    }, 1200)

    const payload: GenerateLetterRequest = {
      receiverName: receiverName.trim(),
      relationship,
      memory: memory.trim() || undefined,
      situation: situation.trim() || undefined,
      feeling: feeling.trim(),
      letterLength,
      eraStyle,
      language,
      personality,
      style: writingStyle,
      writingStyle,
    }

    try {
      const res = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data: GenerateLetterResponse = await res.json()

      if (!res.ok || !data.success) {
        const message = getErrorMessage(
          data.error,
          locale === 'en'
            ? 'Unable to create letter. Please try again.'
            : 'চিঠি তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
        )
        throw new Error(message)
      }

      onLetterGenerated(data, payload)
    } catch (err: unknown) {
      console.error('Letter generation error:', err)
      setError(getErrorMessage(err))
    } finally {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current)
        stepIntervalRef.current = null
      }
      setLoading(false)
      setLoadingStep(0)
    }
  }

  const loadingMessages = locale === 'en' ? [
    'Turning the pages of memory...',
    'Giving heart’s emotions a voice...',
    'Weaving every word with love...',
  ] : [
    'স্মৃতির পৃষ্ঠাগুলো উল্টানো হচ্ছে...',
    'হৃদয়ের অনুভব ভাষায় রূপ নিচ্ছে...',
    'চিঠির প্রতিটি শব্দে ভালোবাসা বুনে দেওয়া হচ্ছে...',
  ]

  return (
    <form
      id="storyteller-form"
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300"
    >
      {/* Form Header */}
      <div className="text-center space-y-2 pb-2">
        <div className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bengali px-3 py-1 rounded-full border border-rose-200/60 dark:border-rose-900/40 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
          <span>{t('form.badge')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bengali font-bold text-neutral-900 dark:text-white tracking-tight">
          {t('form.title')}
        </h1>
        <p className="text-sm sm:text-base font-bengali text-neutral-600 dark:text-neutral-300 max-w-lg mx-auto leading-relaxed">
          {t('form.subtitle')}
        </p>

        {/* Quick Demo Fill Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={fillSampleStory}
            className="inline-flex items-center gap-1.5 text-xs font-bengali text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100/90 dark:hover:bg-rose-900/50 px-3 py-2 rounded-xl border border-rose-200/50 dark:border-rose-900/40 transition-colors min-h-[40px] cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('form.trySample')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm font-bengali p-3.5 rounded-xl shadow-xs"
        >
          ⚠️ {error}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: RECEIVER & RELATIONSHIP
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs border border-rose-100/80 dark:border-neutral-800 rounded-2xl p-4 xs:p-5 sm:p-7 shadow-xs space-y-5 transition-colors">
        <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="w-7 h-7 rounded-lg bg-rose-100/80 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Heart className="w-4 h-4 fill-rose-500" />
          </div>
          <div>
            <h3 className="font-bengali font-semibold text-neutral-900 dark:text-white text-base">
              {t('form.section1Title')}
            </h3>
            <p className="text-xs font-bengali text-neutral-500 dark:text-neutral-400">
              {t('form.section1Subtitle')}
            </p>
          </div>
        </div>

        {/* 1. Receiver Name */}
        <div className="space-y-1.5">
          <label htmlFor="receiverName" className="block text-sm font-bengali font-medium text-neutral-800 dark:text-neutral-200">
            {t('form.receiverLabel')} <span className="text-rose-500">*</span>
          </label>
          <input
            id="receiverName"
            type="text"
            required
            value={receiverName}
            onChange={(e) => {
              const val = e.target.value
              setReceiverName(val)
              handleTextIntentCheck(val, memory)
            }}
            placeholder={t('form.receiverPlaceholder')}
            className="w-full font-bengali px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950/60 outline-none text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-base sm:text-sm transition-all bg-neutral-50/40 dark:bg-neutral-800/40 focus:bg-white dark:focus:bg-neutral-800"
          />
        </div>

        {/* 2. Relationship */}
        <div className="space-y-2">
          <label className="block text-sm font-bengali font-medium text-neutral-800 dark:text-neutral-200">
            {t('form.relationshipLabel')} <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {RELATIONSHIP_OPTIONS.map((rel) => {
              const selected = relationship === rel.value
              return (
                <button
                  key={rel.value}
                  type="button"
                  onClick={() => {
                    setUserManuallySelectedRel(true)
                    setRelationship(rel.value)
                    setSuggestedIntent(null)
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all min-h-[44px] cursor-pointer ${
                    selected
                      ? 'border-rose-400 dark:border-rose-500 bg-rose-50/70 dark:bg-rose-950/60 shadow-xs ring-1 ring-rose-300 dark:ring-rose-800'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-700/60'
                  }`}
                >
                  <span className="text-lg mb-1">{rel.emoji}</span>
                  <span className="font-bengali font-semibold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 leading-tight">
                    {rel.label}
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bengali line-clamp-1 mt-0.5">
                    {rel.labelEn}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Smart Intent Detection Banner */}
          {suggestedIntent && suggestedIntent.rel !== relationship && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-50/95 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 p-3 rounded-xl text-xs font-bengali text-amber-900 dark:text-amber-200 transition-all shadow-xs mt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  আপনার বর্ণনায় <strong>{suggestedIntent.reasonBn}</strong> বোঝা যাচ্ছে। আপনি কি ক্যাটাগরি <strong>{suggestedIntent.labelBn}</strong> করতে চান?
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserManuallySelectedRel(true)
                  setRelationship(suggestedIntent.rel)
                  setSuggestedIntent(null)
                }}
                className="self-start sm:self-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                হ্যাঁ, পরিবর্তন করুন
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: MEMORY, SITUATION & FEELING
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs border border-rose-100/80 dark:border-neutral-800 rounded-2xl p-4 xs:p-5 sm:p-7 shadow-xs space-y-5 transition-colors">
        <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="w-7 h-7 rounded-lg bg-pink-100/80 dark:bg-pink-950/60 flex items-center justify-center text-pink-600 dark:text-pink-400">
            <Feather className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bengali font-semibold text-neutral-900 dark:text-white text-base">
              {locale === 'en' ? relConfig.sectionTitleEn : relConfig.sectionTitle}
            </h3>
            <p className="text-xs font-bengali text-neutral-500 dark:text-neutral-400">
              {locale === 'en' ? relConfig.sectionSubtitleEn : relConfig.sectionSubtitle}
            </p>
          </div>
        </div>

        {/* 3. Memory */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="memory" className="block text-sm font-bengali font-medium text-neutral-800 dark:text-neutral-200">
              {locale === 'en' ? relConfig.memoryLabelEn : relConfig.memoryLabel}
            </label>
            <span className="text-[11px] font-bengali text-neutral-400 dark:text-neutral-500">{t('form.memoryOptional')}</span>
          </div>
          <textarea
            id="memory"
            rows={2}
            value={memory}
            onChange={(e) => {
              const val = e.target.value
              setMemory(val)
              handleTextIntentCheck(receiverName, val)
            }}
            placeholder={locale === 'en' ? relConfig.memoryPlaceholderEn : relConfig.memoryPlaceholder}
            className="w-full font-bengali px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950/60 outline-none text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-base sm:text-sm transition-all bg-neutral-50/40 dark:bg-neutral-800/40 focus:bg-white dark:focus:bg-neutral-800 resize-none"
          />
          {/* Inspiration chips */}
          <div className="space-y-1">
            <span className="text-[11px] font-bengali text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              {t('form.memoryInspire')}
            </span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {relConfig.memorySuggestions.slice(0, 4).map((suggestion, i) => {
                const text = locale === 'en' ? suggestion.en : suggestion.bn
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setMemory(text)
                      handleTextIntentCheck(receiverName, text)
                    }}
                    className="text-xs font-bengali bg-neutral-100 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-300 text-neutral-600 dark:text-neutral-300 px-3 py-1.5 min-h-[40px] sm:min-h-[34px] inline-flex items-center rounded-lg transition-all active:scale-95 border border-neutral-200/60 dark:border-neutral-700 cursor-pointer"
                  >
                    {text}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 4. Current Situation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="situation" className="block text-sm font-bengali font-medium text-neutral-800 dark:text-neutral-200">
              {t('form.situationLabel')}
            </label>
            <span className="text-[11px] font-bengali text-neutral-400 dark:text-neutral-500">{t('form.situationOptional')}</span>
          </div>
          <input
            id="situation"
            type="text"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder={locale === 'en' ? relConfig.situationPlaceholderEn : relConfig.situationPlaceholder}
            className="w-full font-bengali px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950/60 outline-none text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-base sm:text-sm transition-all bg-neutral-50/40 dark:bg-neutral-800/40 focus:bg-white dark:focus:bg-neutral-800"
          />
          {/* Situation suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {relConfig.situationSuggestions.slice(0, 3).map((item, i) => {
              const text = locale === 'en' ? item.en : item.bn
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSituation(text)}
                  className="text-xs font-bengali bg-neutral-100 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-300 text-neutral-600 dark:text-neutral-300 px-3 py-1.5 min-h-[40px] sm:min-h-[34px] inline-flex items-center rounded-lg transition-all active:scale-95 border border-neutral-200/60 dark:border-neutral-700 cursor-pointer"
                >
                  {text}
                </button>
              )
            })}
          </div>
        </div>

        {/* 5. Feeling */}
        <div className="space-y-2">
          <label htmlFor="feeling" className="block text-sm font-bengali font-medium text-neutral-800 dark:text-neutral-200">
            {t('form.feelingLabel')} <span className="text-rose-500">*</span>
          </label>
          <input
            id="feeling"
            type="text"
            required
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            placeholder={locale === 'en' ? relConfig.feelingPlaceholderEn : relConfig.feelingPlaceholder}
            className="w-full font-bengali px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950/60 outline-none text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-base sm:text-sm transition-all bg-neutral-50/40 dark:bg-neutral-800/40 focus:bg-white dark:focus:bg-neutral-800"
          />
          {/* Feeling suggestions */}
          <div className="space-y-1">
            <span className="text-[11px] font-bengali text-neutral-500 dark:text-neutral-400">{t('form.quickFeelings')}</span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {relConfig.feelingSuggestions.map((item, i) => {
                const text = locale === 'en' ? item.en : item.bn
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFeeling(text)}
                    className={`text-xs font-bengali px-3 py-1.5 min-h-[40px] sm:min-h-[34px] inline-flex items-center rounded-full border transition-all active:scale-95 cursor-pointer ${
                      feeling === text
                        ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-neutral-700 dark:text-neutral-300 hover:text-rose-700 dark:hover:text-rose-300 border-neutral-200/80 dark:border-neutral-700'
                    }`}
                  >
                    {text}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: WRITING STYLE, ERA & FORMAT
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs border border-rose-100/80 dark:border-neutral-800 rounded-2xl p-4 xs:p-5 sm:p-7 shadow-xs space-y-5 transition-colors">
        <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100/80 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bengali font-semibold text-neutral-900 dark:text-white text-base">
              {locale === 'en' ? 'Letter Style & Tone' : 'চিঠির লেখার ধারা ও শৈলী'}
            </h3>
            <p className="text-xs font-bengali text-neutral-500 dark:text-neutral-400">
              {locale === 'en' ? 'Choose from 5 emotional writing styles' : 'আপনার মনের ভাব প্রকাশের উপযোগী ৫টি স্বতন্ত্র লেখার ধরন'}
            </p>
          </div>
        </div>

        {/* 1. The 5 Core Writing Styles */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bengali font-medium text-neutral-800 dark:text-neutral-200">
              {locale === 'en' ? 'Writing Style' : 'লেখার ধরন'} <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] font-bengali text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-900/40 font-medium">
              {locale === 'en' ? '5 Core Styles' : '৫টি স্বতন্ত্র ধারা'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {CORE_WRITING_STYLES.map((st) => {
              const selected = writingStyle === st.value
              return (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => {
                    setWritingStyle(st.value)
                    if (st.value === 'emotional') {
                      setPersonality('deep-emotional')
                      setEraStyle('90s-handwritten')
                    } else if (st.value === 'simple') {
                      setPersonality('simple-human')
                      setEraStyle('modern')
                    } else if (st.value === 'mature') {
                      setPersonality('mature-apology')
                      setEraStyle('modern')
                    } else if (st.value === 'poetic') {
                      setPersonality('poetic')
                      setEraStyle('vintage')
                    } else if (st.value === 'formal') {
                      setPersonality('rabindranath-classical')
                      setEraStyle('vintage')
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[70px] cursor-pointer ${
                    selected
                      ? 'border-rose-400 dark:border-rose-500 bg-rose-50/90 dark:bg-rose-950/70 ring-2 ring-rose-300 dark:ring-rose-800 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-700/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base sm:text-lg">{st.emoji}</span>
                      <span className="font-bengali font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 leading-tight">
                        {locale === 'en' ? st.labelEn : st.label}
                      </span>
                    </div>
                    <p className="text-[10px] font-bengali text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-tight">
                      {st.tagline}
                    </p>
                  </div>
                  <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-sans mt-1.5 block">
                    {st.labelEn}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Advanced Personalities Accordion Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvancedPersonalities(!showAdvancedPersonalities)}
            className="text-xs font-bengali text-neutral-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-300 inline-flex items-center gap-1 py-1 transition-colors cursor-pointer"
          >
            <span>{showAdvancedPersonalities ? '▾ উন্নত ব্যক্তিত্ব ও আমেজ সংক্ষেপ করুন' : '▸ অন্যান্য ব্যক্তিত্ব ও আমেজ কাস্টমাইজ করুন'}</span>
          </button>

          {showAdvancedPersonalities && (
            <div className="space-y-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-2 animate-in fade-in duration-200">
              {/* The 8 Writing Personalities */}
              <div className="space-y-2">
                <label className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300">
                  {t('form.personalityLabel')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WRITING_PERSONALITIES.map((p) => {
                    const selected = personality === p.value
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => {
                          setPersonality(p.value)
                          if (p.value === '90s-handwritten') setEraStyle('90s-handwritten')
                          else if (p.value === 'rabindranath-classical') setEraStyle('vintage')
                          else if (p.value === 'simple-human') setEraStyle('modern')
                        }}
                        className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[48px] cursor-pointer ${
                          selected
                            ? 'border-rose-400 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/60 ring-1 ring-rose-300 dark:ring-rose-800 shadow-xs'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-700/80'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-sm">{p.emoji}</span>
                          <span className="font-bengali font-bold text-xs text-neutral-900 dark:text-neutral-100 leading-tight">
                            {p.label}
                          </span>
                        </div>
                        <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-sans block">
                          {p.labelEn}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Era Style */}
              <div className="space-y-2">
                <label className="block text-xs font-bengali font-medium text-neutral-700 dark:text-neutral-300">
                  {t('form.eraLabel')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ERA_STYLE_OPTIONS.map((era) => {
                    const selected = eraStyle === era.value
                    return (
                      <button
                        key={era.value}
                        type="button"
                        onClick={() => setEraStyle(era.value)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[44px] cursor-pointer ${
                          selected
                            ? 'border-rose-400 dark:border-rose-500 bg-rose-50/70 dark:bg-rose-950/60 ring-1 ring-rose-300 dark:ring-rose-800 shadow-xs'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{era.emoji}</span>
                          <span className="font-bengali font-bold text-xs text-neutral-900 dark:text-neutral-100">
                            {era.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-sans mt-1 block">
                          {era.labelEn}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. Letter Length & 8. Language in grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* 6. Letter Length */}
          <div className="space-y-2">
            <label className="block text-sm font-bengali font-medium text-neutral-800 dark:text-neutral-200">
              {t('form.lengthLabel')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LETTER_LENGTH_OPTIONS.map((len) => {
                const selected = letterLength === len.value
                return (
                  <button
                    key={len.value}
                    type="button"
                    onClick={() => setLetterLength(len.value)}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all min-h-[44px] cursor-pointer ${
                      selected
                        ? 'border-rose-400 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/60 ring-1 ring-rose-300 dark:ring-rose-800 text-rose-900 dark:text-rose-100 font-semibold'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800/80'
                    }`}
                  >
                    <span className="text-base block mb-0.5">{len.emoji}</span>
                    <span className="font-bengali text-xs block leading-tight">{len.label}</span>
                    <span className="text-[10px] font-bengali text-neutral-400 dark:text-neutral-500 block mt-0.5">
                      {len.wordRange}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 8. Language */}
          <div className="space-y-2">
            <label className="block text-sm font-bengali font-medium text-neutral-800 dark:text-neutral-200">
              {t('form.languageLabel')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => {
                const selected = language === lang.value
                return (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.value)}
                    className={`py-2.5 px-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[44px] cursor-pointer ${
                      selected
                        ? 'border-rose-400 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/60 ring-1 ring-rose-300 dark:ring-rose-800 text-rose-900 dark:text-rose-100 font-semibold'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800/80'
                    }`}
                  >
                    <span className="font-bengali text-sm font-bold block leading-tight">{lang.nativeLabel}</span>
                    <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 block">{lang.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUBMIT ACTION BUTTON
         ───────────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 px-6 rounded-2xl font-bengali font-bold text-base sm:text-lg text-white transition-all shadow-md flex items-center justify-center gap-2.5 min-h-[52px] cursor-pointer ${
            loading
              ? 'bg-neutral-400 cursor-not-allowed opacity-90'
              : 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] glow-pink'
          }`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{loadingMessages[loadingStep - 1] || t('form.submitButtonLoading')}</span>
            </>
          ) : (
            <>
              <Feather className="w-5 h-5 text-rose-100" />
              <span className="hidden xs:inline">{t('form.submitButton')}</span>
              <span className="xs:hidden">{t('form.submitButton')} ✉️</span>
            </>
          )}
        </button>

        <p className="text-center text-xs font-bengali text-neutral-400 dark:text-neutral-500 mt-2.5 flex items-center justify-center gap-1">
          <span>{t('form.guarantee')}</span>
        </p>
      </div>
    </form>
  )
}
