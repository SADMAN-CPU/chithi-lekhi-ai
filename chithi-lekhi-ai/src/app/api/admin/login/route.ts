import { NextRequest, NextResponse } from 'next/server'
import {
  validateAdminCredentials,
  createAdminToken,
  ADMIN_COOKIE_NAME,
} from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const isValid = await validateAdminCredentials(email, password)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin email or password' },
        { status: 401 }
      )
    }

    const token = await createAdminToken(email)
    const response = NextResponse.json({ success: true, message: 'Admin authenticated' })

    // Set secure HttpOnly session cookie
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    })

    return response
  } catch (err) {
    console.error('[Admin Login Error]:', err)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
