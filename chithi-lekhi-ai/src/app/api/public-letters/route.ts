import { NextRequest, NextResponse } from 'next/server'
import { createPublicLetter, type LetterExpiration } from '@/lib/supabase/public-letters'
import { sanitizeInput } from '@/utils/helpers'
import { getServerUser } from '@/lib/auth-server'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { getLetterById } from '@/lib/supabase/letters'
import { z } from 'zod'

const publicLetterSchema = z.object({
  receiver_name: z.string().trim().min(1).max(200),
  letter_content: z.string().trim().min(1).max(50000),
  title: z.string().max(300).optional(),
  theme: z.string().max(100).default('vintage'),
  is_public: z.boolean().default(true),
  expiration: z.string().max(20).default('permanent'),
  letter_id: z.string().regex(/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|local-[a-z0-9_-]{1,100})$/i).nullish(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit sharing generation (20 requests/minute per IP)
    const rateLimit = checkRateLimit(request, {
      limit: 20,
      windowSeconds: 60,
      prefix: 'public-letters',
    })

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const parsedBody = publicLetterSchema.safeParse(await request.json().catch(() => null))
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid public letter request', status: 400 } },
        { status: 400 }
      )
    }
    const body = parsedBody.data
    const {
      receiver_name,
      letter_content,
      title,
      theme = 'vintage',
      is_public = true,
      expiration = 'permanent',
      letter_id,
    } = body

    if (!receiver_name || !letter_content) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'প্রাপকের নাম এবং চিঠির বিবরণ আবশ্যক।', status: 400 },
        },
        { status: 400 }
      )
    }

    const serverUser = await getServerUser()
    let linkedLetterId: string | null = null
    if (letter_id && !letter_id.startsWith('local-')) {
      const existing = await getLetterById(letter_id, true)
      if (!existing) {
        return NextResponse.json(
          { success: false, error: { message: 'Letter not found', status: 404 } },
          { status: 404 }
        )
      }
      if (existing.user_id && existing.user_id !== serverUser?.id) {
        return NextResponse.json(
          { success: false, error: { message: 'Unauthorized to share this letter', status: 403 } },
          { status: 403 }
        )
      }
      if (serverUser && existing.user_id === serverUser.id) linkedLetterId = existing.id
    }

    const record = await createPublicLetter(
      {
        receiver_name: sanitizeInput(receiver_name),
        letter_content: sanitizeInput(letter_content),
        title: title ? sanitizeInput(title) : undefined,
        theme: sanitizeInput(theme),
        is_public: Boolean(is_public),
        expiration: (['24h', '7d', 'permanent'].includes(expiration)
          ? expiration
          : 'permanent') as LetterExpiration,
        user_id: serverUser?.id || null,
        letter_id: linkedLetterId,
      },
      true
    )

    const origin =
      request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://chithilekhi.com'
    const shortUrl = `${origin}/c/${record.short_id}`
    const letterUrl = `${origin}/letter/${record.short_id}`

    return NextResponse.json(
      {
        success: true,
        letter: record,
        short_id: record.short_id,
        shareUrl: shortUrl,
        letterUrl: letterUrl,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/public-letters] Error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'শেয়ার লিংক তৈরি করতে সমস্যা হয়েছে।', status: 500 } },
      { status: 500 }
    )
  }
}
