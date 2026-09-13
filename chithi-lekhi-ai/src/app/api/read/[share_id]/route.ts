import { NextRequest, NextResponse } from 'next/server'
import { getLetterContent } from '@/lib/supabase/letters'
import { getShareByToken } from '@/lib/shares'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'

type Props = {
  params: Promise<{ share_id: string }>
}

/**
 * GET /api/read/:share_id
 *
 * Public reading endpoint.
 * - Loads public letter without requiring authentication (RLS-hardened).
 * - Uses the same expiration/privacy checks as all public readers.
 * - Records view counters through the existing sharing service.
 */
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 60,
      windowSeconds: 60,
      prefix: 'read-share-id-get',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const { share_id } = await params
    if (!share_id) {
      return NextResponse.json(
        { success: false, error: { message: 'Share ID is required', status: 400 } },
        { status: 400 }
      )
    }

    const lookup = await getShareByToken(share_id, true, true)
    const letter = lookup.letter
    if (lookup.status !== 'ok' || !letter) {
      const status = lookup.status === 'expired' ? 410 : lookup.status === 'private' ? 403 : 404
      return NextResponse.json({
        success: false, error: { message: 'চিঠি পাওয়া যায়নি / Letter unavailable', code: lookup.status.toUpperCase(), status },
      }, { status })
    }
    const currentViews = lookup.share?.views ?? letter.view_count ?? 0

    // Return canonical letter structure
    return NextResponse.json(
      {
        success: true,
        letter: {
          id: letter.id,
          share_id: lookup.share?.share_token || letter.share_id || letter.share_slug || share_id,
          recipient_name: letter.recipient_name || letter.receiver_name,
          receiver_name: letter.receiver_name || letter.recipient_name,
          original_input: letter.original_input || letter.original_letter || letter.content,
          generated_content: letter.generated_content || letter.letter_content || letter.content,
          enhanced_content: letter.enhanced_content || letter.enhanced_letter || null,
          content: getLetterContent(letter),
          relationship: letter.relationship,
          emotion: letter.emotion,
          style: letter.style || letter.letter_style || letter.era_style || 'vintage',
          language: letter.language || 'bengali',
          theme: letter.theme || 'vintage',
          view_count: currentViews,
          is_public: lookup.share?.is_public ?? letter.is_public,
          created_at: letter.created_at,
          updated_at: letter.updated_at,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    )
  } catch (err) {
    console.error('[GET /api/read/[share_id]] Error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to read letter', status: 500 } },
      { status: 500 }
    )
  }
}
