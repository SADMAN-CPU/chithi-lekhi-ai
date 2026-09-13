const assert = require('node:assert/strict')
const { test } = require('node:test')
const { NextRequest, NextResponse } = require('next/server')
const { createLoader } = require('./helpers/load-ts.cjs')

const id = '20000000-0000-4000-8000-000000000001'
const owner = { id: '10000000-0000-4000-8000-000000000001', role: 'user' }
const draft = 'Dear friend, I remember our happy afternoon together. Thank you for your kindness.'
const input = { receiverName: 'Friend', relationship: 'friend', feeling: 'I miss our conversations', language: 'english' }

function harness(options = {}) {
  const events = []
  const saved = []
  const user = options.user === undefined ? owner : options.user
  const quota = { allowed: true, used: 0, limit: 5, remaining: 5, isUnlimited: false, planId: 'free', identifier: user ? `user:${user.id}` : 'ip:test', userId: user?.id, reservationId: 'reservation', date: '2026-09-13' }
  const letter = { id, user_id: owner.id, content: draft, original_input: 'Raw thoughts to turn into a letter', receiver_name: 'Friend', language: 'english' }
  const record = async (payload) => {
    events.push('save')
    saved.push(payload)
    if (options.fail === 'save') throw new Error('Database unavailable')
    return options.fail === 'missing-save' ? null : { ...letter, ...payload }
  }
  const execute = async (params) => {
    events.push('ai')
    if (options.expectedText) assert.equal(params.letter, options.expectedText)
    if (options.fail === 'ai') throw new Error('Provider unavailable')
    const provider = options.provider || 'gemini'
    return { letter: draft, refinedLetter: draft, provider, audit: {}, changesSummary: 'Grammar improved', meaningPreserved: true, similarityScore: 1 }
  }
  const load = createLoader({ mocks: {
    '@/lib/auth-server': { getServerUser: async () => { events.push('auth'); return user } },
    '@/lib/rate-limit': { checkRateLimit: () => ({ allowed: true, limit: 10, remaining: 9 }) },
    '@/lib/content-moderation': { moderateContent: () => ({ safe: true }) },
    '@/lib/gemini': { generateGeminiLetter: execute },
    '@/lib/refine-engine': { refineLetterContent: execute },
    '@/lib/emotion-engine': { analyzeEmotionalContext: () => ({ promptContext: '', detectedEmotion: { bengaliLabel: 'Warm' } }) },
    '@/lib/analytics': { trackEvent: async () => {} },
    '@/lib/supabase/letters': {
      createLetter: record,
      updateLetter: async (_id, payload) => record(payload),
      getLetterById: async () => { events.push('permission'); return options.missing ? null : letter },
      getLetterContent: (value) => value.content,
    },
    '@/lib/quota-service': {
      reserveUserQuota: async (params) => {
        events.push('quota')
        assert.equal(params.authenticatedUser, user)
        return options.denied ? { ...quota, allowed: false, response: NextResponse.json({ success: false }, { status: 429 }) } : quota
      },
      releaseUserQuota: async () => { events.push('release') },
      consumeUserQuota: async (params) => {
        events.push('consume')
        assert.equal(params.reservationId, quota.reservationId)
        assert.equal(params.date, quota.date)
        assert.equal(params.usageLog.model, 'gemini-1.5-flash')
        assert.ok(params.usageLog.tokensUsed > 0)
        return { ...quota, consumed: options.fail !== 'consume', used: 1, remaining: 4 }
      },
      recordAIUsage: async (params) => { events.push(params.success ? 'audit-success' : 'audit-failure') },
      checkUserRateLimit: () => ({ allowed: true }),
      quotaUnavailableResponse: () => NextResponse.json({ success: false }, { status: 503 }),
      attachQuotaHeaders: (response, usage) => { response.headers.set('X-Daily-Used', String(usage.used)); return response },
    },
  }, globals: { console: { warn() {}, error() {}, log() {} } } })
  const request = (body) => new NextRequest('https://example.test/api', { method: 'POST', body: JSON.stringify(body) })
  return {
    events, saved,
    generate: (body = input) => load('src/app/api/generate-letter/route.ts').POST(request(body)),
    refine: (body = { originalLetter: draft, action: 'natural', letterId: id }) => load('src/app/api/refine-letter/route.ts').POST(request(body)),
    enhance: (body = { style: 'natural' }) => load('src/app/api/letters/[id]/enhance/route.ts').POST(request(body), { params: Promise.resolve({ id }) }),
  }
}

for (const method of ['generate', 'refine', 'enhance']) {
  test(`${method} saves before charging and releases its lease`, async () => {
    const h = harness({ expectedText: method === 'enhance' ? draft : undefined })
    const res = await h[method]()
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('X-Daily-Used'), '1')
    const expected = method === 'generate'
      ? ['auth', 'quota', 'ai', 'save', 'consume', 'audit-success', 'release']
      : ['auth', 'permission', 'quota', 'ai', 'save', 'consume', 'audit-success', 'release']
    assert.deepEqual(h.events, expected)
    if (method === 'generate') assert.equal(h.saved[0].user_id, owner.id)
    else assert.equal(h.saved[0].original_input, undefined, 'refinement preserves source thoughts')
  })
  for (const failure of ['ai', 'save']) {
    test(`${method} ${failure} failure never consumes quota`, async () => {
      const h = harness({ fail: failure })
      assert.equal((await h[method]()).status, 500)
      assert.equal(h.events.includes('consume'), false)
      assert.equal(h.events.at(-1), 'release')
    })
  }
  test(`${method} denied quota never reaches AI`, async () => {
    const h = harness({ denied: true })
    assert.equal((await h[method]()).status, 429)
    assert.equal(h.events.includes('ai'), false)
  })
  test(`${method} local fallback is preserved without an AI charge`, async () => {
    const h = harness({ provider: 'fallback' })
    const res = await h[method]()
    assert.equal(res.status, 200)
    assert.equal(h.events.includes('consume'), false)
    assert.equal(res.headers.get('X-Daily-Used'), '0')
  })
}

test('invalid and sanitized-empty generation inputs never reserve quota', async () => {
  for (const value of [{}, { ...input, receiverName: '   ' }, { ...input, feeling: '<script></script>' }]) {
    const h = harness()
    assert.equal((await h.generate(value)).status, 400)
    assert.deepEqual(h.events, ['auth'])
  }
})

test('invalid and sanitized-empty refinement inputs never reserve quota', async () => {
  for (const body of [{}, { originalLetter: '<script></script>', action: 'natural' }]) {
    const h = harness()
    assert.equal((await h.refine(body)).status, 400)
    assert.deepEqual(h.events, ['auth'])
  }
})

test('guest text-only refinement remains available; stored private refinement does not', async () => {
  const allowed = harness({ user: null })
  assert.equal((await allowed.refine({ originalLetter: draft, action: 'natural' })).status, 200)
  for (const method of ['refine', 'enhance']) {
    const denied = harness({ user: null })
    assert.equal((await denied[method]()).status, 403)
    assert.equal(denied.events.includes('quota'), false)
  }
})

test('canonical enhancement validates styles and uses current letter text', async () => {
  const h = harness()
  assert.equal((await h.enhance({ style: 'unknown-style' })).status, 400)
  assert.equal(h.events.includes('quota'), false)
})

test('guest generation returns text without a writable ownerless ID', async () => {
  const h = harness({ user: null })
  const res = await h.generate()
  const data = await res.json()
  assert.equal(res.status, 200)
  assert.equal(data.letterId, undefined)
  assert.equal(data.letter, draft)
  assert.equal(h.saved[0].user_id, null)
})
