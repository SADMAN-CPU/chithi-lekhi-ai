'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Global Fatal Crash]:', error)
  }, [error])

  return (
    <html lang="bn">
      <body className="min-h-screen bg-rose-50/40 text-neutral-900 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center space-y-6 shadow-xl border border-rose-200">
          <div className="text-4xl">💌⚠️</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">একটি সমস্যা ঘটেছে</h1>
            <p className="text-sm text-neutral-600">
              অ্যাপ্লিকেশনে ত্রুটি দেখা দিয়েছে। পৃষ্ঠাটি রিলোড বা হোমপেজে ফিরে যান।
            </p>
            <p className="text-xs text-neutral-500 font-mono">
              An application error occurred.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => reset()}
              className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium text-sm transition-all cursor-pointer min-h-[44px]"
            >
              পুনরায় চেষ্টা করুন (Retry)
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-medium text-sm transition-all min-h-[44px] inline-flex items-center justify-center"
            >
              হোমে যান (Home)
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
