import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { AnonymousLetterReader } from '@/components/letter/AnonymousLetterReader'
import { getLetterById, getLetterBySlug } from '@/lib/supabase/letters'
import { FileQuestion, Feather } from 'lucide-react'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  let letter = await getLetterBySlug(id, true)
  if (!letter) {
    letter = await getLetterById(id, true)
  }

  if (!letter) {
    return {
      title: 'চিঠি পাওয়া যায়নি | Chithi Lekhi AI',
      description: 'এই চিঠিটি খুঁজে পাওয়া যায়নি বা ব্যক্তিগত রাখা হয়েছে।',
    }
  }

  const recipient = letter.receiver_name || 'প্রিয়জন'

  return {
    title: `চিঠি — ${recipient}-এর জন্য 💌 | Chithi Lekhi AI`,
    description: `কেউ একজন তোমার জন্য একটি বিশেষ চিঠি লিখেছে। পড়ে দেখো...`,
    openGraph: {
      title: `💌 ${recipient}-এর জন্য একটি গোপন চিঠি এসেছে`,
      description: `কেউ একজন তোমার জন্য একটি আন্তরিক ও গভীর অনুভূতির চিঠি লিখেছে। খুলে পড়ে দেখো...`,
      type: 'article',
      locale: 'bn_BD',
      siteName: 'Chithi Lekhi AI',
    },
    twitter: {
      card: 'summary_large_image',
      title: `💌 ${recipient}-এর জন্য একটি গোপন চিঠি এসেছে`,
      description: `কেউ একজন তোমার জন্য একটি আন্তরিক ও গভীর অনুভূতির চিঠি লিখেছে।`,
    },
  }
}

export default async function ReadLetterPage({ params }: Props) {
  const { id } = await params

  // Look up letter by slug or UUID
  let letter = await getLetterBySlug(id, true)
  if (!letter) {
    letter = await getLetterById(id, true)
  }

  return (
    <div className="min-h-screen flex flex-col bg-chithi-gradient selection:bg-rose-100 selection:text-rose-800">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center justify-center">
        {!letter ? (
          <div className="bg-white/90 backdrop-blur-md border border-rose-100 rounded-3xl p-8 sm:p-12 text-center max-w-md w-full space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto">
              <FileQuestion className="w-7 h-7" />
            </div>
            <h2 className="font-bengali font-bold text-xl text-neutral-900">
              চিঠিটি খুঁজে পাওয়া যায়নি
            </h2>
            <p className="font-bengali text-xs sm:text-sm text-neutral-600 leading-relaxed">
              এই চিঠিটির লিংক ভুল হতে পারে অথবা প্রেরক এটি সরিয়ে ফেলেছেন।
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition-colors"
              >
                <Feather className="w-4 h-4" />
                <span>নতুন একটি চিঠি লিখুন</span>
              </Link>
            </div>
          </div>
        ) : (
          <AnonymousLetterReader
            receiverName={letter.receiver_name}
            content={letter.content}
            relationship={letter.relationship}
            eraStyle={letter.era_style}
            createdAt={letter.created_at}
            slug={letter.share_slug || letter.id}
          />
        )}
      </main>

      <footer className="w-full border-t border-rose-100/80 bg-white/60 backdrop-blur-xs py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-1">
          <p className="font-bengali text-xs text-neutral-600 font-medium">
            চিঠি লেখাই AI (Chithi Lekhi AI) — &ldquo;যে কথা মুখে বলা যায় না, চিঠিতে লিখে ফেলুন।&rdquo;
          </p>
          <p className="text-[11px] text-neutral-400 font-sans">
            100% Private, Anonymous & Beautiful
          </p>
        </div>
      </footer>
    </div>
  )
}
