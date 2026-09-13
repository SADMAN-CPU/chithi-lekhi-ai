const test = require('node:test')
const assert = require('node:assert/strict')
const { NextRequest } = require('next/server')
const { createLoader } = require('./helpers/load-ts.cjs')

function fixture({ configured = false, production = false, provider = true, serviceRole = true } = {}) {
  const events = []
  const state = { used: 0, calls: 0, authReads: 0, lease: null, queryError: null, rpcError: null, providerError: false, finalizeError: false, releaseError: false, user: null, saved: null, plan: 'free' }
  const query = table => {
    const chain = {
      select() { return chain }, eq() { return chain },
      maybeSingle: async () => ({ data: table === 'voice_cache' ? state.saved : { letters_generated: state.used, refinements_used: state.used, voice_letters_used: state.used }, error: state.queryError }),
      insert: async () => { events.push(`insert:${table}`); return { error: null } },
    }
    return chain
  }
  const client = {
    from: query,
    rpc: async (name, args) => {
      events.push(name)
      if (state.rpcError) return { data: null, error: state.rpcError }
      if (name === 'reserve_ai_quota') {
        if (state.lease) return { data: { allowed: false, used: state.used, reason: 'busy' }, error: null }
        state.lease = args.p_reservation_id
        return { data: { allowed: true, used: state.used }, error: null }
      }
      if (name === 'release_ai_quota') {
        if (state.releaseError) return { data: null, error: new Error('release unavailable') }
        if (state.lease === args.p_reservation_id) state.lease = null
        return { data: true, error: null }
      }
      if (name === 'finalize_ai_usage' && state.finalizeError) return { data: null, error: new Error('audit save failed') }
      if (name === 'finalize_voice_generation') {
        events.push('save:voice')
        if (state.finalizeError) return { data: null, error: new Error('audio save failed') }
        state.saved = { audio_url: args.p_audio_base64, audio_format: args.p_audio_format }
      }
      events.push('consume')
      state.used++
      state.lease = null
      return { data: { consumed: true, used: state.used }, error: null }
    },
  }
  const auth = { getServerUser: async () => { state.authReads++; events.push('auth'); return state.user } }
  const rate = { getClientIp: () => '127.0.0.1', checkRateLimit: () => ({ allowed: true, limit: 20, remaining: 19 }) }
  const config = { isSupabaseConfigured: configured }
  const admin = { createAdminClient: () => client, isServiceRoleConfigured: () => serviceRole }
  const load = createLoader({
    env: { NODE_ENV: production ? 'production' : 'test' },
    globals: { console: { ...console, warn() {}, error() {} } },
    mocks: {
      './supabase/config': config, '@/lib/supabase/config': config,
      './supabase/admin': admin, '@/lib/supabase/admin': admin,
      './supabase/client': { createClient: () => client },
      './auth-server': auth, '@/lib/auth-server': auth,
      './rate-limit': rate, '@/lib/rate-limit': rate,
      './subscription': { getUserPlan: async () => ({ id: state.plan }) },
      './openai': { openai: provider ? { audio: { speech: { create: async (params, options) => {
        events.push('ai'); state.calls++
        assert.ok(params.input.length <= 4000)
        assert.equal(options.maxRetries, 0)
        if (state.providerError) throw new Error('provider failed')
        return new Response(new Uint8Array([1, 2, 3]))
      } } } } : null },
      '@/lib/supabase/letters': { getLetterContent: letter => letter.content, getLetterById: async () => ({ id: 'letter-id', user_id: 'owner-id', is_public: false, content: 'A letter from its owner.' }) },
    },
  })
  const quota = load('src/lib/quota-service.ts')
  const voice = load('src/lib/voice-engine.ts')
  const request = body => new NextRequest('https://app.example/api/voice-letter', { method: 'POST', body: JSON.stringify(body || {}) })
  const speak = text => voice.executeVoiceRequest({ request: request(), text: text || 'A kind letter to you.', voiceStyle: 'warm' })
  return { state, events, quota, voice, load, request, speak }
}

test('only one concurrent reservation succeeds without consuming allowance', async () => {
  const { quota, request } = fixture()
  const attempts = await Promise.all(Array.from({ length: 10 }, () => quota.reserveUserQuota({ request: request(), actionType: 'voice' })))
  assert.equal(attempts.filter(result => result.allowed).length, 1)
  assert.equal(attempts.filter(result => result.response?.status === 409).length, 9)
  assert.equal((await quota.verifyUserQuota({ request: request(), actionType: 'voice' })).used, 0)
  const lease = attempts.find(result => result.allowed)
  const params = { identifier: lease.identifier, actionType: 'voice', reservationId: lease.reservationId, date: lease.date }
  assert.equal((await quota.consumeUserQuota(params)).consumed, true)
  assert.equal((await quota.consumeUserQuota(params)).consumed, false)
})

test('release restores allowance and cannot clear a replacement reservation', async () => {
  const { quota, request } = fixture()
  const first = await quota.reserveUserQuota({ request: request(), actionType: 'voice' })
  await quota.releaseUserQuota(first, 'voice')
  const second = await quota.reserveUserQuota({ request: request(), actionType: 'voice' })
  assert.equal(second.allowed, true)
  await quota.releaseUserQuota(first, 'voice')
  assert.equal((await quota.reserveUserQuota({ request: request(), actionType: 'voice' })).allowed, false)
  await quota.releaseUserQuota(second, 'voice')
  assert.equal((await quota.verifyUserQuota({ request: request(), actionType: 'voice' })).used, 0)
})

test('legacy usage APIs and canonical quota share counters and enforce limits', async () => {
  const { quota, load } = fixture()
  const legacy = load('src/lib/usage-tracking.ts')
  for (let count = 1; count <= 5; count++) {
    assert.equal((await legacy.recordLetterGeneration('ip:127.0.0.1')).used, count)
    assert.equal((await quota.getQuotaUsage({ identifier: 'ip:127.0.0.1', actionType: 'generation' })).used, count)
  }
  assert.equal((await legacy.recordLetterGeneration('ip:127.0.0.1')).allowed, false)
  assert.equal((await legacy.getDailyUsage('ip:127.0.0.1')).used, 5)
  assert.equal((await quota.consumeUserQuota({ identifier: 'ip:127.0.0.1', actionType: 'generation' })).consumed, false)
})

test('configured database failures never fall back to memory counters', async () => {
  const { quota, state, request } = fixture({ configured: true })
  state.queryError = new Error('database unavailable')
  const check = await quota.reserveUserQuota({ request: request(), actionType: 'voice' })
  assert.equal(check.allowed, false)
  assert.equal(check.response.status, 503)
  state.rpcError = new Error('RPC unavailable')
  const consumed = await quota.consumeUserQuota({ identifier: 'ip:127.0.0.1', actionType: 'voice' })
  assert.equal(consumed.consumed, false)
  assert.equal(consumed.unavailable, true)
  state.queryError = null
  assert.equal((await quota.getQuotaUsage({ identifier: 'ip:127.0.0.1', actionType: 'voice' })).used, 0)
})

test('production or missing service-role quota configuration prevents paid AI calls', async () => {
  for (const options of [{ production: true }, { configured: true, serviceRole: false }]) {
    const { speak, state } = fixture(options)
    const result = await speak()
    assert.equal(result.ok, false)
    assert.equal(result.response.status, 503)
    assert.equal(state.calls, 0)
  }
})

test('configured quota read failure prevents paid voice even when provider is ready', async () => {
  const { speak, state } = fixture({ configured: true })
  state.queryError = new Error('read unavailable')
  assert.equal((await speak()).response.status, 503)
  assert.equal(state.calls, 0)
})

test('verified identity is reused, while explicit null remains a guest', async () => {
  const { quota, state, request } = fixture()
  state.user = { id: 'another-user' }
  const user = await quota.verifyUserQuota({ request: request(), actionType: 'voice', authenticatedUser: { id: 'trusted-user' } })
  const guest = await quota.verifyUserQuota({ request: request(), actionType: 'voice', authenticatedUser: null })
  assert.equal(user.identifier, 'user:trusted-user')
  assert.equal(guest.identifier, 'ip:127.0.0.1')
  assert.equal(state.authReads, 0)
})

test('browser fallback and long full-text narration consume no quota or paid usage logs', async () => {
  for (const options of [{ provider: false }, { provider: true }]) {
    const { speak, state, quota } = fixture(options)
    const text = options.provider ? 'Long letter '.repeat(500) : 'A short letter.'
    const result = await speak(text)
    assert.equal(result.ok, true)
    assert.equal(result.result.fallbackToBrowser, true)
    assert.equal(result.result.cleanText, text.trim())
    assert.equal(state.calls, 0)
    assert.equal(quota.getAIUsageLogs().length, 0)
  }
})

test('fresh TTS charges once; cached audio stays free even after quota is exhausted', async () => {
  const { speak, state, quota, request } = fixture()
  assert.equal((await speak('First letter.')).usage.used, 1)
  assert.equal((await speak('Second letter.')).usage.used, 2)
  const cacheHit = await speak('First letter.')
  assert.equal(cacheHit.ok, true)
  assert.equal(cacheHit.result.fromCache, true)
  assert.equal(cacheHit.usage, undefined)
  assert.equal((await speak('Third letter.')).response.status, 429)
  assert.equal(state.calls, 2)
  assert.equal((await quota.verifyUserQuota({ request: request(), actionType: 'voice' })).used, 2)
  assert.equal(quota.getAIUsageLogs().filter(log => log.success).length, 2)
})

test('provider failure releases reservation and logs failure without a quota charge', async () => {
  const { speak, state, quota, request } = fixture()
  state.providerError = true
  const result = await speak()
  assert.equal(result.ok, true)
  assert.equal(result.result.fallbackToBrowser, true)
  assert.equal((await quota.verifyUserQuota({ request: request(), actionType: 'voice' })).used, 0)
  assert.equal(quota.getAIUsageLogs().filter(log => log.success).length, 0)
  state.providerError = false
  assert.equal((await speak()).usage.used, 1)
})

test('voice database finalization saves before consuming and caches only committed audio', async () => {
  const { speak, state, events } = fixture({ configured: true })
  const result = await speak()
  assert.equal(result.ok, true)
  assert.ok(events.indexOf('reserve_ai_quota') < events.indexOf('ai'))
  assert.ok(events.indexOf('ai') < events.indexOf('save:voice'))
  assert.ok(events.indexOf('save:voice') < events.indexOf('consume'))
  assert.equal(state.used, 1)
  assert.equal((await speak()).result.fromCache, true)
  assert.equal(state.calls, 1)
})

test('failed database save neither consumes quota nor publishes a cache entry', async () => {
  const { speak, state, events } = fixture({ configured: true })
  state.finalizeError = true
  assert.equal((await speak()).response.status, 503)
  assert.equal(state.used, 0)
  assert.equal(state.saved, null)
  assert.equal(events.includes('consume'), false)
  state.finalizeError = false
  const next = await speak()
  assert.equal(next.ok, true)
  assert.equal(next.result.fromCache, false)
  assert.equal(state.calls, 2)
})

test('failed lease cleanup does not escape the response or permit a second paid call', async () => {
  const { speak, state } = fixture({ configured: true })
  state.releaseError = true
  state.providerError = true
  assert.equal((await speak()).ok, true)
  state.providerError = false
  assert.equal((await speak()).response.status, 409)
  assert.equal(state.calls, 1)
})

test('legacy voice endpoint authenticates, validates, and applies canonical voice quota', async () => {
  const { load, request, state, events } = fixture({ configured: true })
  const route = load('src/app/api/voice-letter/route.ts')
  const invalid = await route.POST(request({ text: 42 }))
  assert.equal(invalid.status, 400)
  assert.equal(events.includes('reserve_ai_quota'), false)
  const response = await route.POST(request({ text: 'An authorized guest letter.', voiceStyle: 'storytelling' }))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(response.headers.get('x-daily-used'), '1')
  assert.equal(state.authReads, 2)
  assert.equal(state.calls, 1)
})

test('letter voice endpoint rejects non-owners before quota or AI and reuses owner identity', async () => {
  const { load, request, state, events } = fixture()
  const route = load('src/app/api/letters/[id]/voice/route.ts')
  const params = { params: Promise.resolve({ id: 'letter-id' }) }
  assert.equal((await route.POST(request(), params)).status, 403)
  assert.equal(state.calls, 0)
  state.user = { id: 'owner-id' }
  const response = await route.POST(request({ voiceStyle: 'emotional' }), params)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).mode, 'server-tts')
  assert.equal(state.authReads, 2)
  assert.equal(events.filter(event => event === 'ai').length, 1)
})

for (const actionType of ['generation', 'refinement']) {
  test(`${actionType} audit is finalized atomically and failure does not fall back`, async () => {
    const { quota, request, state, events } = fixture({ configured: true })
    const lease = await quota.reserveUserQuota({ request: request(), actionType })
    const params = { identifier: lease.identifier, reservationId: lease.reservationId, date: lease.date, actionType, usageLog: { model: 'test-model', tokensUsed: 50 } }
    state.finalizeError = true
    const failure = await quota.consumeUserQuota(params)
    assert.equal(failure.consumed, false)
    assert.equal(failure.unavailable, true)
    assert.equal(state.used, 0)
    assert.equal(events.includes('consume_ai_quota'), false)
    state.finalizeError = false
    assert.equal((await quota.consumeUserQuota(params)).consumed, true)
    assert.equal(state.used, 1)
    assert.equal(events.filter(event => event === 'finalize_ai_usage').length, 2)
  })
}
