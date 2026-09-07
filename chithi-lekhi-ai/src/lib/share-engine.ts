/**
 * 💌 Chithi Lekhi AI — Universal Share Engine
 *
 * Single shareLetter() function used by ALL sharing surfaces:
 *   - LetterPreviewCard (WhatsApp, Copy)
 *   - ShareLetterModal (WhatsApp, Facebook, Messenger, Telegram, Email, LinkedIn, Copy, Native)
 *   - VintageLetterVisualStudio (Social Share)
 *   - AnonymousLetterReader & PublicLetterViewer
 *
 * Guarantees the receiver always lands on the same vintage letter experience.
 */

export type SharePlatform =
  | 'whatsapp'
  | 'facebook'
  | 'messenger'
  | 'telegram'
  | 'email'
  | 'linkedin'
  | 'copy'
  | 'native'

export interface ShareLetterOptions {
  platform: SharePlatform
  /** Public share URL (e.g. https://chithi.ai/read/abc123) */
  shareUrl?: string
  /** Raw letter text — used as fallback when no shareUrl exists */
  letterText: string
  /** Recipient name to personalise message */
  receiverName: string
  /** Optional: letter title for email subject */
  title?: string
}

export interface ShareResult {
  success: boolean
  /** Bengali user-facing message */
  message: string
  /** Optional metadata about the action triggered */
  action?: string
}

export interface SharePlatformMetadata {
  id: SharePlatform
  nameBn: string
  nameEn: string
  brandColor: string
  hoverColor: string
  textColor: string
}

export const SHARE_PLATFORM_CONFIGS: Record<SharePlatform, SharePlatformMetadata> = {
  whatsapp: {
    id: 'whatsapp',
    nameBn: 'হোয়াটসঅ্যাপ',
    nameEn: 'WhatsApp',
    brandColor: '#25D366',
    hoverColor: '#20bd5a',
    textColor: '#ffffff',
  },
  facebook: {
    id: 'facebook',
    nameBn: 'ফেসবুক',
    nameEn: 'Facebook',
    brandColor: '#1877F2',
    hoverColor: '#166fe5',
    textColor: '#ffffff',
  },
  messenger: {
    id: 'messenger',
    nameBn: 'মেসেঞ্জার',
    nameEn: 'Messenger',
    brandColor: '#0084FF',
    hoverColor: '#0078e6',
    textColor: '#ffffff',
  },
  telegram: {
    id: 'telegram',
    nameBn: 'টেলিগ্রাম',
    nameEn: 'Telegram',
    brandColor: '#229ED9',
    hoverColor: '#1e8ec3',
    textColor: '#ffffff',
  },
  email: {
    id: 'email',
    nameBn: 'ইমেইল',
    nameEn: 'Email',
    brandColor: '#EA4335',
    hoverColor: '#d63b2f',
    textColor: '#ffffff',
  },
  linkedin: {
    id: 'linkedin',
    nameBn: 'লিঙ্কডইন',
    nameEn: 'LinkedIn',
    brandColor: '#0A66C2',
    hoverColor: '#095196',
    textColor: '#ffffff',
  },
  copy: {
    id: 'copy',
    nameBn: 'লিংক কপি',
    nameEn: 'Copy Link',
    brandColor: '#475569',
    hoverColor: '#334155',
    textColor: '#ffffff',
  },
  native: {
    id: 'native',
    nameBn: 'মোবাইল শেয়ার',
    nameEn: 'Share Sheet',
    brandColor: '#8B5CF6',
    hoverColor: '#7C3AED',
    textColor: '#ffffff',
  },
}

/**
 * Build a human-friendly personalized sharing message.
 * Prefers the share URL; falls back to letter text excerpt.
 */
export function buildShareMessage(opts: ShareLetterOptions): string {
  const name = opts.receiverName || 'তোমার প্রিয়জন'
  if (opts.shareUrl) {
    return `💌 ${name}-এর জন্য একটি বিশেষ চিঠি এসেছে, পড়ে দেখো:\n\n${opts.shareUrl}\n\n— চিঠি লেখাই AI (Chithi Lekhi AI)`
  }
  const excerpt = opts.letterText.slice(0, 250).trim()
  return `💌 ${name}-এর জন্য একটি চিঠি:\n\n${excerpt}…\n\n— চিঠি লেখাই AI (Chithi Lekhi AI)`
}

/**
 * Core universal share dispatcher.
 * All sharing surfaces in the app call this function.
 */
export async function shareLetter(opts: ShareLetterOptions): Promise<ShareResult> {
  const { platform, shareUrl, letterText, receiverName } = opts

  if (typeof window === 'undefined') {
    return {
      success: true,
      message: 'SSR environment detected, share action simulated.',
      action: 'window_open',
    }
  }

  const targetUrl = shareUrl || window.location.href
  const message = buildShareMessage(opts)

  try {
    switch (platform) {
      // ─── 1. WhatsApp ────────────────────────────────────────────────────────
      case 'whatsapp': {
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`
        window.open(waUrl, '_blank', 'noopener,noreferrer')
        return { success: true, message: 'হোয়াটসঅ্যাপ খুলছে...' }
      }

      // ─── 2. Facebook ────────────────────────────────────────────────────────
      case 'facebook': {
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}&quote=${encodeURIComponent(message)}`
        window.open(fbUrl, '_blank', 'noopener,noreferrer')
        return { success: true, message: 'ফেসবুক শেয়ার খুলছে...' }
      }

      // ─── 3. Messenger ───────────────────────────────────────────────────────
      case 'messenger': {
        const isMobile =
          typeof navigator !== 'undefined' &&
          /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

        if (isMobile) {
          const deepLink = `fb-messenger://share/?link=${encodeURIComponent(targetUrl)}`
          window.location.href = deepLink
        } else {
          const dialogUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(
            targetUrl
          )}&app_id=291494419107518&redirect_uri=${encodeURIComponent(targetUrl)}`
          window.open(dialogUrl, '_blank', 'noopener,noreferrer')
        }
        return { success: true, message: 'মেসেঞ্জার খুলছে...' }
      }

      // ─── 4. Telegram ────────────────────────────────────────────────────────
      case 'telegram': {
        const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(targetUrl)}&text=${encodeURIComponent(message)}`
        window.open(tgUrl, '_blank', 'noopener,noreferrer')
        return { success: true, message: 'টেলিগ্রাম খুলছে...' }
      }

      // ─── 5. LinkedIn ────────────────────────────────────────────────────────
      case 'linkedin': {
        const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(targetUrl)}`
        window.open(liUrl, '_blank', 'noopener,noreferrer')
        return { success: true, message: 'লিঙ্কডইন খুলছে...' }
      }

      // ─── 6. Email ───────────────────────────────────────────────────────────
      case 'email': {
        const subject = encodeURIComponent(`💌 ${receiverName}-এর জন্য একটি চিঠি এসেছে`)
        const bodyText = shareUrl
          ? `প্রিয় ${receiverName},\n\nতোমার জন্য চিঠি লেখাই AI-এর মাধ্যমে একটি বিশেষ চিঠি পাঠানো হয়েছে। পড়ে দেখার জন্য নিচের লিংকে ক্লিক করো:\n\n${shareUrl}\n\n— চিঠি লেখাই AI`
          : `প্রিয় ${receiverName},\n\n${letterText.slice(0, 500)}\n\n— চিঠি লেখাই AI`
        const body = encodeURIComponent(bodyText)
        window.location.href = `mailto:?subject=${subject}&body=${body}`
        return { success: true, message: 'ইমেইল অ্যাপ খুলছে...' }
      }

      // ─── 7. Copy Link ───────────────────────────────────────────────────────
      case 'copy': {
        const textToCopy = targetUrl
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textToCopy)
          } else {
            throw new Error('Clipboard API unavailable')
          }
        } catch {
          // Fallback for older browsers / iOS webview
          const ta = document.createElement('textarea')
          ta.value = textToCopy
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          ta.style.left = '-9999px'
          document.body.appendChild(ta)
          ta.focus()
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        return {
          success: true,
          message: 'লিংক সফলভাবে কপি হয়েছে!',
        }
      }

      // ─── 8. Native Mobile Share Sheet ───────────────────────────────────────
      case 'native': {
        if (typeof navigator === 'undefined' || !navigator.share) {
          return shareLetter({ ...opts, platform: 'copy' })
        }
        const shareData: ShareData = {
          title: `চিঠি — ${receiverName} 💌`,
          text: message,
          url: targetUrl,
        }
        await navigator.share(shareData)
        return { success: true, message: 'শেয়ার সম্পন্ন হয়েছে!' }
      }

      default:
        return { success: false, message: 'অজানা মাধ্যম' }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, message: 'শেয়ার বাতিল করা হয়েছে।' }
    }
    console.error('[share-engine] share failed:', err)
    return { success: false, message: 'শেয়ার করতে সমস্যা হয়েছে।' }
  }
}
