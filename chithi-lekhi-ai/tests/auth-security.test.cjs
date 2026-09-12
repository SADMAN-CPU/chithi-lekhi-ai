const test = require('node:test')
const assert = require('node:assert/strict')
const { createHmac } = require('node:crypto')
const { NextRequest, NextResponse } = require('next/server')
const { loadTs } = require('./helpers/load-ts.cjs')

const adminEnv = {
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'private-test-password',
  ADMIN_SESSION_SECRET: 'private-test-session-secret-at-least-32-chars',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key',
}
const signedToken = (payload, secret = adminEnv.ADMIN_SESSION_SECRET) => {
  const encoded = btoa(JSON.stringify(payload))
  return `${encoded}.${createHmac('sha256', secret).update(encoded).digest('hex')}`
}
const adminPayload = () => ({ email: adminEnv.ADMIN_EMAIL, role: 'admin', source: 'environment', exp: Date.now() + 60_000 })
const silentConsole = { ...console, warn() {}, error() {} }

function authClient(user, profile = { role: 'user' }) {
  const inserts = []
  const query = {
    select() { return query }, eq() { return query },
    maybeSingle: async () => ({ data: profile, error: null }),
    insert: async row => { inserts.push(row); return { error: null } },
    update() { return query },
  }
  const result = async () => ({ data: { user }, error: null })
  return {
    inserts, from: () => query,
    auth: { getUser: result, signInWithPassword: result, verifyOtp: result, signOut: async () => ({ error: null }) },
  }
}

test('environment tokens fail closed without private configuration', async () => {
  const auth = loadTs('src/lib/admin-auth.ts', { env: { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key' } })
  assert.equal(auth.getAdminConfig().sessionSecret, '')
  await assert.rejects(auth.createAdminToken('admin@example.com'), /must be configured/)
  assert.equal((await auth.verifyAdminToken(signedToken(adminPayload(), 'public-anon-key'))).valid, false)
})

test('environment tokens bind identity, source, numeric expiry, and exact signature', async () => {
  const auth = loadTs('src/lib/admin-auth.ts', { env: adminEnv })
  assert.equal(await auth.validateAdminCredentials('ADMIN@example.com', adminEnv.ADMIN_PASSWORD), true)
  assert.equal(await auth.validateAdminCredentials(adminEnv.ADMIN_EMAIL, 'wrong'), false)
  const token = await auth.createAdminToken('ADMIN@example.com')
  assert.equal((await auth.verifyAdminToken(token)).valid, true)
  await assert.rejects(auth.createAdminToken('other@example.com'), /does not match/)
  const invalidTokens = [
    `${token}.extra`, `${token}.`, `${token}0`, 'arbitrary-cookie',
    signedToken(adminPayload(), 'public-anon-key'),
    signedToken({ ...adminPayload(), email: 'other@example.com' }),
    signedToken({ ...adminPayload(), source: 'supabase' }),
    signedToken({ ...adminPayload(), exp: Date.now() - 1 }),
    signedToken({ ...adminPayload(), exp: String(Date.now() + 60_000) }),
  ]
  for (const invalid of invalidTokens) assert.equal((await auth.verifyAdminToken(invalid)).valid, false)
})

test('private password fallback ignores the public Supabase anon key', async () => {
  const auth = loadTs('src/lib/admin-auth.ts', { env: { ...adminEnv, ADMIN_SESSION_SECRET: '' } })
  const token = await auth.createAdminToken(adminEnv.ADMIN_EMAIL)
  assert.equal(auth.getAdminConfig().sessionSecret, adminEnv.ADMIN_PASSWORD)
  assert.equal((await auth.verifyAdminToken(token)).valid, true)
  assert.equal((await auth.verifyAdminToken(signedToken(adminPayload(), 'public-anon-key'))).valid, false)
})

test('browser login, OTP, and session reads ignore self-assigned metadata roles', async () => {
  const user = { id: 'user-id', email: 'user@example.com', user_metadata: { role: 'admin' }, app_metadata: {} }
  const client = authClient(user)
  const auth = loadTs('src/lib/auth.ts', { mocks: {
    './supabase/client': { createClient: () => client },
    './supabase/config': { isSupabaseConfigured: true, getSupabaseEnv: () => ({ isConfigured: true }) },
  } })
  assert.equal((await auth.getCurrentUser()).role, 'user')
  assert.equal((await auth.signInWithEmail(user.email, 'password')).user.role, 'user')
  assert.equal((await auth.verifyOtp(user.email, '123456')).user.role, 'user')
  user.app_metadata.role = 'admin'
  assert.equal((await auth.getCurrentUser()).role, 'admin')
})

test('browser-created profiles cannot copy a caller-supplied admin role', async () => {
  const client = authClient(null, null)
  const auth = loadTs('src/lib/auth.ts', { mocks: {
    './supabase/client': { createClient: () => client },
    './supabase/config': { isSupabaseConfigured: true },
  } })
  await auth.ensureUserProfile({ id: 'user-id', email: 'user@example.com', role: 'admin' })
  assert.equal(client.inserts[0].role, 'user')
})

test('middleware verifies auth and uses only app metadata or profile roles', async () => {
  const user = { id: 'user-id', user_metadata: { role: 'admin' }, app_metadata: {} }
  const client = authClient(user)
  const middleware = loadTs('src/lib/supabase/middleware.ts', { mocks: {
    '@supabase/ssr': { createServerClient: () => client },
    './config': { getSupabaseEnv: () => ({ isConfigured: true, url: 'https://example.supabase.co', anonKey: 'anon' }) },
  }, globals: { console: silentConsole } })
  const request = new NextRequest('https://app.example/admin')
  assert.equal((await middleware.updateSession(request)).role, 'user')
  user.app_metadata.role = 'admin'
  assert.equal((await middleware.updateSession(request)).role, 'admin')
  client.auth.getUser = async () => { throw new Error('auth unavailable') }
  assert.equal((await middleware.updateSession(request)).user, null)
})

test('proxy rejects forged admin cookies and keeps refreshed auth cookies on denial', async () => {
  let sessionUser = null
  let sessionRole = null
  const proxyModule = loadTs('src/proxy.ts', { env: adminEnv, mocks: {
    '@/lib/supabase/config': { isSupabaseConfigured: true },
    '@/lib/supabase/middleware': { updateSession: async () => {
      const supabaseResponse = NextResponse.next()
      supabaseResponse.cookies.set('refreshed-session', 'new-value')
      return { supabaseResponse, user: sessionUser, role: sessionRole }
    } },
  } })
  const request = (path, token) => new NextRequest(`https://app.example${path}`, { headers: { cookie: `chithi_admin_token=${token}` } })
  const denied = await proxyModule.proxy(request('/admin', 'forged'))
  assert.equal(denied.status, 307)
  assert.equal(new URL(denied.headers.get('location')).pathname, '/admin/login')
  assert.equal(denied.cookies.get('refreshed-session').value, 'new-value')
  assert.equal((await proxyModule.proxy(request('/api/admin/stats', 'forged'))).status, 401)
  assert.equal((await proxyModule.proxy(request('/api/admin/stats.json', 'forged'))).status, 401)
  sessionUser = { id: 'ordinary-user' }; sessionRole = 'user'
  assert.equal((await proxyModule.proxy(request('/admin', signedToken(adminPayload())))).status, 200)
  sessionRole = 'admin'
  assert.equal((await proxyModule.proxy(request('/api/admin/stats', ''))).status, 200)
})

test('admin login checks role and reuses Supabase session without minting another role token', async () => {
  const user = { id: 'user-id', user_metadata: { role: 'admin' }, app_metadata: {} }
  const client = authClient(user)
  let allowed = true
  const login = loadTs('src/app/api/admin/login/route.ts', { env: adminEnv, mocks: {
    '@/lib/supabase/config': { isSupabaseConfigured: true },
    '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/rate-limit': { checkRateLimit: () => ({ allowed, resetInSeconds: 60 }) },
  } })
  const request = body => new NextRequest('https://app.example/api/admin/login', { method: 'POST', body: JSON.stringify(body) })
  assert.equal((await login.POST(request({ email: 'user@example.com', password: 'password' }))).status, 403)
  user.app_metadata.role = 'admin'
  const response = await login.POST(request({ email: 'user@example.com', password: 'password' }))
  assert.equal(response.status, 200)
  assert.equal(response.cookies.get('chithi_admin_token').value, '')
  assert.equal(response.cookies.get('chithi_admin_token').maxAge, 0)
  assert.equal((await login.POST(request({ email: 42, password: 'password' }))).status, 400)
  allowed = false
  const limited = await login.POST(request({ email: 'user@example.com', password: 'password' }))
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('retry-after'), '60')
})

test('admin logout revokes the local Supabase session and reports revocation failure', async () => {
  let options
  let error = null
  const logout = loadTs('src/app/api/admin/logout/route.ts', { mocks: {
    '@/lib/supabase/config': { isSupabaseConfigured: true },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { signOut: async input => { options = input; return { error } } } }) },
  } })
  const response = await logout.POST()
  assert.equal(response.status, 200)
  assert.equal(options.scope, 'local')
  assert.equal(response.cookies.get('chithi_admin_token').maxAge, 0)
  error = new Error('provider unavailable')
  assert.equal((await logout.POST()).status, 503)
})

test('auth callback only redirects within the request origin', async () => {
  const callback = loadTs('src/app/auth/callback/route.ts', { mocks: {
    '@/lib/supabase/server': { createClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: null }) } }) },
  } })
  for (const next of ['//evil.example', '/\\evil.example', 'https://evil.example']) {
    const response = await callback.GET(new Request(`https://app.example/auth/callback?code=valid&next=${encodeURIComponent(next)}`, { headers: { 'x-forwarded-host': 'evil.example' } }))
    assert.equal(response.headers.get('location'), 'https://app.example/dashboard')
  }
  const response = await callback.GET(new Request('https://app.example/auth/callback?code=valid&next=/reset-password'))
  assert.equal(response.headers.get('location'), 'https://app.example/reset-password')
})

test('auth event callback defers Supabase calls and never restores a user after sign out', async () => {
  let eventCallback
  let readCount = 0
  const states = []
  const timers = new Map()
  let nextTimer = 0
  const hook = loadTs('src/hooks/useAuth.ts', { mocks: {
    react: {
      useState: initial => { const state = { value: initial }; states.push(state); return [initial, value => { state.value = value }] },
      useCallback: callback => callback,
      useEffect: callback => callback(),
    },
    '@/lib/auth': { getCurrentUser: async () => { readCount++; return { id: 'user-id', role: 'user' } } },
    '@/lib/supabase/config': { isSupabaseConfigured: true },
    '@/lib/supabase/client': { createClient: () => ({ auth: { onAuthStateChange: callback => { eventCallback = callback; return { data: { subscription: { unsubscribe() {} } } } } } }) },
  }, globals: {
    setTimeout: callback => { const id = ++nextTimer; timers.set(id, callback); return id },
    clearTimeout: id => timers.delete(id),
  } })
  hook.useAuth()
  await Promise.resolve()
  const before = readCount
  assert.equal(eventCallback('SIGNED_IN', { user: { id: 'user-id', user_metadata: { role: 'admin' } } }), undefined)
  assert.equal(readCount, before)
  assert.equal(timers.size, 1)
  const pending = [...timers.values()][0]()
  eventCallback('SIGNED_OUT', null)
  await pending
  assert.equal(states[0].value, null)
})
