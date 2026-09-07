import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Generate a random alphanumeric slug for public letter sharing */
export function generateSlug(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/** Format a date in a human-readable way (Bengali or English) */
export function formatDate(dateString: string, locale: string = 'bn'): string {
  const intlLocale = locale === 'en' ? 'en-US' : 'bn-BD'
  try {
    return new Intl.DateTimeFormat(intlLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString))
  } catch {
    return dateString
  }
}

/** Truncate text to a given length with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

/** Build a WhatsApp share URL */
export function buildWhatsAppUrl(text: string, url?: string): string {
  const message = url ? `${text}\n\n${url}` : text
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`
}

/** 
 * Comprehensive input sanitizer:
 * - Strips null bytes & invisible control characters
 * - Multi-pass HTML tag removal (defeats nested tag bypasses like <<script>script>)
 * - Neutralizes script/data URIs (javascript:, vbscript:, data:)
 * - Strips inline event handlers (onerror=, onload=, etc.)
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''

  // 1. Remove null bytes and non-printable control characters (keep \r, \n, \t)
  let clean = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // 2. Multi-pass tag stripping until clean (defeats recursive nesting tricks)
  let prev = ''
  while (clean !== prev) {
    prev = clean
    clean = clean.replace(/<[^>]*>/gi, '')
  }

  // 3. Strip script / dangerous URI protocols
  clean = clean.replace(/(?:javascript|vbscript|data):/gi, '')

  // 4. Strip dangerous HTML attribute event patterns
  clean = clean.replace(/on\w+\s*=/gi, '')

  // 5. Strip any rogue unclosed angle brackets
  clean = clean.replace(/[<>]/g, '')

  return clean.trim()
}

/**
 * Safely extract human-readable error string from various error formats:
 * - Plain string
 * - ApiError object ({ message, code, status })
 * - Error instance (err.message)
 * - Nested { error: ... } objects
 * - Prevents [object Object] rendering in UI
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'চিঠি তৈরিতে কিছু সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
): string {
  if (!error) return fallback

  if (typeof error === 'string') {
    const trimmed = error.trim()
    return trimmed.length > 0 ? trimmed : fallback
  }

  if (error instanceof Error) {
    return error.message || fallback
  }

  if (typeof error === 'object') {
    const record = error as Record<string, unknown>

    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message.trim()
    }

    if ('error' in record) {
      return getErrorMessage(record.error, fallback)
    }
  }

  return fallback
}


