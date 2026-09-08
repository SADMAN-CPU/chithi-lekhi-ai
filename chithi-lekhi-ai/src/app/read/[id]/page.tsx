import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { AnonymousLetterReader } from '@/components/letter/AnonymousLetterReader'
import { getShareByToken } from '@/lib/shares'
import { getPublicLetter } from '@/lib/supabase/public-letters'
import { getLetterById, getLetterBySlug } from '@/lib/supabase/letters'
import { FileQuestion, Feather, Lock, Clock } from 'lucide-react'
import type { LetterRow } from '@/types/database'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const shareLookup = await getShareByToken(id, false, true)

  let receiverName = 'প্রিয়জন'
  if (shareLookup.letter) {
    receiverName = shareLookup.letter.receiver_name
  } else {
    const pubLookup = await getPublicLetter(id, false, true)
    if (pubLookup.letter) {
      receiverName = pubLookup.letter.receiver_name
    }
  }

  return {
    title: `চিঠি — ${receiverName}-এর জন্য 💌 | Chithi Lekhi AI`,
    description: `কেউ একজন ${receiverName}-এর জন্য একটি আন্তরিক ও আবেগঘন চিঠি পাঠিয়েছে। পড়ে দেখুন...`,
    openGraph: {
      title: `💌 ${receiverName}-এর জন্য একটি চিঠি এসেছে`,
      description: `চিঠি লেখাই এআই (Chithi Lekhi AI)-এর মাধ্যমে পাঠানো একটি বিশেষ vintage চিঠি।`,
      type: 'article',
      locale: 'bn_BD',
      siteName: 'Chithi Lekhi AI',
    },
    twitter: {
      card: 'summary_large_image',
      title: `💌 ${receiverName}-এর জন্য একটি চিঠি এসেছে`,
      description: `চিঠি লেখাই এআই-এর মাধ্যমে পাঠানো একটি বিশেষ চিঠি।`,
    },
  }
}

export default async function ReadLetterPage({ params }: Props) {
  const { id } = await params

  // 1. Primary: Lookup in shares table with automatic view tracking
  const shareLookup = await getShareByToken(id, true, true)

  let letter: LetterRow | null = shareLookup.letter
  let status = shareLookup.status
  const shareToken = id
  let views = shareLookup.share?.views || 1
  let expiresAt = shareLookup.share?.expires_at
  let expiration = shareLookup.share?.expiration || 'never'

  // 2. Secondary fallback: public_letters table
  if (!letter && status === 'not_found') {
    const pubLookup = await getPublicLetter(id, true, true)
    if (pubLookup.letter) {
      status = pubLookup.status
      views = pubLookup.letter.views
      expiresAt = pubLookup.letter.expires_at
      expiration = pubLookup.letter.expiration === 'permanent' ? 'never' : (pubLookup.letter.expiration as '24h' | '7d')
      letter = {
        id: pubLookup.letter.id,
        user_id: pubLookup.letter.user_id,
        receiver_name: pubLookup.letter.receiver_name,
        relationship: null,
        emotion: null,
        style: null,
        era_style: 'vintage',
        language: 'bengali',
        memory_context: null,
        content: pubLookup.letter.letter_content,
        letter_content: pubLookup.letter.letter_content,
        status: 'published',
        favorite: false,
        share_slug: pubLookup.letter.short_id,
        is_public: pubLookup.letter.is_public,
        created_at: pubLookup.letter.created_at,
        updated_at: pubLookup.letter.created_at,
      }
    }
  }

  // 3. Tertiary fallback: legacy letters table
  if (!letter && status === 'not_found') {
    let legacy = await getLetterBySlug(id, true)
    if (!legacy) {
      legacy = await getLetterById(id, true)
    }
    if (legacy) {
      letter = legacy
      status = 'ok'
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-chithi-gradient selection:bg-rose-100 selection:text-rose-800">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-12 flex flex-col items-center justify-center">
        {status === 'expired' ? (
          /* Expired State */
          <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-amber-200 dark:border-amber-900/50 rounded-3xl p-8 sm:p-12 text-center max-w-md w-full space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <h2 className="font-bengali font-bold text-xl text-neutral-900 dark:text-neutral-100">
              চিঠির মেয়াদ শেষ হয়ে গেছে
            </h2>
            <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              চিঠির প্রেরক এটি সাময়িক সময়ের ({expiration === '24h' ? '২৪ ঘণ্টা' : '৭ দিন'}) জন্য সক্রিয় রেখেছিলেন। বর্তমানে লিংকটির মেয়াদ উত্তীর্ণ হয়েছে।
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition-colors min-h-[44px]"
              >
                <Feather className="w-4 h-4" />
                <span>নতুন একটি চিঠি লিখুন</span>
              </Link>
            </div>
          </div>
        ) : status === 'private' ? (
          /* Private State */
          <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-rose-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-12 text-center max-w-md w-full space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="font-bengali font-bold text-xl text-neutral-900 dark:text-neutral-100">
              এটি একটি ব্যক্তিগত চিঠি (Private Letter)
            </h2>
            <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              প্রেরক এই চিঠিটি প্রাইভেট বা সুরক্ষিত রেখেছেন। এটি সবার জন্য উন্মুক্ত নয়।
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold bg-neutral-800 dark:bg-neutral-700 hover:bg-neutral-900 dark:hover:bg-neutral-600 text-white shadow-xs transition-colors min-h-[44px]"
              >
                <span>মূল পাতায় ফিরে যান</span>
              </Link>
            </div>
          </div>
        ) : !letter ? (
          /* Not Found */
          <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-rose-100 dark:border-neutral-800 rounded-3xl p-8 sm:p-12 text-center max-w-md w-full space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto">
              <FileQuestion className="w-7 h-7" />
            </div>
            <h2 className="font-bengali font-bold text-xl text-neutral-900 dark:text-neutral-100">
              চিঠিটি খুঁজে পাওয়া যায়নি
            </h2>
            <p className="font-bengali text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              এই চিঠিটির লিংক ভুল হতে পারে অথবা প্রেরক এটি সরিয়ে ফেলেছেন।
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bengali text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition-colors min-h-[44px]"
              >
                <Feather className="w-4 h-4" />
                <span>নতুন একটি চিঠি লিখুন</span>
              </Link>
            </div>
          </div>
        ) : (
          /* OK — Render Vintage Letter Experience */
          <AnonymousLetterReader
            receiverName={letter.recipient_name || letter.receiver_name || 'প্রিয়জন'}
            content={letter.letter_content || letter.content}
            relationship={letter.relationship}
            eraStyle={letter.era_style || letter.letter_style}
            createdAt={letter.created_at}
            slug={shareToken}
            views={views}
            expiresAt={expiresAt}
            expiration={expiration}
          />
        )}
      </main>

      <footer className="w-full border-t border-rose-100/80 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xs py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-1">
          <p className="font-bengali text-xs text-neutral-600 dark:text-neutral-400 font-medium">
            চিঠি লেখাই AI (Chithi Lekhi AI) — &ldquo;যে কথা মুখে বলা যায় না, চিঠিতে লিখে ফেলুন।&rdquo;
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-sans">
            100% Private, Anonymous & Beautiful
          </p>
        </div>
      </footer>
    </div>
  )
}
