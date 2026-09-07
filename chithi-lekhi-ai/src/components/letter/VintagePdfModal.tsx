'use client'

import React, { useState, useRef, useMemo } from 'react'
import {
  X,
  Download,
  Sparkles,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { PDF_THEMES, type PdfThemeId, exportMultiPageA4Pdf } from '@/lib/export-utils'
import { partitionLetterIntoPages, type FontSizeChoice } from '@/lib/letter-layout-engine'
import { LetterCanvas, type CanvasThemeId } from './LetterCanvas'
import { useLanguage } from '@/components/providers/LanguageProvider'

// Map PDF theme IDs → LetterCanvas theme IDs (they share the same keys now)
const PDF_THEME_TO_CANVAS: Record<PdfThemeId, CanvasThemeId> = {
  'old-love': 'old-love',
  'mother-letter': 'mother-letter',
  '90s-post': '90s-post',
  'royal-vintage': 'royal-vintage',
}

interface VintagePdfModalProps {
  letter: string
  receiverName: string
  relationship?: string
  date?: string
  language?: string
  onClose: () => void
}

export function VintagePdfModal({
  letter,
  receiverName,
  relationship,
  date,
  language,
  onClose,
}: VintagePdfModalProps) {
  const { locale } = useLanguage()
  const [selectedTheme, setSelectedTheme] = useState<PdfThemeId>('old-love')
  const [fontSizeChoice, setFontSizeChoice] = useState<FontSizeChoice>('auto')
  const [activePageIndex, setActivePageIndex] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  /**
   * Ref for the hidden batch container holding ALL pages simultaneously.
   *
   * FIX: The container uses position:fixed; opacity:0 instead of left:-9999px.
   * Mobile Safari (WebKit) renders off-viewport elements as blank frames when
   * using html-to-image. With position:fixed + opacity:0, the browser paints
   * the elements into the compositor layer even though they are invisible,
   * allowing html-to-image to capture them correctly.
   */
  const batchPagesContainerRef = useRef<HTMLDivElement>(null)

  const _themeConfig = PDF_THEMES[selectedTheme] || PDF_THEMES['old-love']
  const canvasThemeId = PDF_THEME_TO_CANVAS[selectedTheme]

  // Dynamic Pagination Engine
  const layout = useMemo(
    () => partitionLetterIntoPages(letter, { ratio: 'a4', fontSizeChoice }),
    [letter, fontSizeChoice]
  )

  const totalPages = layout.pages.length
  const currentPageSafeIndex = Math.min(activePageIndex, totalPages - 1)

  // ── PDF Download ─────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (isExporting) return
    if (!batchPagesContainerRef.current) return

    const pageElements = Array.from(
      batchPagesContainerRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]')
    )

    if (pageElements.length === 0) {
      setExportError(
        locale === 'en'
          ? 'Pages not loaded. Please close modal and try again.'
          : 'পৃষ্ঠা লোড হয়নি। মডাল বন্ধ করে আবার চেষ্টা করুন।'
      )
      return
    }

    setIsExporting(true)
    setExportError(null)
    setExportMessage(locale === 'en' ? 'Generating letter PDF...' : 'আপনার চিঠির PDF তৈরি হচ্ছে...')

    try {
      const filename = `chithi-${(receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}-${selectedTheme}.pdf`

      await exportMultiPageA4Pdf(pageElements, filename, (msg) => {
        setExportMessage(msg)
      })

      // Non-blocking analytics
      fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'pdf' }),
      }).catch(() => {})

      setExportMessage(locale === 'en' ? 'Download Complete! 🎉' : 'ডাউনলোড সম্পন্ন! 🎉')
      setTimeout(() => setExportMessage(null), 2500)
    } catch (err) {
      console.error('[VintagePdfModal] PDF export failed:', err)
      setExportMessage(null)
      setExportError(
        locale === 'en' ? 'Could not generate PDF, please try again' : 'PDF তৈরি করা যায়নি, আবার চেষ্টা করুন'
      )
      setTimeout(() => setExportError(null), 4000)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="my-auto w-full max-w-4xl bg-white/95 dark:bg-neutral-900/95 rounded-3xl shadow-2xl border border-rose-100 dark:border-neutral-800 flex flex-col max-h-[94vh] overflow-hidden">

        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 bg-rose-50/40 dark:bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bengali font-bold text-base text-neutral-900 dark:text-neutral-100 leading-tight">
                  {locale === 'en' ? 'Vintage A4 Print-Ready Letter' : 'ভিন্টেজ এ৪ (A4) প্রিন্ট-রেডি চিঠি'}
                </h3>
                <span className="text-[11px] font-bengali font-semibold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-rose-200/50 dark:border-rose-900/40">
                  <FileText className="w-3 h-3" />
                  <span>{locale === 'en' ? `Total ${totalPages} Page${totalPages > 1 ? 's' : ''}` : `মোট ${totalPages} পৃষ্ঠা`}</span>
                </span>
              </div>
              <p className="text-[11px] font-bengali text-neutral-500 dark:text-neutral-400">
                {locale === 'en'
                  ? 'Auto pagination • Zero text crop • 300 DPI print quality'
                  : 'স্বয়ংক্রিয় পেজিনেশন • জিরো টেক্সট ক্রপ • ৩০০ ডিপিআই প্রিন্ট কোয়ালিটি'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme and Controls Bar */}
        <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 flex flex-wrap items-center justify-between gap-3">
          {/* Theme Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bengali font-medium text-neutral-600 dark:text-neutral-400 mr-1">
              {locale === 'en' ? 'Theme:' : 'থিম:'}
            </span>
            {(Object.keys(PDF_THEMES) as PdfThemeId[]).map((themeKey) => {
              const item = PDF_THEMES[themeKey]
              const isSelected = selectedTheme === themeKey
              return (
                <button
                  key={themeKey}
                  type="button"
                  onClick={() => setSelectedTheme(themeKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bengali font-medium transition-all flex items-center gap-1.5 border min-h-[40px] cursor-pointer ${
                    isSelected
                      ? 'border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 shadow-xs font-semibold'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-750'
                  }`}
                >
                  <span>{item.emoji}</span>
                  <span>{locale === 'en' ? item.nameEn : item.nameBn.split('(')[0]}</span>
                </button>
              )
            })}

            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1 hidden sm:block" />

            {/* Font Size */}
            <div className="flex items-center gap-1 text-xs font-bengali">
              <span className="text-neutral-500 dark:text-neutral-400 mr-0.5">
                {locale === 'en' ? 'Font:' : 'ফন্ট:'}
              </span>
              {(
                [
                  { id: 'auto', label: locale === 'en' ? 'Auto' : 'অটো' },
                  { id: 'normal', label: locale === 'en' ? 'Normal' : 'স্বাভাবিক' },
                  { id: 'large', label: locale === 'en' ? 'Large' : 'বড়' },
                  { id: 'small', label: locale === 'en' ? 'Small' : 'ছোট' },
                ] as const
              ).map((fs) => (
                <button
                  key={fs.id}
                  type="button"
                  onClick={() => setFontSizeChoice(fs.id)}
                  className={`px-2 py-1 rounded-lg transition-all min-h-[36px] cursor-pointer ${
                    fontSizeChoice === fs.id
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 font-bold border border-rose-300 dark:border-rose-800'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
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
            className={`inline-flex items-center gap-2 py-2 px-4 rounded-xl font-bengali text-xs sm:text-sm font-semibold text-white shadow-xs transition-all min-h-[44px] cursor-pointer ${
              isExporting
                ? 'bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed'
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
                (locale === 'en'
                  ? `Download A4 PDF (${totalPages} Page${totalPages > 1 ? 's' : ''})`
                  : `এ৪ পিডিএফ ডাউনলোড (${totalPages} পৃষ্ঠা)`)}
            </span>
          </button>
        </div>

        {/* Error Banner */}
        {exportError && (
          <div className="mx-5 mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-xs font-bengali text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* Page Switcher Strip (multi-page) */}
        {totalPages > 1 && (
          <div className="px-5 py-2 bg-amber-50/60 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/50 flex items-center justify-between text-xs font-bengali text-neutral-700 dark:text-neutral-300">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                {locale === 'en' ? 'Page Preview:' : 'পেজ প্রিভিউ:'}
              </span>
              <div className="flex items-center gap-1">
                {layout.pages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePageIndex(idx)}
                    className={`w-7 h-7 rounded-lg font-sans text-xs font-bold transition-all min-h-[28px] cursor-pointer ${
                      currentPageSafeIndex === idx
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-800 text-neutral-600 dark:text-neutral-300 hover:bg-amber-100 dark:hover:bg-neutral-700'
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
                className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 disabled:opacity-40 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold">
                {locale === 'en'
                  ? `Page ${currentPageSafeIndex + 1} / ${totalPages}`
                  : `পৃষ্ঠা ${currentPageSafeIndex + 1} / ${totalPages}`}
              </span>
              <button
                type="button"
                disabled={currentPageSafeIndex === totalPages - 1}
                onClick={() => setActivePageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 disabled:opacity-40 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Interactive Preview */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-8 bg-neutral-100/80 dark:bg-neutral-950/80 flex justify-center">
          <LetterCanvas
            pageContent={layout.pages[currentPageSafeIndex] || letter}
            pageNum={currentPageSafeIndex + 1}
            totalPages={totalPages}
            isFirstPage={currentPageSafeIndex === 0}
            isLastPage={currentPageSafeIndex === totalPages - 1}
            receiverName={receiverName}
            relationship={relationship}
            date={date}
            language={language || (locale === 'en' ? 'english' : 'bengali')}
            themeId={canvasThemeId}
            fontSizeClass={layout.computedFontSize.cssClass}
            className="w-full max-w-[595px] aspect-[1/1.414] sm:min-h-[842px]"
          />
        </div>

        {/*
         * Hidden batch container rendering ALL pages simultaneously.
         *
         * FIX for mobile Safari blank-page bug:
         *   position:fixed + opacity:0 (NOT left:-9999px)
         *   WebKit clips html-to-image captures of elements that are scrolled
         *   outside the viewport. With position:fixed + opacity:0 the elements
         *   are in the viewport painting tree (invisible to the user) and are
         *   captured correctly by html-to-image.
         *
         *   Width must be explicit (595px = A4 width in CSS px at 96dpi) so the
         *   font metrics match what was laid out by letter-layout-engine.
         */}
        <div
          ref={batchPagesContainerRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
            width: '595px',
          }}
        >
          {layout.pages.map((pageText, idx) => (
            <div key={idx} data-pdf-page="true" style={{ marginBottom: '32px', width: '595px' }}>
              <LetterCanvas
                pageContent={pageText}
                pageNum={idx + 1}
                totalPages={totalPages}
                isFirstPage={idx === 0}
                isLastPage={idx === totalPages - 1}
                receiverName={receiverName}
                relationship={relationship}
                date={date}
                language={language || (locale === 'en' ? 'english' : 'bengali')}
                themeId={canvasThemeId}
                fontSizeClass={layout.computedFontSize.cssClass}
                style={{ minHeight: '842px', width: '595px' }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-bengali text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            ৩০০ ডিপিআই (300 DPI) ভিন্টেজ এ৪ প্রিন্ট • বাংলা যুক্তবর্ণ শতভাগ অক্ষত
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 underline cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  )
}
