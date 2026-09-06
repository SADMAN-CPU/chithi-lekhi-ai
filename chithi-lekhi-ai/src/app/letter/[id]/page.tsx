import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { PublicLetterViewer } from '@/components/letter/PublicLetterViewer'
import { getPublicLetter } from '@/lib/supabase/public-letters'
import { getLetterById, getLetterBySlug } from '@/lib/supabase/letters'
import { FileQuestion, Feather, Lock, Clock } from 'lucide-react'
import type { PublicLetterRow } from '@/types/database'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const lookup = await getPublicLetter(id, false, true)

  if (lookup.letter) {
    const recipient = lookup.letter.receiver_name || 'প্রিয়জন'
    return {
      title: `চিঠি — ${recipient}-এর জন্য 💌 | Chithi Lekhi AI`,
      description: `কেউ একজন ${recipient}-এর জন্য একটি আন্তরিক ও গভীর অনুভূতির চিঠি পাঠিয়েছে। পড়ে দেখো...`,
      openGraph: {
        title: `💌 ${recipient}-এর জন্য একটি চিঠি এসেছে`,
        description: `চিঠি লেখাই এআই-এর মাধ্যমে পাঠানো একটি বিশেষ আবেগঘন চিঠি।`,
        type: 'article',
        locale: 'bn_BD',
        siteName: 'Chithi Lekhi AI',
      },
      twitter: {
        card: 'summary_large_image',
        title: `💌 ${recipient}-এর জন্য একটি চিঠি এসেছে`,
        description: `চিঠি লেখাই এআই-এর মাধ্যমে পাঠানো একটি বিশেষ চিঠি।`,
      },
    }
  }

  return {
    title: 'চিঠি পাওয়া যায়নি | Chithi Lekhi AI',
    description: 'এই চিঠিটি খুঁজে পাওয়া যায়নি বা মেয়াদ শেষ হয়ে গেছে।',
  }
}

export default async function PublicLetterPage({ params }: Props) {
  const { id } = await params

  // 1. Try public_letters table first
  const lookup = await getPublicLetter(id, true, true)

  let publicRecord: PublicLetterRow | null = lookup.letter

  // 2. Fallback to legacy letters table for backward compatibility
  if (!publicRecord && lookup.status === 'not_found') {
    let legacy = await getLetterBySlug(id, true)
    if (!legacy) {
      legacy = await getLetterById(id, true)
    }

    if (legacy && legacy.is_public) {
      publicRecord = {
        id: legacy.id,
        short_id: legacy.share_slug || legacy.id,
        user_id: legacy.user_id,
        letter_id: legacy.id,
        title: `চিঠি — প্রিয় ${legacy.receiver_name}-এর জন্য`,
        receiver_name: legacy.receiver_name,
        letter_content: legacy.content,
        theme: legacy.era_style === '90s-handwritten' ? '90s-post' : 'vintage',
        is_public: true,
        expiration: 'permanent',
        expires_at: null,
        views: 1,
        created_at: legacy.created_at,
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-chithi-gradient selection:bg-rose-100 selection:text-rose-800">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center justify-center">
        {/* Status 1: Expired Letter */}
        {lookup.status === 'expired' ? (
          <div className="bg-white/90 backdrop-blur-md border border-amber-200 rounded-3xl p-8 sm:p-12 text-center max-w-md w-full space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <h2 className="font-bengali font-bold text-xl text-neutral-900">
              চিঠির মেয়াদ শেষ হয়ে গেছে
            </h2>
            <p className="font-bengali text-xs sm:text-sm text-neutral-600 leading-relaxed">
              চিঠির প্রেরক এটি সাময়িক সময়ের (২৪ ঘণ্টা / ৭ দিন) জন্য সক্রিয় রেখেছিলেন। বর্তমানে লিংকটির মেয়াদ
              উত্তীর্ণ হয়েছে।
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition-colors"
              >
                <Feather className="w-4 h-4" />
                <span>নতুন চিঠি লিখুন</span>
              </Link>
            </div>
          </div>
        ) : lookup.status === 'private' ? (
          /* Status 2: Private Letter */
          <div className="bg-white/90 backdrop-blur-md border border-rose-200 rounded-3xl p-8 sm:p-12 text-center max-w-md w-full space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="font-bengali font-bold text-xl text-neutral-900">
              এটি একটি ব্যক্তিগত চিঠি
            </h2>
            <p className="font-bengali text-xs sm:text-sm text-neutral-600 leading-relaxed">
              প্রেরক এই চিঠিটি প্রাইভেট বা সুরক্ষিত রেখেছেন। এটি সবার জন্য উন্মুক্ত নয়।
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold bg-neutral-800 hover:bg-neutral-900 text-white shadow-xs transition-colors"
              >
                <span>হোমপেজে ফিরে যান</span>
              </Link>
            </div>
          </div>
        ) : !publicRecord ? (
          /* Status 3: Not Found */
          <div className="bg-white/90 backdrop-blur-md border border-rose-100 rounded-3xl p-8 sm:p-12 text-center max-w-md w-full space-y-4 shadow-sm animate-in fade-in duration-300">
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
          /* Status 4: OK — Render Vintage Animated Viewer */
          <PublicLetterViewer letter={publicRecord} />
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
