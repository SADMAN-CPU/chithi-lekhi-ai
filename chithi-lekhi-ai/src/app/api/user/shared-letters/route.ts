import { NextRequest, NextResponse } from 'next/server'
import { getUserSharedLetters } from '@/lib/shares'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const serverUser = await getServerUser()
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('userId')
    if (!serverUser) {
      if (requestedUserId && requestedUserId !== 'guest-user') {
        return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
      }
      return NextResponse.json({ success: true, sharedLetters: [], count: 0 })
    }
    const effectiveUserId = serverUser.id

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
