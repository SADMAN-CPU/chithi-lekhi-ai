import { NextRequest, NextResponse } from 'next/server'
import { getLetterById, updateLetter } from '@/lib/supabase/letters'
import { generateSlug } from '@/utils/helpers'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import type { ApiError } from '@/types'

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
    const { letterId, isPublic = true } = body

    if (!letterId) {
      const error: ApiError = {
        message: 'letterId is required',
        code: 'VALIDATION_ERROR',
        status: 400,
      }
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    const letter = await getLetterById(letterId, true)
    if (!letter) {
      const error: ApiError = {
        message: 'Letter not found',
        code: 'NOT_FOUND',
        status: 404,
      }
      return NextResponse.json({ success: false, error }, { status: 404 })
    }

    const slug = letter.share_slug || generateSlug(10)

    const updated = await updateLetter(
      letterId,
      {
        share_slug: slug,
        is_public: isPublic,
      },
      true
    )

    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const sharePath = `/read/${slug}`
    const fullUrl = `${origin}${sharePath}`

    return NextResponse.json({
      success: true,
      slug,
      sharePath,
      shareUrl: fullUrl,
      letter: updated,
    })
  } catch (err) {
    console.error('[POST /api/letters/share] Error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to generate share link', status: 500 } },
      { status: 500 }
    )
  }
}
