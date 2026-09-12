import { createShareResponse } from '@/lib/share-api'
import type { NextRequest } from 'next/server'

export function POST(request: NextRequest) {
  return createShareResponse(request, true)
}
