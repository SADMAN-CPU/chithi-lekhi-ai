'use client'

import React, { useState, useRef, useMemo } from 'react'
import {
  X,
  Download,
  Sparkles,
  Feather,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import {
  PDF_THEMES,
  type PdfThemeId,
  exportMultiPageA4Pdf,
} from '@/lib/export-utils'
import {
  partitionLetterIntoPages,
  type FontSizeChoice,
} from '@/lib/letter-layout-engine'
import { formatDate } from '@/utils/helpers'

interface VintagePdfModalProps {
  letter: string
  receiverName: string
  relationship?: string
  date?: string
  onClose: () => void
}

export function VintagePdfModal({
  letter,
  receiverName,
  relationship,
  date,
  onClose,
}: VintagePdfModalProps) {
  const [selectedTheme, setSelectedTheme] = useState<PdfThemeId>('old-love')
  const [fontSizeChoice, setFontSizeChoice] = useState<FontSizeChoice>('auto')
  const [activePageIndex, setActivePageIndex] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  // Container refs for multi-page batch rendering
  const batchPagesContainerRef = useRef<HTMLDivElement>(null)

  const themeConfig = PDF_THEMES[selectedTheme] || PDF_THEMES['old-love']
  const formattedDate = date ? formatDate(date) : formatDate(new Date().toISOString())

  // Dynamic Pagination Engine: Splits letter cleanly across A4 pages without text cutoff
  const layout = useMemo(() => {
    return partitionLetterIntoPages(letter, {
      ratio: 'a4',
      fontSizeChoice,
    })
  }, [letter, fontSizeChoice])

  const totalPages = layout.pages.length

  // Ensure active page stays within valid bounds
  const currentPageSafeIndex = Math.min(activePageIndex, totalPages - 1)

  // Handle Multi-Page A4 PDF Compilation & Download
  const handleDownloadPdf = async () => {
    if (!batchPagesContainerRef.current) return

    const pageElements = Array.from(
      batchPagesContainerRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]')
    )

    if (pageElements.length === 0) return

    setIsExporting(true)
    setExportMessage('পিডিএফ সংকলন শুরু হচ্ছে...')

    try {
      const filename = `chithi-${(receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}-${selectedTheme}.pdf`

      await exportMultiPageA4Pdf(pageElements, filename, (msg) => {
        setExportMessage(msg)
      })

      // Record download in download history (Phase 5/6 SaaS)
      try {
        await fetch('/api/downloads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: 'pdf' }),
        })
      } catch {
        // Non-blocking
      }

      setExportMessage('ডাউনলোড সম্পন্ন! 🎉')
      setTimeout(() => {
        setExportMessage(null)
      }, 2500)
    } catch (err) {
      console.error('PDF export failed:', err)
      setExportMessage('পিডিএফ রেন্ডারে সমস্যা হয়েছে।')
      setTimeout(() => setExportMessage(null), 3000)
    } finally {
      setIsExporting(false)
    }
  }

  // Helper renderer for a single A4 page
  const renderA4PageContent = (pageContent: string, pageNum: number, total: number) => {
    const isFirstPage = pageNum === 1
    const isLastPage = pageNum === total

    return (
      <div
        className={`w-full max-w-[595px] min-h-[842px] ${themeConfig.bgClass} border-4 double ${themeConfig.borderClass} rounded-sm shadow-xl p-8 sm:p-12 flex flex-col justify-between relative transition-colors duration-300 select-text`}
        style={{
          backgroundImage: 'radial-gradient(#d3c5ad 0.7px, transparent 0.7px)',
          backgroundSize: '22px 22px',
        }}
      >
        {/* Top Header */}
        {isFirstPage ? (
          <div className="flex items-start justify-between border-b border-black/10 pb-5 mb-5 select-none">
            <div>
              <span className="text-[10px] font-sans font-semibold tracking-widest uppercase opacity-60 block">
                VINTAGE AIRMAIL ARCHIVE
              </span>
              <h1 className="font-bengali font-bold text-2xl text-neutral-900 mt-1">
                প্রিয় {receiverName || 'কাছের মানুষ'}
              </h1>
              <div className="flex items-center gap-2 text-xs font-bengali opacity-70 mt-1">
                <span>তারিখ: {formattedDate}</span>
                {relationship && <span>• {relationship}</span>}
              </div>
            </div>

            {/* Stamp Badge */}
            <div className="flex items-center gap-2 select-none pointer-events-none">
              <div
                className={`w-14 h-16 border-2 border-dashed ${themeConfig.stampBorder} ${themeConfig.stampBg} rounded-sm flex flex-col items-center justify-center p-1 shadow-2xs rotate-2`}
              >
                <Feather className={`w-5 h-5 ${themeConfig.stampText} opacity-80 mb-0.5`} />
                <span
                  className={`text-[8px] font-sans font-bold uppercase tracking-wider ${themeConfig.stampText}`}
                >
                  CHITHI
                </span>
                <span className={`text-[7px] font-bengali ${themeConfig.stampText} opacity-80`}>
                  ডাকটিকিট
                </span>
              </div>
              <div className="w-10 h-10 rounded-full border border-neutral-400 flex items-center justify-center -rotate-12 opacity-50">
                <span className="text-[7px] font-mono font-bold tracking-tighter text-neutral-600">
                  DHAKA GPO
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Running Header for Subsequent Pages */
          <div className="flex items-center justify-between border-b border-black/10 pb-3 mb-5 select-none text-xs font-bengali opacity-60">
            <span>চিঠি লেখাই এআই • প্রিয় {receiverName}</span>
            <span>
              পৃষ্ঠা {pageNum} / {total}
            </span>
          </div>
        )}

        {/* Letter Body Chunk */}
        <div
          className={`flex-1 font-bengali ${layout.computedFontSize.cssClass} whitespace-pre-wrap select-text my-2`}
          style={{ color: themeConfig.textColor }}
        >
          {pageContent}
        </div>

        {/* Page Footer */}
        <div className="pt-4 border-t border-black/10 flex flex-col items-center justify-center gap-1.5 text-center select-none">
          {isLastPage ? (
            <>
              <span className="text-xs tracking-widest opacity-40 font-serif">
                {themeConfig.ornament}
              </span>
              <div className="flex items-center justify-between w-full text-[11px] font-bengali opacity-60">
                <span>চিঠি লেখাই এআই • Chithi Lekhi AI</span>
                <span>যে কথা মুখে বলা যায় না 💌</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full text-[11px] font-bengali opacity-60">
              <span>
                পৃষ্ঠা {pageNum} / {total}
              </span>
              <span>পরবর্তী পৃষ্ঠায় সমাপ্য... ➔</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="my-auto w-full max-w-4xl bg-white/95 rounded-3xl shadow-2xl border border-rose-100 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 bg-rose-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bengali font-bold text-base text-neutral-900 leading-tight">
                  ভিন্টেজ এ৪ (A4) প্রিন্ট-রেডি চিঠি
                </h3>
                <span className="text-[11px] font-bengali font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>মোট {totalPages} পৃষ্ঠা</span>
                </span>
              </div>
              <p className="text-[11px] font-bengali text-neutral-500">
                স্বয়ংক্রিয় পেজিনেশন • জিরো টেক্সট ক্রপ • ৩০০ ডিপিআই প্রিন্ট কোয়ালিটি
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme and Controls Bar */}
        <div className="px-5 py-3 border-b border-neutral-100 bg-white/90 flex flex-wrap items-center justify-between gap-3">
          {/* Theme Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bengali font-medium text-neutral-600 mr-1">থিম:</span>
            {(Object.keys(PDF_THEMES) as PdfThemeId[]).map((themeKey) => {
              const item = PDF_THEMES[themeKey]
              const isSelected = selectedTheme === themeKey
              return (
                <button
                  key={themeKey}
                  type="button"
                  onClick={() => setSelectedTheme(themeKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bengali font-medium transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'border-rose-400 bg-rose-50 text-rose-800 shadow-2xs font-semibold'
                      : 'border-neutral-200 bg-neutral-50/60 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <span>{item.emoji}</span>
                  <span>{item.nameBn.split('(')[0]}</span>
                </button>
              )
            })}

            <div className="h-4 w-px bg-neutral-200 mx-1 hidden sm:block" />

            <div className="flex items-center gap-1 text-xs font-bengali">
              <span className="text-neutral-500 mr-0.5">ফন্ট:</span>
              {(
                [
                  { id: 'auto', label: 'অটো' },
                  { id: 'normal', label: 'স্বাভাবিক' },
                  { id: 'large', label: 'বড়' },
                  { id: 'small', label: 'ছোট' },
                ] as const
              ).map((fs) => (
                <button
                  key={fs.id}
                  type="button"
                  onClick={() => setFontSizeChoice(fs.id)}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    fontSizeChoice === fs.id
                      ? 'bg-rose-100 text-rose-800 font-bold'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {fs.label}
                </button>
              ))}
            </div>
          </div>

          {/* Download Button */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadPdf}
            className={`inline-flex items-center gap-2 py-2 px-4 rounded-xl font-bengali text-xs sm:text-sm font-semibold text-white shadow-xs transition-all ${
              isExporting
                ? 'bg-neutral-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 active:scale-[0.99]'
            }`}
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {exportMessage ||
                `এ৪ পিডিএফ ডাউনলোড (${totalPages} পৃষ্ঠা)`}
            </span>
          </button>
        </div>

        {/* Page Switcher Strip (if multi-page) */}
        {totalPages > 1 && (
          <div className="px-5 py-2 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between text-xs font-bengali text-neutral-700">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-900">পেজ প্রিভিউ:</span>
              <div className="flex items-center gap-1">
                {layout.pages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePageIndex(idx)}
                    className={`w-6 h-6 rounded-md font-sans text-xs font-bold transition-all ${
                      currentPageSafeIndex === idx
                        ? 'bg-rose-500 text-white shadow-2xs'
                        : 'bg-white border border-amber-200 text-neutral-600 hover:bg-amber-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPageSafeIndex === 0}
                onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded-md border border-amber-200 bg-white hover:bg-amber-100 disabled:opacity-40 transition-colors"
                title="পূর্ববর্তী পৃষ্ঠা"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold">
                পৃষ্ঠা {currentPageSafeIndex + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPageSafeIndex === totalPages - 1}
                onClick={() => setActivePageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                className="p-1 rounded-md border border-amber-200 bg-white hover:bg-amber-100 disabled:opacity-40 transition-colors"
                title="পরবর্তী পৃষ্ঠা"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Interactive Preview Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-neutral-100/80 flex justify-center">
          {renderA4PageContent(
            layout.pages[currentPageSafeIndex] || letter,
            currentPageSafeIndex + 1,
            totalPages
          )}
        </div>

        {/* Hidden Container Rendering All Pages for 1-Click Multi-Page PDF Capture */}
        <div
          ref={batchPagesContainerRef}
          className="absolute left-[-9999px] top-[-9999px] pointer-events-none"
          aria-hidden="true"
        >
          {layout.pages.map((pageText, idx) => (
            <div key={idx} data-pdf-page="true" className="mb-8">
              {renderA4PageContent(pageText, idx + 1, totalPages)}
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-xs font-bengali text-neutral-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            ৩০০ ডিপিআই (300 DPI) ভিন্টেজ এ৪ প্রিন্ট • বাংলা যুক্তবর্ণ শতভাগ অক্ষত
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-800 underline"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  )
}
