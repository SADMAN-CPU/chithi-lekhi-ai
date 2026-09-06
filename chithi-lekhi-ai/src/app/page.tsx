'use client'

import React, { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { EmotionalStorytellerForm } from '@/components/generator/EmotionalStorytellerForm'
import { LetterPreviewCard } from '@/components/letter/LetterPreviewCard'
import type { GenerateLetterRequest, GenerateLetterResponse } from '@/types'
import { Sparkles } from 'lucide-react'

export default function Home() {
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null)
  const [lastRequest, setLastRequest] = useState<GenerateLetterRequest | null>(null)
  const [currentLetterId, setCurrentLetterId] = useState<string | undefined>(undefined)

  const handleLetterGenerated = (
    response: GenerateLetterResponse,
    request: GenerateLetterRequest
  ) => {
    setGeneratedLetter(response.letter)
    setLastRequest(request)
    setCurrentLetterId(response.letterId)
    window.scrollTo({ top: 120, behavior: 'smooth' })
  }

  const handleReset = () => {
    setGeneratedLetter(null)
    setLastRequest(null)
    setCurrentLetterId(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEdit = () => {
    setGeneratedLetter(null)
    window.scrollTo({ top: 180, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-chithi-gradient selection:bg-rose-100 selection:text-rose-800">
      {/* Navigation */}
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Hero Section */}
        {!generatedLetter && (
          <section className="text-center space-y-4 max-w-2xl mx-auto pt-2 sm:pt-4">
            <div className="inline-flex items-center gap-2 bg-rose-100/70 border border-rose-200/80 text-rose-800 px-3.5 py-1.5 rounded-full text-xs font-bengali shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-rose-600" />
              <span>স্মৃতি, অনুভব ও প্রেমের ডিজিটাল চিঠি</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bengali font-bold text-neutral-900 tracking-tight leading-[1.2]">
              যে কথা মুখে বলা যায় না, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500">
                চিঠিতে লিখে ফেলুন।
              </span>
            </h1>

            <p className="text-neutral-600 font-bengali text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              কাছের মানুষের জন্য মনের গভীরতম অনুভব, অসম্পূর্ণ কথোপকথন আর বিশেষ মুহূর্তগুলো রূপ দিন এক অনুপম চিঠিতে।
            </p>

            {/* Feature Highlights */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 text-xs font-bengali text-neutral-600 bg-white/80 border border-rose-100 px-3 py-1 rounded-lg">
                ✉️ ৯০-এর আমেজ
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bengali text-neutral-600 bg-white/80 border border-rose-100 px-3 py-1 rounded-lg">
                🌸 স্মৃতি নির্ভর কথন
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bengali text-neutral-600 bg-white/80 border border-rose-100 px-3 py-1 rounded-lg">
                🇧🇩 বাংলা • English • বাংলিশ
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bengali text-neutral-600 bg-white/80 border border-rose-100 px-3 py-1 rounded-lg">
                🔒 গোপনীয় লিংক শেয়ার
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
      <footer className="w-full border-t border-rose-100/80 bg-white/60 backdrop-blur-xs py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-2">
          <p className="font-bengali text-xs sm:text-sm text-neutral-600 font-medium">
            চিঠি লেখাই AI (Chithi Lekhi AI) — &ldquo;যে কথা মুখে বলা যায় না, চিঠিতে লিখে ফেলুন।&rdquo;
          </p>
          <p className="text-[11px] text-neutral-400 font-sans">
            Crafted with tenderness for emotional storytelling • Bengali, English & Banglish
          </p>
        </div>
      </footer>
    </div>
  )
}
