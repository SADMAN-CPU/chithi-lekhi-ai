import { NextRequest, NextResponse } from 'next/server'
import { recordDownload, getUserDownloads } from '@/lib/supabase/letters'
import { getServerUser, isSupabaseConfigured } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const serverUser = await getServerUser()
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('userId')
    const isProduction = process.env.NODE_ENV === 'production'

    // SECURITY: Prevent IDOR (Insecure Direct Object Reference).
    // Download history contains private user activity logs.
    // In production, callers cannot query arbitrary ?userId= to exfiltrate other users' download histories.
    let effectiveUserId: string
    if (serverUser) {
      effectiveUserId = serverUser.id
    } else if (isProduction || isSupabaseConfigured) {
      if (requestedUserId && requestedUserId !== 'guest-user') {
        return NextResponse.json(
          { success: false, error: 'Authentication required to view download history' },
          { status: 401 }
        )
      }
      effectiveUserId = 'guest-user'
    } else {
      // Local development mock mode ONLY
      effectiveUserId = requestedUserId || 'guest-user'
    }

    const downloads = await getUserDownloads(effectiveUserId, true)
    return NextResponse.json({
      success: true,
      downloads,
    })
  } catch (err) {
    console.error('[GET /api/downloads] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch download history' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const serverUser = await getServerUser()
    const isProduction = process.env.NODE_ENV === 'production'

    // SECURITY: Enforce authenticated user identity from server session.
    // In production, unauthenticated clients cannot forge body.user_id to pollute victim audit trails.
    let effectiveUserId: string
    if (serverUser) {
      effectiveUserId = serverUser.id
    } else if (!isProduction && body.user_id) {
      // Local development mock mode ONLY
      effectiveUserId = body.user_id
    } else {
      effectiveUserId = 'guest-user'
    }

    const record = await recordDownload(
      effectiveUserId,
      body.letter_id || null,
      body.format || 'pdf',
      true
    )

    return NextResponse.json(
      {
        success: true,
        download: record,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/downloads] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to record download' },
      { status: 500 }
    )
  }
}
