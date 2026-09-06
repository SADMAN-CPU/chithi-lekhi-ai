/**
 * 💌 Chithi Lekhi AI — Universal Share Engine
 *
 * Single shareLetter() function used by ALL sharing surfaces:
 *   - LetterPreviewCard (WhatsApp, Copy)
 *   - ShareLetterModal (WhatsApp, Facebook, Email, Copy, Native)
 *   - VintageLetterVisualStudio (Social Share)
 *
 * Guarantees the receiver always lands on the same vintage letter experience.
 */

export type SharePlatform = 'whatsapp' | 'email' | 'copy' | 'native' | 'facebook'

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
}

/**
 * Build a human-friendly WhatsApp message.
 * Prefers the share URL; falls back to letter text excerpt.
 */
function buildWhatsAppMessage(opts: ShareLetterOptions): string {
  const name = opts.receiverName || 'তোমার প্রিয়জন'
  if (opts.shareUrl) {
    return `💌 ${name}-এর জন্য একটি বিশেষ চিঠি এসেছে:\n\n${opts.shareUrl}\n\n— চিঠি লেখাই AI`
  }
  const excerpt = opts.letterText.slice(0, 300).trim()
  return `💌 ${name}-এর জন্য একটি চিঠি:\n\n${excerpt}…\n\n— চিঠি লেখাই AI (Chithi Lekhi AI)`
}

/**
 * Core universal share dispatcher.
 * All sharing surfaces in the app MUST call this function.
 */
export async function shareLetter(opts: ShareLetterOptions): Promise<ShareResult> {
  const { platform, shareUrl, letterText, receiverName } = opts

  try {
    switch (platform) {
      // ─── WhatsApp ────────────────────────────────────────────────────────────
      case 'whatsapp': {
        const message = buildWhatsAppMessage(opts)

        // Prefer Web Share API when available (mobile native sheet)
        if (
          typeof navigator !== 'undefined' &&
          navigator.share &&
          navigator.canShare?.({ text: message })
        ) {
          await navigator.share({
            title: `চিঠি — ${receiverName}`,
            text: message,
            url: shareUrl,
          })
          return { success: true, message: 'শেয়ার সম্পন্ন!' }
        }

        // Fallback: open WhatsApp deep link
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`
        window.open(waUrl, '_blank', 'noopener,noreferrer')
        return { success: true, message: 'হোয়াটসঅ্যাপ খুলছে...' }
      }

      // ─── Email ───────────────────────────────────────────────────────────────
      case 'email': {
        const subject = encodeURIComponent(`তোমার জন্য একটি চিঠি এসেছে ❤️`)
        const bodyText = shareUrl
          ? `${receiverName}-এর জন্য একটি বিশেষ চিঠি:\n\n${shareUrl}\n\n— চিঠি লেখাই AI (Chithi Lekhi AI)`
          : `${receiverName}-এর জন্য একটি চিঠি:\n\n${letterText.slice(0, 500)}\n\n— চিঠি লেখাই AI`
        const body = encodeURIComponent(bodyText)
        window.location.href = `mailto:?subject=${subject}&body=${body}`
        return { success: true, message: 'ইমেইল অ্যাপ খুলছে...' }
      }

      // ─── Copy Link ───────────────────────────────────────────────────────────
      case 'copy': {
        const textToCopy = shareUrl || letterText
        try {
          await navigator.clipboard.writeText(textToCopy)
        } catch {
          // Fallback for older browsers / iOS WebView
          const ta = document.createElement('textarea')
          ta.value = textToCopy
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        return {
          success: true,
          message: shareUrl ? 'লিংক কপি হয়েছে!' : 'চিঠি কপি হয়েছে!',
        }
      }

      // ─── Facebook ────────────────────────────────────────────────────────────
      case 'facebook': {
        if (!shareUrl) {
          return { success: false, message: 'শেয়ার লিংক তৈরি করুন প্রথমে' }
        }
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        window.open(fbUrl, '_blank', 'noopener,noreferrer')
        return { success: true, message: 'ফেসবুক শেয়ার খুলছে...' }
      }

      // ─── Native Mobile Share ─────────────────────────────────────────────────
      case 'native': {
        if (typeof navigator === 'undefined' || !navigator.share) {
          // Browser doesn't support Web Share API — copy as fallback
          return shareLetter({ ...opts, platform: 'copy' })
        }
        const shareData: ShareData = {
          title: `${receiverName}-এর জন্য একটি চিঠি 💌`,
          text: buildWhatsAppMessage(opts),
        }
        if (shareUrl) shareData.url = shareUrl
        await navigator.share(shareData)
        return { success: true, message: 'শেয়ার সম্পন্ন!' }
      }

      default:
        return { success: false, message: 'অজানা শেয়ার মাধ্যম' }
    }
  } catch (err: unknown) {
    // User dismissed native share sheet — not an error
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, message: 'শেয়ার বাতিল করা হয়েছে।' }
    }
    console.error('[share-engine] share failed:', err)
    return { success: false, message: 'শেয়ার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' }
  }
}
