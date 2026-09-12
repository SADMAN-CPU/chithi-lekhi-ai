const assert = require('node:assert/strict')
const test = require('node:test')
const { NextRequest } = require('next/server')
const { loadTs } = require('./helpers/load-ts.cjs')

const letterId = '12345678-1234-4234-8234-123456789012'
const ownerId = '87654321-4321-4321-8321-210987654321'
const params = { params: Promise.resolve({ id: letterId }) }
const request = (body, method = 'POST') => new NextRequest('http://localhost/api/test', {
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
})

function setup(file, { user = null, owner = ownerId, isPublic = false } = {}) {
  const calls = []
  const existing = { id: letterId, user_id: owner, content: 'Private original', receiver_name: 'Recipient', is_public: isPublic }
  const letters = {
    getLetterById: async (...args) => { calls.push(['get', ...args]); return existing },
    getLetterBySlug: async (...args) => { calls.push(['slug', ...args]); return existing },
    updateLetter: async (id, updates) => { calls.push(['update', id, updates]); return { ...existing, ...updates } },
    deleteLetter: async (...args) => { calls.push(['delete', ...args]); return true },
    createLetter: async (data) => { calls.push(['create', data]); return { ...data, id: 'new-letter' } },
    getUserDownloads: async (...args) => { calls.push(['history', ...args]); return [] },
    recordDownload: async (...args) => { calls.push(['download', ...args]); return { id: 'download' } },
  }
  const route = loadTs(file, { mocks: {
    '@/lib/auth-server': { getServerUser: async () => user },
    '@/lib/rate-limit': { checkRateLimit: () => ({ allowed: true, limit: 30, remaining: 29 }) },
    '@/lib/supabase/letters': letters,
    '@/lib/shares': { createShareRecord: async data => { calls.push(['share', data]); return { share_token: 'new-token' } } },
    '@/lib/supabase/public-letters': { createPublicLetter: async data => { calls.push(['public', data]); return { short_id: 'public-token' } } },
    '@/utils/helpers': { generateSlug: () => 'new-token', sanitizeInput: value => value.trim() },
  } })
  return { route, calls }
}

for (const owner of [ownerId, null]) {
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    test(`${method} blocks private letters owned by ${owner ? 'another user' : 'nobody'}`, async () => {
      const { route, calls } = setup('src/app/api/letters/[id]/route.ts', { owner })
      const response = await route[method](request(method === 'PATCH' ? { content: 'Changed' } : undefined, method), params)
      assert.equal(response.status, 403)
      assert.equal(calls.some(([name]) => name === 'update' || name === 'delete'), false)
    })
  }
  test(`publish blocks ${owner ? 'another user’s' : 'ownerless'} letter`, async () => {
    const { route, calls } = setup('src/app/api/letters/[id]/publish/route.ts', { owner })
    assert.equal((await route.POST(request({}), params)).status, 403)
    assert.equal(calls.some(([name]) => name === 'update'), false)
  })
}

test('owner can edit, while malformed changes are rejected before querying', async () => {
  const { route, calls } = setup('src/app/api/letters/[id]/route.ts', { user: { id: ownerId } })
  assert.equal((await route.PATCH(request({ is_public: 'false' }, 'PATCH'), params)).status, 400)
  assert.equal(calls.length, 0)
  assert.equal((await route.PATCH(request({ content: 'Updated' }, 'PATCH'), params)).status, 200)
  assert.equal(calls.find(([name]) => name === 'update')[2].content, 'Updated')
})

test('slug lookup avoids UUID queries and invalid mutation IDs fail before database access', async () => {
  const { route, calls } = setup('src/app/api/letters/[id]/route.ts', { isPublic: true })
  const slugParams = { params: Promise.resolve({ id: 'public-slug' }) }
  assert.equal((await route.GET(request(undefined, 'GET'), slugParams)).status, 200)
  assert.deepEqual(calls.map(([name]) => name), ['slug'])
  calls.length = 0
  assert.equal((await route.DELETE(request(undefined, 'DELETE'), slugParams)).status, 400)
  assert.equal(calls.length, 0)
})

for (const file of ['src/app/api/shares/route.ts', 'src/app/api/letters/share/route.ts']) {
  test(`${file} denies foreign letters and validates IDs`, async () => {
    const { route, calls } = setup(file)
    assert.equal((await route.POST(request({ letter_id: 'bad-id' }))).status, 400)
    assert.equal(calls.length, 0)
    assert.equal((await route.POST(request({ letter_id: letterId, letter_content: 'Submitted', receiver_name: 'Recipient' }))).status, 403)
    assert.equal(calls.some(([name]) => name === 'create' || name === 'share'), false)
  })

  test(`${file} copies anonymous submitted text without mutating the old letter`, async () => {
    const { route, calls } = setup(file, { owner: null })
    const response = await route.POST(request({ letter_id: letterId, letter_content: 'Submitted text', receiver_name: 'Recipient', expiration: '24h' }))
    assert.ok(response.ok)
    const created = calls.find(([name]) => name === 'create')[1]
    assert.equal(created.content, 'Submitted text')
    assert.equal(calls.find(([name]) => name === 'share')[1].letter_id, 'new-letter')
    assert.equal(calls.some(([name]) => name === 'update'), false)
    if (file === 'src/app/api/shares/route.ts') assert.equal(created.is_public, false)
  })
}

test('anonymous downloads cannot forge a user identity or read shared guest history', async () => {
  const { route, calls } = setup('src/app/api/downloads/route.ts')
  assert.equal((await route.POST(request({ user_id: ownerId, format: 'pdf' }))).status, 201)
  assert.deepEqual((await (await route.GET()).json()).downloads, [])
  assert.equal(calls.length, 0)
})

test('authenticated download history uses the session owner', async () => {
  const { route, calls } = setup('src/app/api/downloads/route.ts', { user: { id: ownerId } })
  await route.POST(request({ user_id: 'forged', format: 'pdf' }))
  await route.GET()
  assert.equal(calls.find(([name]) => name === 'download')[1], ownerId)
  assert.equal(calls.find(([name]) => name === 'history')[1], ownerId)
})

test('legacy public-letter creation cannot attach another user’s private letter', async () => {
  const { route, calls } = setup('src/app/api/public-letters/route.ts')
  assert.equal((await route.POST(request({ letter_id: letterId, receiver_name: 'Recipient', letter_content: 'Submitted' }))).status, 403)
  assert.equal(calls.some(([name]) => name === 'public'), false)
})
