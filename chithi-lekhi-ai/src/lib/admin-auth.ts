/**
 * Admin Authentication & Session Management
 * Role Based Access Control for /admin
 *
 * Credentials MUST come from environment variables:
 * - ADMIN_EMAIL
 * - ADMIN_PASSWORD or ADMIN_PASSWORD_HASH
 * - ADMIN_SESSION_SECRET (optional, recommended for production)
 *
 * Cryptographic HMAC-SHA256 tokens using Web Crypto (compatible with Edge and Node.js).
 */

export const ADMIN_COOKIE_NAME = 'chithi_admin_token'

export function getAdminConfig() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || ''
  const passwordHash = (process.env.ADMIN_PASSWORD_HASH || '').trim().toLowerCase()
  const sessionSecret =
    process.env.ADMIN_SESSION_SECRET ||
    passwordHash ||
    password ||
    ''
  return { email, password, passwordHash, sessionSecret }
}

/**
 * Constant-time string equality check to protect against timing attacks
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export async function hashStringSha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(str))
  return bufferToHex(buf)
}

export async function validateAdminCredentials(email: string, pass: string): Promise<boolean> {
  const { email: adminEmail, password: adminPass, passwordHash: adminHash } = getAdminConfig()
  if (!adminEmail || (!adminPass && !adminHash)) {
    console.warn(
      '[Admin Auth] ADMIN_EMAIL and either ADMIN_PASSWORD or ADMIN_PASSWORD_HASH must be configured in environment.'
    )
    return false
  }
  if (!email || !pass) return false
  if (!timingSafeEqualStr(email.trim().toLowerCase(), adminEmail)) {
    return false
  }

  // 1. Direct password match if configured
  if (adminPass && timingSafeEqualStr(pass, adminPass)) {
    return true
  }

  // 2. Hash match if ADMIN_PASSWORD_HASH is set
  if (adminHash) {
    const inputHash = await hashStringSha256(pass)
    if (timingSafeEqualStr(inputHash, adminHash)) {
      return true
    }
  }

  return false
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer)
  return Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes.buffer
}

/**
 * Generate a signed admin session token.
 * Token format: base64(payload).signatureHex
 */
export async function createAdminToken(email: string): Promise<string> {
  const { sessionSecret } = getAdminConfig()
  if (!sessionSecret) {
    throw new Error('ADMIN_PASSWORD or ADMIN_SESSION_SECRET is not configured in environment variables.')
  }
  const payload = {
    email: email.toLowerCase(),
    role: 'admin',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  }
  const payloadStr = JSON.stringify(payload)
  const encodedPayload = btoa(payloadStr)

  const encoder = new TextEncoder()
  const key = await getHmacKey(sessionSecret)
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(encodedPayload)
  )
  const signatureHex = bufferToHex(signatureBuffer)

  return `${encodedPayload}.${signatureHex}`
}

/**
 * Verify a signed admin session token.
 */
export async function verifyAdminToken(
  token: string
): Promise<{ valid: boolean; email?: string }> {
  if (!token || !token.includes('.')) {
    return { valid: false }
  }

  const [encodedPayload, signatureHex] = token.split('.')
  if (!encodedPayload || !signatureHex) {
    return { valid: false }
  }

  const { sessionSecret, email: expectedEmail } = getAdminConfig()
  if (!sessionSecret || !expectedEmail) {
    return { valid: false }
  }

  try {
    const key = await getHmacKey(sessionSecret)
    const encoder = new TextEncoder()
    const signatureBuffer = hexToBuffer(signatureHex)

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(encodedPayload)
    )

    if (!isValid) {
      return { valid: false }
    }

    const payloadStr = atob(encodedPayload)
    const payload = JSON.parse(payloadStr)

    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false } // Expired
    }

    if (payload.role !== 'admin' || payload.email !== expectedEmail) {
      return { valid: false }
    }

    return { valid: true, email: payload.email }
  } catch {
    return { valid: false }
  }
}
