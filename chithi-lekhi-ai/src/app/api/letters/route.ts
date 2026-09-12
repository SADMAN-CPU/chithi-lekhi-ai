import { PATCH as updateLetterResponse, DELETE as deleteLetterResponse } from '@/lib/letter-api'
import { NextRequest, NextResponse } from 'next/server'
import {
  createLetter,
  getUserLetters,
} from '@/lib/supabase/letters'
import { sanitizeInput, isShareIdentifier } from '@/utils/helpers'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { getServerUser } from '@/lib/auth-server'
import { moderateContent } from '@/lib/content-moderation'
import type { ApiError } from '@/types'

// ── GET /api/letters — Query letters ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    // 1. Rate Limit (60 req/min)
    const rateLimit = checkRateLimit(request, {
      limit: 60,
      windowSeconds: 60,
      prefix: 'letters-get',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const { searchParams } = new URL(request.url)
    const serverUser = await getServerUser()
    const requestedUserId = searchParams.get('userId')

    if (!serverUser) {
      if (requestedUserId && requestedUserId !== 'guest-user') {
        return NextResponse.json({ success: false, error: { message: 'Authentication required', status: 401 } }, { status: 401 })
      }
      return NextResponse.json({ success: true, letters: [], count: 0 })
    }
    const effectiveUserId = serverUser.id

    const favoritesOnly = searchParams.get('favoritesOnly') === 'true'
    const status = (searchParams.get('status') as 'published' | 'draft' | 'all') || undefined
    const emotion = searchParams.get('emotion') || undefined
    const relationship = searchParams.get('relationship') || undefined
    const timeframe = (searchParams.get('timeframe') as 'today' | 'week' | 'month' | 'all') || undefined
    const searchQuery = searchParams.get('searchQuery') || undefined
    const limit = Math.min(Math.max(1, (parseInt(searchParams.get('limit') || '50', 10) || 50)), 100)
    const offset = Math.max(0, (parseInt(searchParams.get('offset') || '0', 10) || 0))

    const letters = await getUserLetters(
      effectiveUserId,
      { limit, offset, favoritesOnly, status, emotion, relationship, timeframe, searchQuery },
      true
    )

    return NextResponse.json(
      {
        success: true,
        letters,
        count: letters.length,
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    )
  } catch (err) {
    console.error('[GET /api/letters] Error:', err)
    const error: ApiError = {
      message: 'Failed to fetch letters',
      code: 'FETCH_ERROR',
      status: 500,
    }
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}

// ── POST /api/letters — Save letter ───────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Rate limit (30 req/min)
    const rateLimit = checkRateLimit(request, {
      limit: 30,
      windowSeconds: 60,
      prefix: 'letters-post',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const body = await request.json()

    const rawRecipient = body.recipient_name || body.receiver_name
    const rawContent = body.generated_content || body.content || body.letter_content

    if (!rawRecipient || !rawContent) {
      const error: ApiError = {
        message: 'recipient_name (or receiver_name) and content are required',
        code: 'VALIDATION_ERROR',
        status: 400,
      }
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    // Moderate content
    const modContent = moderateContent(rawContent)
    if (!modContent.safe) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONTENT_FLAGGED',
            message: modContent.reason || 'চিঠিতে অনিরাপদ বিষয়বস্তু পাওয়া গেছে।',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    const serverUser = await getServerUser()
    const resolvedUserId = serverUser?.id || null

    const sanitizedRecipient = sanitizeInput(rawRecipient)
    const sanitizedContent = sanitizeInput(rawContent)
    const sanitizedOriginal = body.original_input ? sanitizeInput(body.original_input) : (body.original_letter ? sanitizeInput(body.original_letter) : sanitizedContent)
    const sanitizedEnhanced = body.enhanced_content ? sanitizeInput(body.enhanced_content) : (body.enhanced_letter ? sanitizeInput(body.enhanced_letter) : undefined)
    const shareSlug = body.share_id ? sanitizeInput(body.share_id) : (body.share_slug ? sanitizeInput(body.share_slug) : undefined)

    if (shareSlug && !isShareIdentifier(shareSlug)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid share ID', status: 400 } }, { status: 400 })
    }

    const saved = await createLetter(
      {
        user_id: resolvedUserId,
        receiver_name: sanitizedRecipient,
        recipient_name: sanitizedRecipient,
        relationship: body.relationship ? sanitizeInput(body.relationship) : null,
        emotion: body.emotion ? sanitizeInput(body.emotion) : null,
        style: body.style ? sanitizeInput(body.style) : null,
        era_style: body.era_style ? sanitizeInput(body.era_style) : null,
        language: body.language || 'bengali',
        memory_context: body.memory_context ? sanitizeInput(body.memory_context) : null,
        content: sanitizedContent,
        letter_content: sanitizedContent,
        original_input: sanitizedOriginal,
        original_letter: sanitizedOriginal,
        generated_content: sanitizedContent,
        enhanced_content: sanitizedEnhanced,
        enhanced_letter: sanitizedEnhanced,
        enhancement_style: body.enhancement_style ? sanitizeInput(body.enhancement_style) : undefined,
        status: body.status === 'draft' ? 'draft' : 'published',
        favorite: Boolean(body.favorite),
        is_public: Boolean(body.is_public),
        share_slug: shareSlug,
        share_id: shareSlug,
      },
      true
    )

    return NextResponse.json(
      {
        success: true,
        letter: saved,
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
    console.error('[POST /api/letters] Save error:', err)
    const error: ApiError = {
      message: 'Failed to save letter',
      code: 'SAVE_ERROR',
      status: 500,
    }
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}

// Legacy collection mutations delegate to the same authorization and persistence.
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.id !== 'string' || !['toggle-favorite', 'update-content'].includes(body.action)) {
    return NextResponse.json({ success: false, error: { message: 'Invalid action or letter ID', status: 400 } }, { status: 400 })
  }
  const adapted = new NextRequest(request.url, {
    method: 'PATCH', headers: request.headers,
    body: JSON.stringify(body),
  })
  return updateLetterResponse(adapted, { params: Promise.resolve({ id: body.id }) })
}

export function DELETE(request: NextRequest) {
  return deleteLetterResponse(request, { params: Promise.resolve({ id: request.nextUrl.searchParams.get('id') || '' }) })
}
