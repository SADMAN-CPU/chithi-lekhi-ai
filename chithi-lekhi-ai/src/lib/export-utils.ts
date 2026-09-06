import { formatDate } from '@/utils/helpers'

export type PdfThemeId = 'old-love' | 'mother-letter' | '90s-post' | 'royal-vintage'

export interface PdfThemeConfig {
  id: PdfThemeId
  nameBn: string
  nameEn: string
  emoji: string
  bgClass: string
  borderClass: string
  accentColor: string
  textColor: string
  stampBg: string
  stampBorder: string
  stampText: string
  ornament: string
}

export const PDF_THEMES: Record<PdfThemeId, PdfThemeConfig> = {
  'old-love': {
    id: 'old-love',
    nameBn: 'প্রেমপত্র (Old Love Letter)',
    nameEn: 'Old Love Letter',
    emoji: '💌',
    bgClass: 'bg-[#FFF8F8]',
    borderClass: 'border-[#F4B4C0]',
    accentColor: '#BE123C',
    textColor: '#4C0519',
    stampBg: 'bg-[#FFE4E6]',
    stampBorder: 'border-[#FB7185]',
    stampText: 'text-[#9F1239]',
    ornament: '❦ ❧',
  },
  'mother-letter': {
    id: 'mother-letter',
    nameBn: "মায়ের চিঠি (Mother's Letter)",
    nameEn: "Mother's Letter",
    emoji: '🕊️',
    bgClass: 'bg-[#FAF7F0]',
    borderClass: 'border-[#D5C7A3]',
    accentColor: '#57534E',
    textColor: '#292524',
    stampBg: 'bg-[#F5EFE6]',
    stampBorder: 'border-[#C8B698]',
    stampText: 'text-[#44403C]',
    ornament: '✦ ✧ ✦',
  },
  '90s-post': {
    id: '90s-post',
    nameBn: "৯০-এর ডাকচিঠি (90's Post Letter)",
    nameEn: "90's Post Letter",
    emoji: '✉️',
    bgClass: 'bg-[#F9F6EE]',
    borderClass: 'border-[#C2A677]',
    accentColor: '#1E3A8A',
    textColor: '#1E293B',
    stampBg: 'bg-[#EBF3FB]',
    stampBorder: 'border-[#93C5FD]',
    stampText: 'text-[#1D4ED8]',
    ornament: '══ ✉ ══',
  },
  'royal-vintage': {
    id: 'royal-vintage',
    nameBn: 'রাজকীয় ভিন্টেজ (Royal Vintage)',
    nameEn: 'Royal Vintage',
    emoji: '👑',
    bgClass: 'bg-[#F7F3EB]',
    borderClass: 'border-[#B49A67]',
    accentColor: '#78350F',
    textColor: '#272018',
    stampBg: 'bg-[#F4E8D1]',
    stampBorder: 'border-[#D97706]',
    stampText: 'text-[#B45309]',
    ornament: '❖ ◈ ❖',
  },
}

/**
 * Generate formatted, structured ASCII vintage TXT export
 */
export function generateFormattedTxt(params: {
  letter: string
  receiverName?: string
  relationship?: string
  date?: string
}): string {
  const currentDate = params.date ? formatDate(params.date) : formatDate(new Date().toISOString())
  const recipient = params.receiverName ? `প্রিয় ${params.receiverName}` : 'কাছের মানুষ'
  const relation = params.relationship ? ` (${params.relationship})` : ''

  // Split and format body paragraphs
  const paragraphs = params.letter
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const bodyContent = paragraphs.join('\n\n')

  return `┌────────────────────────────────────────────────────────┐
│                   চিঠি লেখাই এআই                       │
│               CHITHI LEKHI AI ARCHIVE                  │
└────────────────────────────────────────────────────────┘

তারিখ: ${currentDate}
প্রাপক: ${recipient}${relation}

──────────────────────────────────────────────────────────

${bodyContent}

──────────────────────────────────────────────────────────
ডাকটিকিট: ঢাকা জিপিও • ১৯৯০-এর স্মৃতি
যে কথা মুখে বলা যায় না, চিঠিতে লিখে ফেলুন 💌
ওয়েবসাইট: https://chithi.ai
──────────────────────────────────────────────────────────`
}

/**
 * Trigger download of Formatted TXT file
 */
export function downloadFormattedTxt(params: {
  letter: string
  receiverName?: string
  relationship?: string
  date?: string
}) {
  const text = generateFormattedTxt(params)
  const filename = `chithi-${(params.receiverName || 'letter').replace(/\s+/g, '-').toLowerCase()}-${Date.now().toString().slice(-4)}.txt`

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Helper to get safe pixelRatio for mobile devices to prevent canvas memory crashes.
 * Mobile Safari 16 crashes with devicePixelRatio > 2.0 for large canvases.
 */
export function getSafePixelRatio(targetRatio = 2.5): number {
  if (typeof window === 'undefined') return 2.0
  const isMobile =
    /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth < 768
  return isMobile ? Math.min(2.0, targetRatio) : targetRatio
}

/**
 * Capture a DOM element as a PNG data URL.
 *
 * The element MUST be visible in the document for html-to-image to work correctly.
 * Use position:fixed + opacity:0 rather than left:-9999px (mobile Safari renders
 * off-viewport elements as blank frames).
 *
 * @param element   - The DOM element to capture
 * @param pixelRatio - DPI multiplier (clamped on mobile)
 * @param quality   - PNG quality 0-1
 */
export async function captureElementAsPng(
  element: HTMLElement,
  pixelRatio = 2.5,
  quality = 0.98
): Promise<string> {
  const { toPng } = await import('html-to-image')
  const safeRatio = getSafePixelRatio(pixelRatio)
  return toPng(element, {
    cacheBust: true,
    pixelRatio: safeRatio,
    quality,
  })
}

/**
 * Render and export a DOM element as a high-resolution A4 PDF.
 * Dynamically loads jspdf and html-to-image on demand.
 */
export async function exportElementToA4Pdf(
  element: HTMLElement,
  filename: string,
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('উচ্চ রেজোলিউশন ডকুমেন্ট রেন্ডার হচ্ছে...')

  // Dynamically import heavy libraries
  const [, { default: jsPDF }] = await Promise.all([
    import('html-to-image'),
    import('jspdf'),
  ])

  const pixelRatio = getSafePixelRatio(2.5)
  const dataUrl = await captureElementAsPng(element, pixelRatio, 0.98)

  onProgress?.('এ৪ (A4) প্রিন্ট-রেডি পিডিএফ সংকলন চলছে...')

  // A4 dimensions in mm: 210mm x 297mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pdfWidth = pdf.internal.pageSize.getWidth() // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm

  // Insert image scaled to exact full A4 page
  pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')

  onProgress?.('ডাউনলোড সম্পন্ন হচ্ছে...')
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

/**
 * Render and compile multiple DOM elements into a single multi-page A4 PDF.
 * Dynamically loads jspdf and html-to-image on demand.
 *
 * IMPORTANT: Elements must be visible in the DOM (position:fixed; opacity:0)
 * rather than translated off-screen (left:-9999px) — mobile Safari returns
 * blank frames for off-viewport elements.
 */
export async function exportMultiPageA4Pdf(
  elements: HTMLElement[],
  filename: string,
  onProgress?: (msg: string) => void
): Promise<void> {
  if (elements.length === 0) {
    throw new Error('কোনো পৃষ্ঠা পাওয়া যায়নি')
  }

  onProgress?.('আপনার চিঠির PDF তৈরি হচ্ছে...')

  const { default: jsPDF } = await import('jspdf')
  const pixelRatio = getSafePixelRatio(2.5)

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pdfWidth = pdf.internal.pageSize.getWidth() // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm

  for (let i = 0; i < elements.length; i++) {
    onProgress?.(`পৃষ্ঠা ${i + 1}/${elements.length} রেন্ডার হচ্ছে...`)

    // Small delay to let browser paint the element before capture
    await new Promise((r) => setTimeout(r, 80))

    const dataUrl = await captureElementAsPng(elements[i], pixelRatio, 0.98)

    if (i > 0) {
      pdf.addPage('a4', 'portrait')
    }

    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
  }

  onProgress?.('পিডিএফ সংকলন সম্পন্ন হচ্ছে...')
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

/**
 * Export a single element as a merged/continuous PNG (for long letters).
 * The element should have dynamic height (height: auto) to capture the full content.
 */
export async function exportMergedLetterPng(
  element: HTMLElement,
  filename: string,
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('সম্পূর্ণ চিঠি একটানা ছবিতে রূপান্তর হচ্ছে...')
  const pixelRatio = getSafePixelRatio(2.5)
  const dataUrl = await captureElementAsPng(element, pixelRatio, 0.98)

  onProgress?.('ডাউনলোড শুরু হচ্ছে...')
  const link = document.createElement('a')
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`
  link.href = dataUrl
  link.click()
}
