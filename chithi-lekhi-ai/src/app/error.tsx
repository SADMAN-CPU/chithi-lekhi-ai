'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Root Error Boundary caught]:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-chithi-gradient flex items-center justify-center p-4 sm:p-6 text-foreground">
      <div className="max-w-md w-full paper-card rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-xl border border-rose-200/60 dark:border-neutral-800">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold font-bengali text-neutral-900 dark:text-neutral-100">
            কিছু একটা সমস্যা হয়েছে
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-bengali">
            চিঠি প্রক্রিয়াকরণে অপ্রত্যাশিত ত্রুটি ঘটেছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।
          </p>
          <p className="text-xs text-neutral-500 font-mono pt-1">
            Something unexpected occurred. Please try again.
          </p>
        </div>

        {error.digest && (
          <p className="text-[10px] text-neutral-400 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bengali text-sm font-medium shadow-sm transition-transform active:scale-95 cursor-pointer min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>পুনরায় চেষ্টা করুন (Retry)</span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bengali text-sm font-medium transition-colors min-h-[44px]"
          >
            <Home className="w-4 h-4" />
            <span>হোমে যান (Home)</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
