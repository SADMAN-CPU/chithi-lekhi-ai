import { NextRequest, NextResponse } from 'next/server'
import { recordDownload, getUserDownloads, getLetterById } from '@/lib/supabase/letters'
import { getServerUser } from '@/lib/auth-server'
import { z } from 'zod'

const downloadSchema = z.object({
  letter_id: z.string().regex(/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|local-[a-z0-9_-]{1,100})$/i).nullish(),
  format: z.enum(['pdf', 'png', 'txt']).default('pdf'),
})

export async function GET() {
  try {
    const serverUser = await getServerUser()
    if (!serverUser) {
      return NextResponse.json({ success: true, downloads: [] })
    }

    const downloads = await getUserDownloads(serverUser.id, true)
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
    const parsedBody = downloadSchema.safeParse(await request.json().catch(() => null))
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid download request' },
        { status: 400 }
      )
    }
    const body = parsedBody.data
    const serverUser = await getServerUser()
    if (!serverUser) {
      // Anonymous exports work without a shared guest history or invalid user UUID.
      return NextResponse.json({ success: true, download: null }, { status: 201 })
    }

    const letterId = body.letter_id?.startsWith('local-') ? null : body.letter_id || null
    if (letterId) {
      const letter = await getLetterById(letterId, true)
      if (!letter || (!letter.is_public && letter.user_id !== serverUser.id)) {
        return NextResponse.json(
          { success: false, error: 'Letter not found or access denied' },
          { status: 403 }
        )
      }
    }
    const record = await recordDownload(
      serverUser.id,
      letterId,
      body.format,
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
