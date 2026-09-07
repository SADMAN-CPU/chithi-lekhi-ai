import React from 'react'
import Link from 'next/link'
import { FileQuestion, PenTool, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-chithi-gradient flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full paper-card rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-xl border border-rose-200/60 dark:border-neutral-800 animate-in fade-in-50 duration-300">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-200/50 dark:border-rose-900/40">
            404 • পৃষ্ঠা পাওয়া যায়নি
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-bengali text-neutral-900 dark:text-neutral-100">
            চিঠিটি খুঁজে পাওয়া যায়নি
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-bengali leading-relaxed">
            আপনি যে ঠিকানাটি খুঁজছেন তা মুছে ফেলা হতে পারে অথবা লিংকটির মেয়াদ শেষ হয়ে গেছে।
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            The letter or page you are looking for does not exist or has expired.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bengali text-sm font-medium shadow-sm transition-transform active:scale-95 cursor-pointer min-h-[44px]"
          >
            <PenTool className="w-4 h-4" />
            <span>নতুন চিঠি লিখুন (Write Letter)</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bengali text-sm font-medium transition-colors min-h-[44px]"
          >
            <Home className="w-4 h-4" />
            <span>হোমপেজ (Home)</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
