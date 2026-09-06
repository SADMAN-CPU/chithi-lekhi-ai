import { NextRequest, NextResponse } from 'next/server'
import { getUserSharedLetters } from '@/lib/supabase/public-letters'
import { getServerUser, isSupabaseConfigured } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const serverUser = await getServerUser()
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('userId')
    const isProduction = process.env.NODE_ENV === 'production'

    // SECURITY: Prevent IDOR (Insecure Direct Object Reference).
    // User shared letter history is private account data.
    // In production, unauthenticated requests cannot supply arbitrary ?userId= to inspect user shares.
    let effectiveUserId: string
    if (serverUser) {
      effectiveUserId = serverUser.id
    } else if (isProduction || isSupabaseConfigured) {
      if (requestedUserId && requestedUserId !== 'guest-user') {
        return NextResponse.json(
          { success: false, error: 'Authentication required to view shared letters' },
          { status: 401 }
        )
      }
      effectiveUserId = 'guest-user'
    } else {
      // Local development mock mode ONLY
      effectiveUserId = requestedUserId || 'guest-user'
    }

    const sharedLetters = await getUserSharedLetters(effectiveUserId, true)
    return NextResponse.json({
      success: true,
      sharedLetters,
      count: sharedLetters.length,
    })
  } catch (err) {
    console.error('[GET /api/user/shared-letters] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shared letters' },
      { status: 500 }
    )
  }
}
