import { createRefinementResponse } from '@/lib/refine-api'
import type { NextRequest } from 'next/server'

export const maxDuration = 60

export function POST(request: NextRequest) {
  return createRefinementResponse(request)
}
