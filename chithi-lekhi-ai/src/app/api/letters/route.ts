import { NextRequest, NextResponse } from 'next/server'
import {
  createLetter,
  getUserLetters,
  getLetterById,
  toggleLetterFavorite,
  deleteLetter,
  updateLetter,
} from '@/lib/supabase/letters'
import { sanitizeInput } from '@/utils/helpers'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { getServerUser, isSupabaseConfigured } from '@/lib/auth-server'
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

    // Prevent IDOR in production: strictly enforce server session user ID.
    // In local demo fallback mode, allow requestedUserId so offline testing is seamless.
    const isProduction = process.env.NODE_ENV === 'production'
    let effectiveUserId: string
    if (serverUser) {
      effectiveUserId = serverUser.id
    } else if (isProduction || isSupabaseConfigured) {
      if (requestedUserId === 'guest-user') {
        effectiveUserId = 'guest-user'
      } else {
        return NextResponse.json(
          { success: false, error: { message: 'Authentication required to view letters', status: 401 } },
          { status: 401 }
        )
      }
    } else {
      effectiveUserId = requestedUserId || 'guest-user'
    }

    const favoritesOnly = searchParams.get('favoritesOnly') === 'true'
    const status = (searchParams.get('status') as 'published' | 'draft' | 'all') || undefined
    const emotion = searchParams.get('emotion') || undefined
    const relationship = searchParams.get('relationship') || undefined
    const timeframe = (searchParams.get('timeframe') as 'today' | 'week' | 'month' | 'all') || undefined
    const searchQuery = searchParams.get('searchQuery') || undefined
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10)), 100)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))

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
    const isProduction = process.env.NODE_ENV === 'production'
    // SECURITY: In production, unauthenticated clients cannot claim an arbitrary user_id
    const resolvedUserId = serverUser?.id || (!isProduction && body.user_id ? sanitizeInput(body.user_id) : null)

    const sanitizedRecipient = sanitizeInput(rawRecipient)
    const sanitizedContent = sanitizeInput(rawContent)
    const sanitizedOriginal = body.original_input ? sanitizeInput(body.original_input) : (body.original_letter ? sanitizeInput(body.original_letter) : sanitizedContent)
    const sanitizedEnhanced = body.enhanced_content ? sanitizeInput(body.enhanced_content) : (body.enhanced_letter ? sanitizeInput(body.enhanced_letter) : undefined)
    const shareSlug = body.share_id ? sanitizeInput(body.share_id) : (body.share_slug ? sanitizeInput(body.share_slug) : undefined)

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

// ── PATCH /api/letters — Toggle favorite or update ────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 30,
      windowSeconds: 60,
      prefix: 'letters-patch',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const body = await request.json()
    const { id, action, currentFavorite, content } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: 'Letter id is required', status: 400 } },
        { status: 400 }
      )
    }

    // Ownership verification
    const existing = await getLetterById(id, true)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { message: 'Letter not found', status: 404 } },
        { status: 404 }
      )
    }

    const serverUser = await getServerUser()
    const isProduction = process.env.NODE_ENV === 'production'
    if ((isProduction || isSupabaseConfigured) && existing.user_id && (!serverUser || existing.user_id !== serverUser.id)) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized modification', status: 403 } },
        { status: 403 }
      )
    }

    if (action === 'toggle-favorite') {
      const newFavorite = await toggleLetterFavorite(id, Boolean(currentFavorite), true)
      return NextResponse.json({
        success: true,
        id,
        favorite: newFavorite,
      })
    }

    if (action === 'update-content' && content) {
      const updated = await updateLetter(id, { content: sanitizeInput(content) }, true)
      return NextResponse.json({
        success: true,
        letter: updated,
      })
    }

    return NextResponse.json(
      { success: false, error: { message: 'Invalid action', status: 400 } },
      { status: 400 }
    )
  } catch (err) {
    console.error('[PATCH /api/letters] Update error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to update letter', status: 500 } },
      { status: 500 }
    )
  }
}

// ── DELETE /api/letters — Delete letter ────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 30,
      windowSeconds: 60,
      prefix: 'letters-delete',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: 'id is required', status: 400 } },
        { status: 400 }
      )
    }

    // Check ownership before deletion
    const existing = await getLetterById(id, true)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { message: 'Letter not found', status: 404 } },
        { status: 404 }
      )
    }

    const serverUser = await getServerUser()
    const isProduction = process.env.NODE_ENV === 'production'
    if ((isProduction || isSupabaseConfigured) && existing.user_id && (!serverUser || existing.user_id !== serverUser.id)) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized deletion', status: 403 } },
        { status: 403 }
      )
    }

    const deleted = await deleteLetter(id, true)
    return NextResponse.json({
      success: true,
      deleted,
    })
  } catch (err) {
    console.error('[DELETE /api/letters] Delete error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to delete letter', status: 500 } },
      { status: 500 }
    )
  }
}
