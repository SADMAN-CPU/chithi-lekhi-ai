import { NextRequest, NextResponse } from 'next/server'
import { getLetterById, getLetterBySlug, deleteLetter } from '@/lib/supabase/letters'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { getServerUser } from '@/lib/auth-server'
import { z } from 'zod'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const updateSchema = z.object({
  action: z.enum(['toggle-favorite', 'update-content']).optional(),
  content: z.string().max(50000).optional(),
  letter_content: z.string().max(50000).optional(),
  title: z.string().max(300).nullable().optional(),
  receiver_name: z.string().trim().min(1).max(200).optional(),
  relationship: z.string().max(200).nullable().optional(),
  emotion: z.string().max(300).nullable().optional(),
  theme: z.string().min(1).max(100).optional(),
  is_public: z.boolean().optional(),
  favorite: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
})

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

    if (!/^[a-z0-9_-]{1,128}$/i.test(id)) {
      return NextResponse.json(
        { success: false, error: { message: 'ID is required', status: 400 } },
        { status: 400 }
      )
    }

    // Try finding by ID first, then by share slug
    let letter = uuidPattern.test(id) ? await getLetterById(id, true) : null
    if (!letter) {
      letter = await getLetterBySlug(id, true)
    }

    if (!letter) {
      return NextResponse.json(
        { success: false, error: { message: 'Letter not found', status: 404 } },
        { status: 404 }
      )
    }

    // Private records require a verified owner, including legacy ownerless records.
    if (!letter.is_public) {
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

    if (!uuidPattern.test(id)) {
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
    if (!serverUser || existing.user_id !== serverUser.id) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized deletion', status: 403 } },
        { status: 403 }
      )
    }

    const deleted = await deleteLetter(id, true)
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { message: 'Letter not found', status: 404 } },
        { status: 404 }
      )
    }
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
    if (!uuidPattern.test(id)) {
      return NextResponse.json(
        { success: false, error: { message: 'ID is required', status: 400 } },
        { status: 400 }
      )
    }

    const parsedBody = updateSchema.safeParse(await request.json().catch(() => null))
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid letter update', status: 400 } },
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
    if (!serverUser || existing.user_id !== serverUser.id) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized modification', status: 403 } },
        { status: 403 }
      )
    }

    const body = parsedBody.data
    const { updateLetter } = await import('@/lib/supabase/letters')

    const { action, ...updates } = body
    if (action === 'update-content' && updates.content === undefined && updates.letter_content === undefined) {
      return NextResponse.json({ success: false, error: { message: 'Content is required', status: 400 } }, { status: 400 })
    }
    if (action === 'toggle-favorite') updates.favorite = !existing.favorite
    const updated = await updateLetter(id, updates, true)

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { message: 'Letter not found', status: 404 } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      letter: updated,
      id,
      favorite: updated.favorite,
    })
  } catch (err) {
    console.error('[PATCH /api/letters/[id]] Error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to update letter', status: 500 } },
      { status: 500 }
    )
  }
}
