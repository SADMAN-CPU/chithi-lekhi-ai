import { NextRequest, NextResponse } from 'next/server'

interface RateLimitRecord {
  timestamps: number[]
}

// In-memory sliding window cache
const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up stale entries every 5 minutes to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > fiveMinutesAgo)
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitOptions {
  /** Maximum number of allowed requests in the time window */
  limit: number
  /** Time window in seconds (default: 60 seconds) */
  windowSeconds?: number
  /** Identifier prefix (e.g. 'generate-letter', 'letters') */
  prefix?: string
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetInSeconds: number
}

/**
 * Extract client IP address safely from standard proxy headers or fallback
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for may contain multiple IPs: "client, proxy1, proxy2"
    const clientIp = forwardedFor.split(',')[0].trim()
    if (clientIp) return clientIp
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()

  return '127.0.0.1'
}

/**
 * Check if the request exceeds the rate limit window
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowSeconds = 60, prefix = 'api' } = options
  const ip = getClientIp(request)
  const key = `${prefix}:${ip}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const windowStart = now - windowMs

  let record = rateLimitStore.get(key)
  if (!record) {
    record = { timestamps: [] }
    rateLimitStore.set(key, record)
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart)

  if (record.timestamps.length >= limit) {
    recordSecurityEvent(ip, prefix, 'rate_limit_exceeded')
    const oldest = record.timestamps[0]
    const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetInSeconds,
    }
  }

  record.timestamps.push(now)
  const remaining = Math.max(0, limit - record.timestamps.length)
  return {
    allowed: true,
    limit,
    remaining,
    resetInSeconds: windowSeconds,
  }
}

export interface SecurityEvent {
  id: string
  ip: string
  prefix: string
  type: 'rate_limit_exceeded' | 'suspicious_activity'
  timestamp: string
}

const securityEvents: SecurityEvent[] = []

export function recordSecurityEvent(
  ip: string,
  prefix: string,
  type: 'rate_limit_exceeded' | 'suspicious_activity' = 'rate_limit_exceeded'
) {
  securityEvents.unshift({
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ip,
    prefix,
    type,
    timestamp: new Date().toISOString(),
  })
  if (securityEvents.length > 500) {
    securityEvents.pop()
  }
}

export function getSecurityEvents(): SecurityEvent[] {
  return securityEvents
}

/**
 * Helper to generate standard 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: `অনুরোধের সীমা অতিক্রম করেছে। অনুগ্রহ করে ${result.resetInSeconds} সেকেন্ড পর চেষ্টা করুন। (Too many requests. Please retry in ${result.resetInSeconds}s)`,
        code: 'RATE_LIMIT_EXCEEDED',
        status: 429,
        retryAfter: result.resetInSeconds,
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': result.resetInSeconds.toString(),
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetInSeconds.toString(),
      },
    }
  )
}
