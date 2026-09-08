import { NextRequest, NextResponse } from 'next/server'
import { createShareRecord, type ShareExpiration } from '@/lib/shares'
import { getLetterById, createLetter } from '@/lib/supabase/letters'
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

    let targetLetterId = letter_id || body.letterId
    const serverUser = await getServerUser()
    const isProduction = process.env.NODE_ENV === 'production'

    const letterBody = body.letter_content || body.content
    const recipientName = body.recipient_name || body.receiver_name

    let existingLetter = targetLetterId && typeof targetLetterId === 'string' && !targetLetterId.startsWith('local-')
      ? await getLetterById(targetLetterId, true)
      : null

    // If letter not found in database or local ephemeral, persist permanently
    if (!existingLetter) {
      if (letterBody && recipientName) {
        const saved = await createLetter(
          {
            receiver_name: recipientName,
            recipient_name: recipientName,
            content: letterBody,
            letter_content: letterBody,
            relationship: body.relationship || null,
            era_style: body.era_style || body.letter_style || 'vintage',
            letter_style: body.letter_style || body.era_style || 'vintage',
            language: body.language || 'bengali',
            user_id: serverUser?.id || null,
            is_public: Boolean(is_public),
            status: 'published',
            favorite: false,
          },
          true
        )
        targetLetterId = saved.id
        existingLetter = saved
      } else {
        return NextResponse.json(
          { success: false, error: { message: 'Valid letter_id or letter content is required', status: 400 } },
          { status: 400 }
        )
      }
    } else {
      // SECURITY: Validate letter ownership before exposing private letters to public share tokens
      if (existingLetter.user_id && (isProduction || isSupabaseConfigured)) {
        if (!serverUser || serverUser.id !== existingLetter.user_id) {
          return NextResponse.json(
            { success: false, error: { message: 'Unauthorized to share this letter', status: 403 } },
            { status: 403 }
          )
        }
      }
    }

    const validExpirations: ShareExpiration[] = ['24h', '7d', 'never']
    const selectedExpiration: ShareExpiration = validExpirations.includes(expiration)
      ? expiration
      : 'never'

    const share = await createShareRecord(
      {
        letter_id: targetLetterId,
        user_id: serverUser?.id || null,
        is_public: Boolean(is_public),
        expiration: selectedExpiration,
        audio_url: audio_url || null,
      },
      true
    )

    // Build public share link
    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://chithilekhi.com'
    const shareUrl = `${origin}/read/${share.share_token}`

    return NextResponse.json(
      {
        success: true,
        share,
        share_id: share.share_token,
        shareToken: share.share_token,
        slug: share.share_token,
        shareUrl,
        letter: existingLetter,
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
