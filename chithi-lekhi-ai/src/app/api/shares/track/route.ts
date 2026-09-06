import { NextRequest, NextResponse } from 'next/server'
import { trackShareEvent } from '@/lib/shares'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 120,
      windowSeconds: 60,
      prefix: 'shares-track',
    })
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    const body = await request.json()
    const { shareToken, eventType, platform } = body

    if (!shareToken || !eventType) {
      return NextResponse.json(
        { success: false, error: { message: 'shareToken and eventType are required', status: 400 } },
        { status: 400 }
      )
    }

    const validEvents = ['view', 'share', 'download', 'audio_play', 'audio_generate']
    if (!validEvents.includes(eventType)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid eventType', status: 400 } },
        { status: 400 }
      )
    }

    await trackShareEvent(
      {
        token: shareToken,
        eventType,
        platform,
      },
      true
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/shares/track] Track error:', err)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to record tracking event', status: 500 } },
      { status: 500 }
    )
  }
}
