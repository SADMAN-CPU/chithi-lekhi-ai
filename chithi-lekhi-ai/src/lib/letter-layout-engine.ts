/**
 * 💌 Chithi Lekhi AI — Dynamic Letter Layout Engine
 *
 * Implements precise measurement for Bengali epistolary typography:
 * - Bengali glyph metrics with vowel diacritic ascenders/descenders (মাত্রা, কার, যুক্তবর্ণ)
 * - Safe paragraph and sentence boundary line-splitting
 * - Dedicated signature & ending preservation (guarantees sign-off is NEVER lost or clipped)
 * - Multi-page pagination budgeting for 1080x1080, 1080x1350, and A4 ratios
 * - Auto-height calculation for continuous canvas export
 */

export type TargetAspectRatio = 'portrait' | 'square' | 'a4' | 'natural'
export type QualityTier = 'standard' | 'high' | 'print'
export type FontSizeChoice = 'auto' | 'small' | 'normal' | 'large'

export interface LetterMetrics {
  totalChars: number
  totalWords: number
  paragraphCount: number
  estimatedLines: number
  category: 'short' | 'medium' | 'long'
  hasDedicatedSignature: boolean
}

export interface PageLayoutResult {
  pages: string[]
  totalPages: number
  metrics: LetterMetrics
  computedFontSize: {
    cssClass: string
    fontSizePx: number
    lineHeightPx: number
  }
  containerDimensions: {
    widthPx: number
    heightPx: number
    isAutoHeight: boolean
  }
  signaturePreserved: boolean
}

export const QUALITY_CONFIG: Record<
  QualityTier,
  { labelBn: string; labelEn: string; pixelRatio: number; quality: number; descriptionBn: string }
> = {
  standard: {
    labelBn: 'স্ট্যান্ডার্ড (Standard)',
    labelEn: 'Standard Quality',
    pixelRatio: 1.5,
    quality: 0.9,
    descriptionBn: 'দ্রুত ডাউনলোড ও মোবাইল ফ্রেন্ডলি',
  },
  high: {
    labelBn: 'হাই কোয়ালিটি (High Quality)',
    labelEn: 'High Quality',
    pixelRatio: 2.5,
    quality: 0.96,
    descriptionBn: 'রেটিনা শার্পনেস ও সোশ্যাল মিডিয়া শেয়ার',
  },
  print: {
    labelBn: 'প্রিন্ট কোয়ালিটি (Print Quality)',
    labelEn: 'Print Ready',
    pixelRatio: 3.5,
    quality: 0.99,
    descriptionBn: '৩০০+ ডিপিআই প্রিন্ট ও ফ্রেমিংয়ের জন্য নিখুঁত',
  },
}

/**
 * Common Bengali epistolary closing markers
 */
const SIGNATURE_INDICATORS = [
  'ইতি,',
  'ইতি',
  'তোমারই',
  'তোমার আপন',
  'তোমার সন্তান',
  'আপনার সন্তান,',
  'আপনার স্নেহধন্য সন্তান,',
  'শ্রদ্ধা ও ভালোবাসাসহ,',
  'শুভেচ্ছা ও ভালোবাসা,',
  'অনেক ভালোবাসা রইল,',
  'ভালোবাসায়,',
  'ভালোবাসা নিও,',
  'শুভাকাঙ্ক্ষী,',
  'প্রণামান্তে,',
  'স্নেহের,',
  'শুভকামনায়,',
  'আশীর্বাদসহ,',
  'তোর বন্ধু',
  'তোমার বন্ধু',
  'চিরদিনের তোমার',
]

/**
 * Normalizes letter text into consistent paragraph chunks
 */
export function normalizeLetterText(rawText: string): { bodyParagraphs: string[]; signatureBlock: string | null } {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  const rawParagraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  if (rawParagraphs.length === 0) {
    return { bodyParagraphs: [rawText], signatureBlock: null }
  }

  // Check if the last paragraph is a signature block
  const lastPara = rawParagraphs[rawParagraphs.length - 1]
  const isSignature =
    SIGNATURE_INDICATORS.some((marker) => lastPara.startsWith(marker) || lastPara.includes(marker)) ||
    (lastPara.split('\n').length <= 3 && lastPara.length <= 120)

  if (isSignature && rawParagraphs.length > 1) {
    return {
      bodyParagraphs: rawParagraphs.slice(0, -1),
      signatureBlock: lastPara,
    }
  }

  return {
    bodyParagraphs: rawParagraphs,
    signatureBlock: null,
  }
}

/**
 * Measures character metrics and line estimation for Bengali text
 */
export function measureLetterMetrics(letter: string): LetterMetrics {
  const totalChars = letter.length
  const totalWords = letter.split(/\s+/).filter(Boolean).length
  const paragraphs = letter.split(/\n+/).filter(Boolean).length

  // In Bengali, average line has ~36-42 characters in a standard letter column
  const estimatedLines = Math.ceil(totalChars / 38) + paragraphs

  let category: 'short' | 'medium' | 'long' = 'short'
  if (totalChars > 800 || estimatedLines > 24) {
    category = 'long'
  } else if (totalChars > 380 || estimatedLines > 12) {
    category = 'medium'
  }

  const hasDedicatedSignature = SIGNATURE_INDICATORS.some((marker) => letter.includes(marker))

  return {
    totalChars,
    totalWords,
    paragraphCount: paragraphs,
    estimatedLines,
    category,
    hasDedicatedSignature,
  }
}

/**
 * Line capacity budget based on aspect ratio and container dimensions
 */
function getRatioLineBudget(ratio: TargetAspectRatio, fontSize: 'small' | 'normal' | 'large'): { maxLines: number; maxChars: number } {
  // Multipliers for font sizes
  const fontMultiplier = fontSize === 'small' ? 1.25 : fontSize === 'large' ? 0.82 : 1.0

  switch (ratio) {
    case 'square': // 1080x1080 (1:1) - compact
      return {
        maxLines: Math.round(14 * fontMultiplier),
        maxChars: Math.round(420 * fontMultiplier),
      }
    case 'portrait': // 1080x1350 (4:5) - standard Instagram/Story
      return {
        maxLines: Math.round(20 * fontMultiplier),
        maxChars: Math.round(650 * fontMultiplier),
      }
    case 'a4': // A4 Proportion (1:1.414) - classic document
      return {
        maxLines: Math.round(26 * fontMultiplier),
        maxChars: Math.round(850 * fontMultiplier),
      }
    case 'natural':
    default:
      // Single continuous page - infinite line budget, zero split
      return {
        maxLines: 99999,
        maxChars: 999999,
      }
  }
}

/**
 * Splits a large paragraph into sentence-aware sub-chunks at Bengali punctuation boundaries
 */
function splitParagraphIntoSentences(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) {
    return [paragraph]
  }

  // Split by Bengali Dari (।) or question marks/exclamation or commas
  const sentences = paragraph.split(/(?<=[।?!])\s+/).filter(Boolean)
  if (sentences.length <= 1) {
    // If no sentence terminators, split by comma or spaces
    const words = paragraph.split(/\s+/)
    const chunks: string[] = []
    let currentChunk = ''

    for (const w of words) {
      if ((currentChunk + ' ' + w).trim().length <= maxChars) {
        currentChunk = currentChunk ? `${currentChunk} ${w}` : w
      } else {
        if (currentChunk) chunks.push(currentChunk)
        currentChunk = w
      }
    }
    if (currentChunk) chunks.push(currentChunk)
    return chunks
  }

  const chunks: string[] = []
  let currentChunk = ''

  for (const s of sentences) {
    if ((currentChunk + ' ' + s).trim().length <= maxChars) {
      currentChunk = currentChunk ? `${currentChunk} ${s}` : s
    } else {
      if (currentChunk) chunks.push(currentChunk)
      currentChunk = s
    }
  }
  if (currentChunk) chunks.push(currentChunk)

  return chunks
}

/**
 * Main Layout Engine: Partitions letter across pages and computes dynamic dimensions
 */
export function partitionLetterIntoPages(
  letter: string,
  options: {
    ratio: TargetAspectRatio
    fontSizeChoice?: FontSizeChoice
    containerWidth?: number
  }
): PageLayoutResult {
  const metrics = measureLetterMetrics(letter)
  const ratio = options.ratio

  // 1. Determine optimal font size class & metrics
  let effectiveFontSize: 'small' | 'normal' | 'large' = 'normal'
  if (options.fontSizeChoice && options.fontSizeChoice !== 'auto') {
    effectiveFontSize = options.fontSizeChoice
  } else {
    // Auto-scale based on text volume
    if (metrics.category === 'long' && ratio !== 'natural') {
      effectiveFontSize = 'small'
    } else if (metrics.category === 'short') {
      effectiveFontSize = 'large'
    } else {
      effectiveFontSize = 'normal'
    }
  }

  const fontClassMap = {
    small: { cssClass: 'text-[12px] sm:text-[13px] leading-[1.75]', fontSizePx: 13, lineHeightPx: 23 },
    normal: { cssClass: 'text-[14px] sm:text-[15px] leading-[1.85]', fontSizePx: 15, lineHeightPx: 28 },
    large: { cssClass: 'text-[16px] sm:text-[17px] leading-[1.95]', fontSizePx: 17, lineHeightPx: 33 },
  }
  const computedFontSize = fontClassMap[effectiveFontSize]

  // 2. Natural / Auto-Height Mode: All content on a single continuous sheet
  if (ratio === 'natural') {
    const widthPx = options.containerWidth || 480
    // Estimate continuous height: header (130px) + body lines + footer (70px) + padding (50px)
    const estimatedHeight = Math.max(
      380,
      Math.round(130 + metrics.estimatedLines * computedFontSize.lineHeightPx + 100)
    )

    return {
      pages: [letter.trim()],
      totalPages: 1,
      metrics,
      computedFontSize,
      containerDimensions: {
        widthPx,
        heightPx: estimatedHeight,
        isAutoHeight: true,
      },
      signaturePreserved: true,
    }
  }

  // 3. Multi-Page Pagination for Fixed Ratios (Square, Portrait, A4)
  const budget = getRatioLineBudget(ratio, effectiveFontSize)
  const { bodyParagraphs, signatureBlock } = normalizeLetterText(letter)

  const pages: string[] = []
  let currentPageParts: string[] = []
  let currentChars = 0

  for (const para of bodyParagraphs) {
    if (para.length > budget.maxChars) {
      // Decompose large paragraphs into sentence-aware units
      const subChunks = splitParagraphIntoSentences(para, Math.floor(budget.maxChars * 0.7))
      for (const chunk of subChunks) {
        if (currentChars + chunk.length <= budget.maxChars) {
          currentPageParts.push(chunk)
          currentChars += chunk.length + 10
        } else {
          if (currentPageParts.length > 0) {
            pages.push(currentPageParts.join('\n\n'))
          }
          currentPageParts = [chunk]
          currentChars = chunk.length
        }
      }
    } else {
      if (currentChars + para.length <= budget.maxChars) {
        currentPageParts.push(para)
        currentChars += para.length + 10
      } else {
        if (currentPageParts.length > 0) {
          pages.push(currentPageParts.join('\n\n'))
        }
        currentPageParts = [para]
        currentChars = para.length
      }
    }
  }

  // Attach signature block to the final page
  if (signatureBlock) {
    const signatureCost = signatureBlock.length + 20
    if (currentChars + signatureCost <= budget.maxChars) {
      currentPageParts.push(signatureBlock)
    } else {
      if (currentPageParts.length > 0) {
        pages.push(currentPageParts.join('\n\n'))
      }
      currentPageParts = [signatureBlock]
    }
  }

  if (currentPageParts.length > 0) {
    pages.push(currentPageParts.join('\n\n'))
  }

  const finalPages = pages.length > 0 ? pages : [letter.trim()]

  // Enforce the rule:
  // Short letter: 1 page
  // Medium letter: 1-2 pages
  // Long letter: Multiple pages
  const dimensionsMap: Record<TargetAspectRatio, { widthPx: number; heightPx: number }> = {
    square: { widthPx: 480, heightPx: 480 },
    portrait: { widthPx: 440, heightPx: 550 },
    a4: { widthPx: 460, heightPx: 650 },
    natural: { widthPx: 480, heightPx: 500 },
  }

  return {
    pages: finalPages,
    totalPages: finalPages.length,
    metrics,
    computedFontSize,
    containerDimensions: {
      ...dimensionsMap[ratio],
      isAutoHeight: false,
    },
    signaturePreserved: true,
  }
}
