import { NextRequest, NextResponse } from 'next/server'
import { getLetterById, updateLetter, createLetter } from '@/lib/supabase/letters'
import { generateSlug } from '@/utils/helpers'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import type { ApiError } from '@/types'

import { getServerUser, isSupabaseConfigured } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    // Rate limit sharing requests (15 req/min per IP)
    const rateLimit = checkRateLimit(request, {
      limit: 15,
      windowSeconds: 60,
      prefix: 'letters-share',
    })

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const body = await request.json()
    const targetLetterId = body.letterId || body.letter_id
    const isPublic = body.isPublic !== undefined ? body.isPublic : (body.is_public !== undefined ? body.is_public : true)
    const letterBody = body.letter_content || body.content
    const recipientName = body.recipient_name || body.receiver_name
    const serverUser = await getServerUser()
    const isProduction = process.env.NODE_ENV === 'production'

    let letter = targetLetterId && !targetLetterId.startsWith('local-')
      ? await getLetterById(targetLetterId, true)
      : null

    if (!letter) {
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
            is_public: Boolean(isPublic),
            status: 'published',
            favorite: false,
          },
          true
        )
        letter = saved
      } else {
        const error: ApiError = {
          message: 'Letter not found and insufficient letter content provided',
          code: 'NOT_FOUND',
          status: 404,
        }
        return NextResponse.json({ success: false, error }, { status: 404 })
      }
    } else {
      // SECURITY: Validate ownership before updating letter sharing status
      if (letter.user_id && (isProduction || isSupabaseConfigured) && (!serverUser || serverUser.id !== letter.user_id)) {
        return NextResponse.json(
          { success: false, error: { message: 'Unauthorized to share this letter', status: 403 } },
          { status: 403 }
        )
      }
    }

    if (!letter) {
      return NextResponse.json(
        { success: false, error: { message: 'Failed to create or find letter record', status: 500 } },
        { status: 500 }
      )
    }

    const slug = letter.share_id || letter.share_slug || generateSlug(6)

    const updated = await updateLetter(
      letter.id,
      {
        share_slug: slug,
        share_id: slug,
        is_public: isPublic,
      },
      true
    )

    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://chithilekhi.com'
    const sharePath = `/read/${slug}`
    const fullUrl = `${origin}${sharePath}`

    return NextResponse.json({
      success: true,
      share_id: slug,
      slug,
      shareToken: slug,
      sharePath,
      shareUrl: fullUrl,
      letter: updated || letter,
    })
  } catch (err) {
    console.error('[POST /api/letters/share] Error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to generate share link', status: 500 } },
      { status: 500 }
    )
  }
}
