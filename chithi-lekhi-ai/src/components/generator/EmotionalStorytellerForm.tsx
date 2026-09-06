'use client'

import React, { useState } from 'react'
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
  LANGUAGES,
  MEMORY_SUGGESTIONS,
  SITUATION_SUGGESTIONS,
  FEELING_SUGGESTIONS,
} from '@/constants'
import { getErrorMessage } from '@/utils/helpers'
import type {
  GenerateLetterRequest,
  GenerateLetterResponse,
  Relationship,
  EraStyle,
  LetterLength,
  Language,
  WritingPersonality,
} from '@/types'

interface EmotionalStorytellerFormProps {
  onLetterGenerated: (response: GenerateLetterResponse, request: GenerateLetterRequest) => void
  initialValues?: Partial<GenerateLetterRequest>
}

export function EmotionalStorytellerForm({
  onLetterGenerated,
  initialValues,
}: EmotionalStorytellerFormProps) {
  // Form States
  const [receiverName, setReceiverName] = useState(initialValues?.receiverName || '')
  const [relationship, setRelationship] = useState<Relationship>(
    (initialValues?.relationship as Relationship) || 'first-love'
  )
  const [personality, setPersonality] = useState<WritingPersonality>(
    (initialValues?.personality as WritingPersonality) || 'deep-emotional'
  )
  const [memory, setMemory] = useState(initialValues?.memory || '')
  const [situation, setSituation] = useState(initialValues?.situation || '')
  const [feeling, setFeeling] = useState(initialValues?.feeling || '')
  const [letterLength, setLetterLength] = useState<LetterLength>(
    initialValues?.letterLength || 'medium'
  )
  const [eraStyle, setEraStyle] = useState<EraStyle>(
    initialValues?.eraStyle || '90s-handwritten'
  )
  const [language, setLanguage] = useState<Language>(initialValues?.language || 'bengali')

  // UI / Loading states
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Quick sample story filler
  const fillSampleStory = () => {
    setReceiverName('তানিয়া')
    setRelationship('first-love')
    setPersonality('90s-handwritten')
    setMemory('টিএসসির চায়ের দোকানে সেই বৃষ্টিভেজা বিকেলে তোমার ভেজা কাজল আর একটুকরো মিষ্টি হাসি')
    setSituation('অনেক দিন হলো আমাদের কথা হয় না, সময়ের স্রোতে দুজন দুদিকে ব্যস্ত')
    setFeeling('তীব্র মিস করছি তোমাকে, বুকের ভেতর আজও সেই পুরোনো অনুভূতি তেমনি জীবন্ত')
    setLetterLength('medium')
    setEraStyle('90s-handwritten')
    setLanguage('bengali')
    setError(null)
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!receiverName.trim()) {
      setError('অনুগ্রহ করে প্রাপকের নাম লিখুন (Please enter receiver name)')
      return
    }

    if (!feeling.trim()) {
      setError('মনের মূল অনুভূতিটি লিখুন (Please enter your feeling)')
      return
    }

    setLoading(true)
    setLoadingStep(1)

    const stepInterval = setInterval(() => {
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
      style: personality,
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
          'চিঠি তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
        )
        throw new Error(message)
      }

      onLetterGenerated(data, payload)
    } catch (err: unknown) {
      console.error('Letter generation error:', err)
      setError(getErrorMessage(err))
    } finally {
      clearInterval(stepInterval)
      setLoading(false)
      setLoadingStep(0)
    }
  }

  const loadingMessages = [
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
        <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 text-xs font-bengali px-3 py-1 rounded-full border border-rose-200/60 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>আবেগঘন চিঠির কথন</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bengali font-bold text-neutral-900 tracking-tight">
          চিঠির গল্প বুনুন
        </h1>
        <p className="text-sm sm:text-base font-bengali text-neutral-600 max-w-lg mx-auto leading-relaxed">
          যার কথা ভেবে লিখতে বসেছেন, তার সাথে কাটানো স্মৃতি ও মনের কথাগুলো লিখুন। আমাদের এআই তা একটি হৃদয়ছোঁয়া চিঠিতে রূপ দেবে।
        </p>

        {/* Quick Demo Fill Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={fillSampleStory}
            className="inline-flex items-center gap-1.5 text-xs font-bengali text-rose-600 hover:text-rose-800 bg-rose-50/80 hover:bg-rose-100/90 px-3 py-1.5 rounded-lg border border-rose-200/50 transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>একটি নমুনা গল্প দিয়ে স্বয়ংক্রিয় পূরণ করুন (Try Sample)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bengali p-3.5 rounded-xl shadow-xs">
          ⚠️ {error}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: RECEIVER & RELATIONSHIP
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-xs border border-rose-100/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-rose-100/80 flex items-center justify-center text-rose-600">
            <Heart className="w-4 h-4 fill-rose-500" />
          </div>
          <div>
            <h3 className="font-bengali font-semibold text-neutral-900 text-base">
              ১. প্রাপক ও সম্পর্ক (Who is this for?)
            </h3>
            <p className="text-xs font-bengali text-neutral-500">
              কাকে উদ্দেশ্য করে এই চিঠি লিখছেন?
            </p>
          </div>
        </div>

        {/* 1. Receiver Name */}
        <div className="space-y-1.5">
          <label htmlFor="receiverName" className="block text-sm font-bengali font-medium text-neutral-800">
            প্রাপকের নাম <span className="text-rose-500">*</span>
          </label>
          <input
            id="receiverName"
            type="text"
            required
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="যেমন: তানিয়া, অর্ণব, প্রিয়তমা, মা..."
            className="w-full font-bengali px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-neutral-800 placeholder:text-neutral-400 text-sm sm:text-base transition-all bg-neutral-50/40 focus:bg-white"
          />
        </div>

        {/* 2. Relationship */}
        <div className="space-y-2">
          <label className="block text-sm font-bengali font-medium text-neutral-800">
            আপনার সাথে সম্পর্ক <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {RELATIONSHIP_OPTIONS.map((rel) => {
              const selected = relationship === rel.value
              return (
                <button
                  key={rel.value}
                  type="button"
                  onClick={() => setRelationship(rel.value)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    selected
                      ? 'border-rose-400 bg-rose-50/60 shadow-xs ring-1 ring-rose-300'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/60'
                  }`}
                >
                  <span className="text-lg mb-1">{rel.emoji}</span>
                  <span className="font-bengali font-semibold text-xs sm:text-sm text-neutral-900 leading-tight">
                    {rel.label}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-bengali line-clamp-1 mt-0.5">
                    {rel.labelEn}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: MEMORY, SITUATION & FEELING
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-xs border border-rose-100/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-pink-100/80 flex items-center justify-center text-pink-600">
            <Feather className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bengali font-semibold text-neutral-900 text-base">
              ২. স্মৃতি ও মনের অনুভব (Story & Emotions)
            </h3>
            <p className="text-xs font-bengali text-neutral-500">
              আপনার হৃদয়ের কথাগুলো ছোট করে জানিয়ে দিন
            </p>
          </div>
        </div>

        {/* 3. Memory */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="memory" className="block text-sm font-bengali font-medium text-neutral-800">
              একটি বিশেষ স্মৃতি (A special moment we shared)
            </label>
            <span className="text-[11px] font-bengali text-neutral-400">ঐচ্ছিক কিন্তু দারুণ</span>
          </div>
          <textarea
            id="memory"
            rows={2}
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            placeholder="যেমন: একসাথে বৃষ্টিভেজা বিকেলে এক ছাতার নিচে হাঁটা..."
            className="w-full font-bengali px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-neutral-800 placeholder:text-neutral-400 text-sm transition-all bg-neutral-50/40 focus:bg-white resize-none"
          />
          {/* Inspiration chips */}
          <div className="space-y-1">
            <span className="text-[11px] font-bengali text-neutral-500 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              স্মৃতির অনুপ্রেরণা (ক্লিক করুন):
            </span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {MEMORY_SUGGESTIONS.slice(0, 4).map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMemory(suggestion)}
                  className="text-[11px] font-bengali bg-neutral-100 hover:bg-rose-50 hover:text-rose-700 text-neutral-600 px-2 py-1 rounded-md transition-colors border border-neutral-200/60"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Current Situation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="situation" className="block text-sm font-bengali font-medium text-neutral-800">
              বর্তমান পরিস্থিতি (Current situation)
            </label>
            <span className="text-[11px] font-bengali text-neutral-400">ঐচ্ছিক</span>
          </div>
          <input
            id="situation"
            type="text"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="যেমন: আমরা এখন অনেক দূরে থাকি, অনেক দিন কথা হয় না..."
            className="w-full font-bengali px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-neutral-800 placeholder:text-neutral-400 text-sm transition-all bg-neutral-50/40 focus:bg-white"
          />
          {/* Situation suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {SITUATION_SUGGESTIONS.slice(0, 3).map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSituation(item)}
                className="text-[11px] font-bengali bg-neutral-100 hover:bg-rose-50 hover:text-rose-700 text-neutral-600 px-2 py-1 rounded-md transition-colors border border-neutral-200/60"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Feeling */}
        <div className="space-y-2">
          <label htmlFor="feeling" className="block text-sm font-bengali font-medium text-neutral-800">
            হৃদয়ের অনুভূতি (Core feeling) <span className="text-rose-500">*</span>
          </label>
          <input
            id="feeling"
            type="text"
            required
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            placeholder="যেমন: তীব্র মিস করছি এই মানুষটিকে, অনেক ভালোবাসি..."
            className="w-full font-bengali px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-neutral-800 placeholder:text-neutral-400 text-sm sm:text-base transition-all bg-neutral-50/40 focus:bg-white"
          />
          {/* Feeling suggestions */}
          <div className="space-y-1">
            <span className="text-[11px] font-bengali text-neutral-500">ঝটপট অনুভূতি বাছাই করুন:</span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {FEELING_SUGGESTIONS.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFeeling(item)}
                  className={`text-[11px] font-bengali px-2.5 py-1 rounded-full border transition-all ${
                    feeling === item
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-700 border-neutral-200/80'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: ERA STYLE, LENGTH & LANGUAGE
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-xs border border-rose-100/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-600">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bengali font-semibold text-neutral-900 text-base">
              ৩. চিঠির রূপ ও শৈলী (Era, Length & Language)
            </h3>
            <p className="text-xs font-bengali text-neutral-500">
              চিঠিটি দেখতে ও পড়তে কেমন হবে?
            </p>
          </div>
        </div>

        {/* The 8 Writing Personalities (Phase 03) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bengali font-medium text-neutral-800">
              চিঠির লেখনী ব্যক্তিত্ব ও মেজাজ (Writing Personality) <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] font-bengali text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60 font-medium">
              ৮টি অনন্য মানবিক সুর
            </span>
          </div>
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
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selected
                      ? 'border-rose-400 bg-rose-50/90 ring-1 ring-rose-300 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{p.emoji}</span>
                      <span className="font-bengali font-bold text-xs sm:text-sm text-neutral-900 leading-tight">
                        {p.label}
                      </span>
                    </div>
                    <p className="text-[10px] font-bengali text-neutral-500 line-clamp-2 leading-tight">
                      {p.tagline}
                    </p>
                  </div>
                  <span className="text-[9px] text-neutral-400 font-sans mt-2 block">
                    {p.labelEn}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 7. Era Style */}
        <div className="space-y-2 pt-1">
          <label className="block text-sm font-bengali font-medium text-neutral-800">
            চিঠির যুগ ও আবহ (Era Setting)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {ERA_STYLE_OPTIONS.map((era) => {
              const selected = eraStyle === era.value
              return (
                <button
                  key={era.value}
                  type="button"
                  onClick={() => setEraStyle(era.value)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selected
                      ? 'border-rose-400 bg-rose-50/70 ring-1 ring-rose-300 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{era.emoji}</span>
                      <span className="font-bengali font-bold text-xs sm:text-sm text-neutral-900">
                        {era.label}
                      </span>
                    </div>
                    <p className="text-[11px] font-bengali text-neutral-600 leading-tight">
                      {era.tagline}
                    </p>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-sans mt-2 block">
                    {era.labelEn}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 6. Letter Length & 8. Language in grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* 6. Letter Length */}
          <div className="space-y-2">
            <label className="block text-sm font-bengali font-medium text-neutral-800">
              চিঠির দৈর্ঘ্য (Letter Length)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LETTER_LENGTH_OPTIONS.map((len) => {
                const selected = letterLength === len.value
                return (
                  <button
                    key={len.value}
                    type="button"
                    onClick={() => setLetterLength(len.value)}
                    className={`py-2 px-2 rounded-xl border text-center transition-all ${
                      selected
                        ? 'border-rose-400 bg-rose-50/80 ring-1 ring-rose-300 text-rose-900 font-semibold'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
                    }`}
                  >
                    <span className="text-base block mb-0.5">{len.emoji}</span>
                    <span className="font-bengali text-xs block leading-tight">{len.label}</span>
                    <span className="text-[10px] font-bengali text-neutral-400 block mt-0.5">
                      {len.wordRange}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 8. Language */}
          <div className="space-y-2">
            <label className="block text-sm font-bengali font-medium text-neutral-800">
              ভাষা (Language)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => {
                const selected = language === lang.value
                return (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => setLanguage(lang.value)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                      selected
                        ? 'border-rose-400 bg-rose-50/80 ring-1 ring-rose-300 text-rose-900 font-semibold'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
                    }`}
                  >
                    <span className="font-bengali text-sm font-bold block">{lang.nativeLabel}</span>
                    <span className="text-[10px] font-sans text-neutral-400 block">{lang.label}</span>
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
          className={`w-full py-4 px-6 rounded-2xl font-bengali font-bold text-base sm:text-lg text-white transition-all shadow-md flex items-center justify-center gap-2.5 ${
            loading
              ? 'bg-neutral-400 cursor-not-allowed opacity-90'
              : 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] glow-pink'
          }`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{loadingMessages[loadingStep - 1] || 'চিঠি তৈরি হচ্ছে...'}</span>
            </>
          ) : (
            <>
              <Feather className="w-5 h-5 text-rose-100" />
              <span>চিঠি রচনা করুন (Generate Emotional Letter)</span>
            </>
          )}
        </button>

        <p className="text-center text-xs font-bengali text-neutral-400 mt-2.5 flex items-center justify-center gap-1">
          <span>💌 ১০০% ব্যক্তিগত ও অনুভূতির গভীর স্পর্শে রচিত</span>
        </p>
      </div>
    </form>
  )
}
