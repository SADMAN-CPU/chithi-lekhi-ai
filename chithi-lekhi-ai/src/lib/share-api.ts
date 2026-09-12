import { NextRequest, NextResponse } from 'next/server'
import { createShareRecord, type ShareExpiration } from '@/lib/shares'
import { getLetterById, createLetter } from '@/lib/supabase/letters'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { getServerUser } from '@/lib/auth-server'
import { z } from 'zod'

const letterIdSchema = z.string().regex(/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|local-[a-z0-9_-]{1,100})$/i).nullish()
const shareSchema = z.object({
  letterId: letterIdSchema,
  letter_id: letterIdSchema,
  is_public: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  expiration: z.string().max(20).default('never'),
  audio_url: z.string().max(3000000).nullish(),
  letter_content: z.string().max(50000).optional(),
  content: z.string().max(50000).optional(),
  recipient_name: z.string().trim().max(200).optional(),
  receiver_name: z.string().trim().max(200).optional(),
  relationship: z.string().max(200).nullish(),
  era_style: z.string().max(100).optional(),
  letter_style: z.string().max(100).optional(),
  language: z.string().max(30).optional(),
})

export async function createShareResponse(request: NextRequest, legacy = false) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 30,
      windowSeconds: 60,
      prefix: 'shares-create',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const parsedBody = shareSchema.safeParse(await request.json().catch(() => null))
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid sharing request', status: 400 } },
        { status: 400 }
      )
    }
    const body = parsedBody.data
    const { letter_id, expiration = 'never', audio_url } = body
    const is_public = body.isPublic ?? body.is_public ?? true

    const targetLetterId = letter_id || body.letterId
    const serverUser = await getServerUser()

    const letterBody = body.letter_content || body.content
    const recipientName = body.recipient_name || body.receiver_name

    let existingLetter = targetLetterId && typeof targetLetterId === 'string' && !targetLetterId.startsWith('local-')
      ? await getLetterById(targetLetterId, true)
      : null

    if (existingLetter && (!serverUser || serverUser.id !== existingLetter.user_id)) {
      if (existingLetter.user_id) {
        return NextResponse.json(
          { success: false, error: { message: 'Unauthorized to share this letter', status: 403 } },
          { status: 403 }
        )
      }
      // A caller may share their supplied text without accessing an ownerless record.
      existingLetter = null
    }

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
            // Token visibility/expiration must not create a permanent public URL.
            is_public: false,
            status: 'published',
            favorite: false,
          },
          true
        )
        existingLetter = saved
      } else {
        return NextResponse.json(
          { success: false, error: { message: 'Valid letter_id or letter content is required', status: 400 } },
          { status: 400 }
        )
      }
    }

    const validExpirations: ShareExpiration[] = ['24h', '7d', 'never']
    const selectedExpiration = validExpirations.find((value) => value === expiration) || 'never'

    const share = await createShareRecord(
      {
        letter_id: existingLetter.id,
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
        sharePath: `/read/${share.share_token}`,
        letter: existingLetter,
      },
      {
        status: legacy ? 200 : 201,
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
