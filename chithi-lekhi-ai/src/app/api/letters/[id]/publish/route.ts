import { NextRequest, NextResponse } from 'next/server'
import { getLetterById, updateLetter } from '@/lib/supabase/letters'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { getServerUser, isSupabaseConfigured } from '@/lib/auth-server'
import { generateSlug } from '@/utils/helpers'

type Props = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/letters/:id/publish
 *
 * Sets `is_public = true` on the letter, guarantees `share_id` exists,
 * and returns the public canonical share link.
 */
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 30,
      windowSeconds: 60,
      prefix: 'letters-id-publish',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: 'Letter ID is required', status: 400 } },
        { status: 400 }
      )
    }

    const letter = await getLetterById(id, true)
    if (!letter) {
      return NextResponse.json(
        { success: false, error: { message: 'চিঠি খুঁজে পাওয়া যায়নি / Letter not found', status: 404 } },
        { status: 404 }
      )
    }

    // Permission check
    const isProduction = process.env.NODE_ENV === 'production'
    if ((isProduction || isSupabaseConfigured) && letter.user_id) {
      const serverUser = await getServerUser()
      if (!serverUser || serverUser.id !== letter.user_id) {
        return NextResponse.json(
          { success: false, error: { message: 'Unauthorized publication', status: 403 } },
          { status: 403 }
        )
      }
    }

    // Ensure share_id slug exists
    const shareId = letter.share_id || letter.share_slug || generateSlug(6)

    // Update letter to public
    const updated = await updateLetter(
      id,
      {
        is_public: true,
        share_id: shareId,
        share_slug: shareId,
        status: 'published',
      },
      true
    )

    // Build public URL
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`
    const publicUrl = `${baseUrl.replace(/\/+$/, '')}/read/${shareId}`

    return NextResponse.json({
      success: true,
      letter_id: id,
      share_id: shareId,
      is_public: true,
      publicUrl,
      letter: updated,
    })
  } catch (err) {
    console.error('[POST /api/letters/[id]/publish] Error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to publish letter', status: 500 } },
      { status: 500 }
    )
  }
}
