import { createRefinementResponse } from '@/lib/refine-api'
import type { NextRequest } from 'next/server'

export const maxDuration = 60

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return createRefinementResponse(request, id)
}
