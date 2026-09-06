import { NextRequest, NextResponse } from 'next/server'
import { getClientUsageStatus } from '@/lib/premium-middleware'

export async function GET(request: NextRequest) {
  try {
    const usage = await getClientUsageStatus(request)
    return NextResponse.json({
      success: true,
      usage,
    })
  } catch (err) {
    console.error('[GET /api/user/usage] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage status' },
      { status: 500 }
    )
  }
}
