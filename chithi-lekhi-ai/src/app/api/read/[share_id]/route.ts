import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getLetterByShareId, incrementLetterViews } from '@/lib/supabase/letters'
import { createAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'

type Props = {
  params: Promise<{ share_id: string }>
}

/**
 * GET /api/read/:share_id
 *
 * Public reading endpoint.
 * - Loads public letter without requiring authentication (RLS-hardened).
 * - Hashes IP for privacy/GDPR compliance (sha256(ip + daily_salt)), zero raw IP stored.
 * - Deduplicates views per letter per day and atomically increments `view_count`.
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

    // Fetch letter with server-level privileges
    const letter = await getLetterByShareId(share_id, true)
    if (!letter || !letter.is_public) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'চিঠি খুঁজে পাওয়া যায়নি / Letter not found',
            code: 'NOT_FOUND',
            status: 404,
          },
        },
        { status: 404 }
      )
    }

    // Record atomic telemetry view with privacy-preserving IP hash
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || ''
    const today = new Date().toISOString().slice(0, 10)
    const salt = process.env.DAILY_METRICS_SALT || 'chithi-daily-salt-2026'
    const ipHash = crypto.createHash('sha256').update(`${clientIp}-${today}-${salt}`).digest('hex')
    const device = /mobile|android|iphone/i.test(userAgent)
      ? 'mobile'
      : /tablet|ipad/i.test(userAgent)
      ? 'tablet'
      : 'desktop'

    let currentViews = letter.view_count || 0

    if (isServiceRoleConfigured()) {
      try {
        const adminClient = createAdminClient()
        const typedClient = adminClient as unknown as {
          rpc: (
            fn: string,
            args: Record<string, unknown>
          ) => Promise<{ data: { view_count?: number } | null; error: unknown }>
        }
        // Call atomic record_letter_view RPC
        const { data: rpcResult, error: rpcErr } = await typedClient.rpc('record_letter_view', {
          target_share_id: share_id,
          viewer_ip_hash: ipHash,
          viewer_device: device,
        })

        if (!rpcErr && rpcResult && typeof rpcResult.view_count === 'number') {
          currentViews = rpcResult.view_count
        } else {
          currentViews = await incrementLetterViews(share_id, true)
        }
      } catch (viewErr) {
        console.warn('[GET /api/read/[share_id]] Telemetry view error:', viewErr)
        currentViews = await incrementLetterViews(share_id, true)
      }
    } else {
      currentViews = await incrementLetterViews(share_id, true)
    }

    // Return canonical letter structure
    return NextResponse.json(
      {
        success: true,
        letter: {
          id: letter.id,
          share_id: letter.share_id || letter.share_slug || share_id,
          recipient_name: letter.recipient_name || letter.receiver_name,
          receiver_name: letter.receiver_name || letter.recipient_name,
          original_input: letter.original_input || letter.original_letter || letter.content,
          generated_content: letter.generated_content || letter.letter_content || letter.content,
          enhanced_content: letter.enhanced_content || letter.enhanced_letter || null,
          content: letter.enhanced_content || letter.enhanced_letter || letter.letter_content || letter.content,
          relationship: letter.relationship,
          emotion: letter.emotion,
          style: letter.style || letter.letter_style || letter.era_style || 'vintage',
          language: letter.language || 'bengali',
          theme: letter.theme || 'vintage',
          view_count: currentViews,
          is_public: letter.is_public,
          created_at: letter.created_at,
          updated_at: letter.updated_at,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
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
