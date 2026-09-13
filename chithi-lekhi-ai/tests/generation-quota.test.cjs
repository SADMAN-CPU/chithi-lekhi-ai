const assert = require('node:assert/strict')
const test = require('node:test')
const { NextRequest } = require('next/server')
const { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER, PHASE_DEVELOPMENT_SERVER } = require('next/constants')
const { createLoader } = require('./helpers/load-ts.cjs')

const owner = { id: '10000000-0000-4000-8000-000000000001', role: 'user' }
const input = { receiverName: 'Friend', relationship: 'friend', feeling: 'I miss our conversations', language: 'english' }
// Synthetic credentials are never sent to a network; Supabase/provider boundaries are mocked.
const configuredEnv = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-public-key',
  SUPABASE_SERVICE_ROLE_KEY: 'fixture-server-key-with-sufficient-length',
  GEMINI_API_KEY: 'fixture-gemini-key',
  GEMINI_MODEL: 'gemini-fixture-model',
  OPENAI_API_KEY: 'sk-fixture-key-with-sufficient-length',
}

function fixture({ user = null, configured = true, used = 0, plan = 'free', queryError = null, rpcError = null, failAI = false, failSave = false, missingServiceKey = false } = {}) {
  const events = []
  const state = { used, lease: null, saved: null, audited: 0, queryFilters: [], reservations: [] }
  const client = {
    from(table) {
      const query = {
        select() { return query },
        eq(key, value) { if (table === 'user_usage') state.queryFilters.push([key, value]); return query },
        async maybeSingle() {
          assert.equal(table, 'user_usage')
          events.push('quota-read')
          // A new user/guest has no row. This must mean zero usage, not unavailable.
          return { data: state.used ? { letters_generated: state.used } : null, error: queryError }
        },
        async insert(row) {
          assert.equal(table, 'ai_usage')
          assert.equal(row.success, false)
          events.push('audit-failure')
          return { error: null }
        },
      }
      return query
    },
    async rpc(name, args) {
      events.push(name)
      if (rpcError) return { data: null, error: rpcError }
      if (name === 'reserve_ai_quota') {
        state.reservations.push(args)
        if (state.lease) return { data: { allowed: false, used: state.used, reason: 'busy' }, error: null }
        state.lease = args.p_reservation_id
        return { data: { allowed: true, used: state.used }, error: null }
      }
      if (name === 'release_ai_quota') {
        if (state.lease === args.p_reservation_id) state.lease = null
        return { data: true, error: null }
      }
      assert.equal(name, 'finalize_ai_usage')
      assert.equal(args.p_reservation_id, state.lease)
      assert.ok(state.saved, 'Letter must be saved before quota consumption')
      state.used++
      state.audited++
      state.lease = null
      return { data: { consumed: true, used: state.used }, error: null }
    },
  }
  const auth = { getServerUser: async () => { events.push('auth'); return user } }
  const rate = { getClientIp: () => '127.0.0.1', checkRateLimit: () => ({ allowed: true, limit: 5, remaining: 4 }) }
  const env = configured ? { ...configuredEnv } : { NODE_ENV: 'production' }
  if (missingServiceKey) delete env.SUPABASE_SERVICE_ROLE_KEY
  const load = createLoader({ env, globals: { console: { warn() {}, error() {}, log() {} } }, mocks: {
    '@supabase/supabase-js': { createClient: () => client },
    './auth-server': auth, '@/lib/auth-server': auth,
    './rate-limit': rate, '@/lib/rate-limit': rate,
    './subscription': { getUserPlan: async () => ({ id: plan }) },
    '@/lib/gemini': { generateGeminiLetter: async () => {
      events.push('ai')
      if (failAI) throw new Error('Fixture provider timeout')
      return { provider: 'gemini', letter: 'Dear friend, I remember our conversations with warmth.' }
    } },
    '@/lib/supabase/letters': { createLetter: async data => {
      events.push('save')
      if (failSave) throw new Error('Fixture save failure')
      state.saved = { id: '20000000-0000-4000-8000-000000000001', ...data }
      return state.saved
    } },
    '@/lib/analytics': { trackEvent: async () => {} },
    '@/lib/content-moderation': { moderateContent: () => ({ safe: true }) },
    '@/lib/emotion-engine': { analyzeEmotionalContext: () => ({ promptContext: '', detectedEmotion: { bengaliLabel: 'Warm' } }) },
  } })
  const route = load('src/app/api/generate-letter/route.ts')
  return { state, events, generate: () => route.POST(new NextRequest('https://app.example/api/generate-letter', { method: 'POST', body: JSON.stringify(input) })) }
}

for (const user of [null, owner]) {
  test(`generation flow works when usage verification is correctly configured (${user ? 'authenticated' : 'guest'}, no usage row)`, async () => {
    const h = fixture({ user })
    const response = await h.generate()
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.success, true)
    assert.equal(body.metadata.provider, 'gemini')
    assert.deepEqual(h.events, ['auth', 'quota-read', 'reserve_ai_quota', 'ai', 'save', 'finalize_ai_usage', 'release_ai_quota'])
    assert.equal(h.state.used, 1)
    assert.equal(h.state.audited, 1)
    assert.equal(h.state.saved.user_id, user?.id || null)
    assert.equal(Boolean(body.letterId), Boolean(user))
    assert.equal(h.state.reservations[0].p_identifier, user ? `user:${owner.id}` : 'ip:127.0.0.1')
    assert.equal(h.state.lease, null)
  })
}

test('clear error shown when staging is not configured', async () => {
  for (const options of [{ configured: false }, { missingServiceKey: true }]) {
    const h = fixture(options)
    const response = await h.generate()
    const body = await response.json()
    assert.equal(response.status, 503)
    assert.equal(body.error.code, 'QUOTA_NOT_CONFIGURED')
    assert.equal(body.error.message, 'Service configuration required.')
    assert.ok(body.error.messageBn)
    assert.deepEqual(h.events, ['auth'])
    assert.equal(h.state.used, 0)
  }
})

test('quota exceeded returns the daily limit message and never calls AI', async () => {
  const h = fixture({ used: 5 })
  const response = await h.generate()
  const body = await response.json()
  assert.equal(response.status, 429)
  assert.equal(body.error.code, 'DAILY_LIMIT_REACHED')
  assert.equal(body.error.message, 'You have reached your daily limit.')
  assert.equal(response.headers.get('X-Daily-Remaining'), '0')
  assert.deepEqual(h.events, ['auth', 'quota-read'])
})

test('premium remains unlimited while still reserving and atomically accounting for generation', async () => {
  const h = fixture({ user: owner, plan: 'premium', used: 50 })
  assert.equal((await h.generate()).status, 200)
  assert.equal(h.state.reservations[0].p_limit, -1)
  assert.equal(h.state.used, 51)
  assert.equal(h.state.audited, 1)
})

for (const failure of ['failAI', 'failSave']) {
  test(`${failure} does not consume generation quota`, async () => {
    const h = fixture({ [failure]: true })
    assert.equal((await h.generate()).status, 500)
    assert.equal(h.state.used, 0)
    assert.equal(h.state.audited, 0)
    assert.equal(h.events.includes('finalize_ai_usage'), false)
    assert.equal(h.state.lease, null)
  })
}

test('temporary database failure stays unavailable without exposing database details or allowing AI', async () => {
  const h = fixture({ queryError: { code: '08006', message: 'sensitive-connection-details' } })
  const response = await h.generate()
  const body = await response.json()
  assert.equal(response.status, 503)
  assert.equal(body.error.code, 'QUOTA_UNAVAILABLE')
  assert.equal(body.error.message, 'Temporary service issue. Please try again.')
  assert.equal(JSON.stringify(body).includes('sensitive'), false)
  assert.equal(h.events.includes('ai'), false)
})

test('missing quota table or reservation RPC is a setup error, never a zero-usage fallback', async () => {
  for (const options of [{ queryError: { code: '42P01' } }, { rpcError: { code: 'PGRST202' } }]) {
    const h = fixture(options)
    const response = await h.generate()
    const body = await response.json()
    assert.equal(response.status, 503)
    assert.equal(body.error.code, 'QUOTA_SETUP_REQUIRED')
    assert.equal(body.error.message, 'Service configuration required.')
    assert.equal(h.events.includes('ai'), false)
    assert.equal(h.state.used, 0)
  }
})

test('production startup fails clearly for missing configuration while build/development stay available', () => {
  const nextConfig = createLoader({ env: { NODE_ENV: 'production' } })('next.config.ts').default
  assert.throws(() => nextConfig(PHASE_PRODUCTION_SERVER), error => {
    assert.match(error.message, /Service configuration required/)
    for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY']) assert.ok(error.message.includes(name))
    return true
  })
  assert.equal(nextConfig(PHASE_PRODUCTION_BUILD).reactStrictMode, true)
  assert.equal(nextConfig(PHASE_DEVELOPMENT_SERVER).reactStrictMode, true)
})

test('configured production startup accepts required values without exposing them', () => {
  const nextConfig = createLoader({ env: configuredEnv })('next.config.ts').default
  assert.equal(nextConfig(PHASE_PRODUCTION_SERVER).reactStrictMode, true)
  const invalid = createLoader({ env: { ...configuredEnv, GEMINI_MODEL: 'gemini-1.5-flash' } })('next.config.ts').default
  assert.throws(() => invalid(PHASE_PRODUCTION_SERVER), error => {
    assert.match(error.message, /GEMINI_MODEL/)
    for (const key of ['SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY']) assert.equal(error.message.includes(configuredEnv[key]), false)
    return true
  })
})
