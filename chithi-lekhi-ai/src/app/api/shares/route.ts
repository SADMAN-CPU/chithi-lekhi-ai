import { NextRequest, NextResponse } from 'next/server'
import { createShareRecord, type ShareExpiration } from '@/lib/shares'
import { getLetterById } from '@/lib/supabase/letters'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { getServerUser, isSupabaseConfigured } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 30,
      windowSeconds: 60,
      prefix: 'shares-create',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const body = await request.json()
    const { letter_id, is_public = true, expiration = 'never', audio_url } = body

    if (!letter_id) {
      return NextResponse.json(
        { success: false, error: { message: 'letter_id is required', status: 400 } },
        { status: 400 }
      )
    }

    const serverUser = await getServerUser()
    const isProduction = process.env.NODE_ENV === 'production'

    // SECURITY: Validate letter ownership before exposing private letters to public share tokens
    const existingLetter = await getLetterById(letter_id, true)
    if (existingLetter && (isProduction || isSupabaseConfigured) && existingLetter.user_id) {
      if (!serverUser || serverUser.id !== existingLetter.user_id) {
        return NextResponse.json(
          { success: false, error: { message: 'Unauthorized to share this letter', status: 403 } },
          { status: 403 }
        )
      }
    }
    const validExpirations: ShareExpiration[] = ['24h', '7d', 'never']
    const selectedExpiration: ShareExpiration = validExpirations.includes(expiration)
      ? expiration
      : 'never'

    const share = await createShareRecord(
      {
        letter_id,
        user_id: serverUser?.id || null,
        is_public: Boolean(is_public),
        expiration: selectedExpiration,
        audio_url: audio_url || null,
      },
      true
    )

    // Build public share link
    const origin = request.nextUrl.origin
    const shareUrl = `${origin}/read/${share.share_token}`

    return NextResponse.json(
      {
        success: true,
        share,
        shareToken: share.share_token,
        shareUrl,
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    )
  } catch (err) {
    console.error('[POST /api/shares] Create error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to create share link', status: 500 } },
      { status: 500 }
    )
  }
}
