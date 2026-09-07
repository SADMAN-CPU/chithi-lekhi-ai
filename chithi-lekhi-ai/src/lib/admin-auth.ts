/**
 * Admin Authentication & Session Management
 * Role Based Access Control for /admin
 *
 * Credentials MUST come from environment variables:
 * - ADMIN_EMAIL
 * - ADMIN_PASSWORD
 *
 * Cryptographic HMAC-SHA256 tokens using Web Crypto (compatible with Edge and Node.js).
 */

const ADMIN_COOKIE_NAME = 'chithi_admin_token'

export function getAdminCredentials() {
  const isProd = process.env.NODE_ENV === 'production'
  const email = process.env.ADMIN_EMAIL || (isProd ? '' : 'admin@chithilekhi.com')
  const password = process.env.ADMIN_PASSWORD || (isProd ? '' : 'AdminChithi#2026!')
  return { email, password }
}

export function validateAdminCredentials(email: string, pass: string): boolean {
  const { email: adminEmail, password: adminPass } = getAdminCredentials()
  if (!adminEmail || !adminPass) {
    console.warn('[Admin Auth] ADMIN_EMAIL or ADMIN_PASSWORD is not configured in environment variables.')
    return false
  }
  if (!email || !pass) return false
  return email.trim().toLowerCase() === adminEmail.trim().toLowerCase() && pass === adminPass
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
  const { password } = getAdminCredentials()
  if (!password) {
    throw new Error('ADMIN_PASSWORD is not configured in environment variables.')
  }
  const payload = {
    email: email.toLowerCase(),
    role: 'admin',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  }
  const payloadStr = JSON.stringify(payload)
  const encodedPayload = btoa(payloadStr)

  const encoder = new TextEncoder()
  const key = await getHmacKey(password)
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

  const { password, email: expectedEmail } = getAdminCredentials()
  if (!password) {
    return { valid: false }
  }

  try {
    const key = await getHmacKey(password)
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

    if (payload.role !== 'admin' || payload.email !== expectedEmail.toLowerCase()) {
      return { valid: false }
    }

    return { valid: true, email: payload.email }
  } catch {
    return { valid: false }
  }
}

export { ADMIN_COOKIE_NAME }
