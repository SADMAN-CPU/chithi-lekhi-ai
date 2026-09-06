import { NextRequest, NextResponse } from 'next/server'
import { getLetterById, getLetterBySlug, deleteLetter } from '@/lib/supabase/letters'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { getServerUser, isSupabaseConfigured } from '@/lib/auth-server'

type Props = {
  params: Promise<{ id: string }>
}

// ── GET /api/letters/[id] — Fetch single letter ────────────────────────────────
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 60,
      windowSeconds: 60,
      prefix: 'letters-id-get',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: 'ID is required', status: 400 } },
        { status: 400 }
      )
    }

    // Try finding by ID first, then by share slug
    let letter = await getLetterById(id, true)
    if (!letter) {
      letter = await getLetterBySlug(id, true)
    }

    if (!letter) {
      return NextResponse.json(
        { success: false, error: { message: 'Letter not found', status: 404 } },
        { status: 404 }
      )
    }

    // If letter is private and has an owner, check authorization
    const isProduction = process.env.NODE_ENV === 'production'
    if ((isProduction || isSupabaseConfigured) && !letter.is_public && letter.user_id) {
      const serverUser = await getServerUser()
      if (!serverUser || serverUser.id !== letter.user_id) {
        return NextResponse.json(
          { success: false, error: { message: 'Private letter', status: 403 } },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      letter,
    })
  } catch (err) {
    console.error('[GET /api/letters/[id]] Error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch letter', status: 500 } },
      { status: 500 }
    )
  }
}

// ── DELETE /api/letters/[id] — Delete single letter ────────────────────────────
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 30,
      windowSeconds: 60,
      prefix: 'letters-id-delete',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: 'ID is required', status: 400 } },
        { status: 400 }
      )
    }

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
    console.error('[DELETE /api/letters/[id]] Error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to delete letter', status: 500 } },
      { status: 500 }
    )
  }
}

// ── PATCH /api/letters/[id] — Update single letter ────────────────────────────
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 30,
      windowSeconds: 60,
      prefix: 'letters-id-patch',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: 'ID is required', status: 400 } },
        { status: 400 }
      )
    }

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

    const body = await request.json()
    const { updateLetter } = await import('@/lib/supabase/letters')

    const contentToUse = body.letter_content || body.content || existing.content
    const updated = await updateLetter(
      id,
      {
        content: contentToUse,
        letter_content: contentToUse,
        title: body.title !== undefined ? body.title : existing.title,
        receiver_name: body.receiver_name || existing.receiver_name,
        relationship: body.relationship !== undefined ? body.relationship : existing.relationship,
        emotion: body.emotion !== undefined ? body.emotion : existing.emotion,
        theme: body.theme || existing.theme || 'vintage',
        is_public: body.is_public !== undefined ? Boolean(body.is_public) : existing.is_public,
        favorite: body.favorite !== undefined ? Boolean(body.favorite) : existing.favorite,
        is_favorite: body.is_favorite !== undefined ? Boolean(body.is_favorite) : existing.is_favorite,
      },
      true
    )

    return NextResponse.json({
      success: true,
      letter: updated,
    })
  } catch (err) {
    console.error('[PATCH /api/letters/[id]] Error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to update letter', status: 500 } },
      { status: 500 }
    )
  }
}
