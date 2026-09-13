const assert = require('node:assert/strict')
const test = require('node:test')
const { createLoader } = require('./helpers/load-ts.cjs')

const id = '12345678-1234-4234-8234-123456789012'
const userId = '87654321-4321-4321-8321-210987654321'
const baseLetter = { receiver_name: 'Recipient', content: 'Current text', user_id: userId, is_public: false }

function setup({ configured = false, result = () => ({ data: null, error: null }), rpcResult = () => ({ data: null, error: null }) } = {}) {
  const queries = []
  const rpcs = []
  const clientKinds = []
  const client = {
    from(table) {
      const query = { table, operation: 'select', filters: [] }
      const finish = () => { queries.push(query); return result(query) }
      const chain = {
        insert(value) { query.operation = 'insert'; query.value = value; return chain },
        update(value) { query.operation = 'update'; query.value = value; return chain },
        delete() { query.operation = 'delete'; return chain },
        select(value) { query.selection = value; return chain },
        eq(...args) { query.filters.push(args); return chain },
        or(value) { query.or = value; return chain },
        order() { return chain },
        limit() { return chain },
        range() { return chain },
        maybeSingle: async () => finish(),
        single: async () => finish(),
        then(resolve, reject) { return Promise.resolve(finish()).then(resolve, reject) },
      }
      return chain
    },
    async rpc(name, params) { rpcs.push({ name, params }); return rpcResult(name, params) },
  }
  const server = { createClient: async () => { clientKinds.push('session'); return client } }
  const browser = { createClient: () => { clientKinds.push('browser'); return client } }
  const admin = { isServiceRoleConfigured: () => true, createAdminClient: () => { clientKinds.push('admin'); return client } }
  const config = { isSupabaseConfigured: configured }
  const load = createLoader({ mocks: {
    './server': server, './supabase/server': server,
    './client': browser, './supabase/client': browser,
    './admin': admin, './supabase/admin': admin,
    './config': config, './supabase/config': config,
  }, globals: { console: { ...console, error() {}, warn() {} } } })
  return {
    letters: load('src/lib/supabase/letters.ts'),
    shares: load('src/lib/shares.ts'),
    legacy: load('src/lib/supabase/public-letters.ts'),
    queries, rpcs, clientKinds,
  }
}

test('canonical current content wins while the original generated snapshot survives', async () => {
  const { letters } = setup()
  const letter = await letters.createLetter({ ...baseLetter, letter_content: 'Legacy', generated_content: 'AI original' })
  assert.equal(letter.content, 'Current text')
  assert.equal(letter.letter_content, 'Current text')
  assert.equal(letter.generated_content, 'AI original')
  assert.equal(letters.getLetterContent({ content: '', generated_content: 'Old AI' }), '')
  assert.equal(letters.getLetterContent({ letter_content: 'Legacy', generated_content: 'AI' }), 'Legacy')
})

test('manual edits clear stale enhancement aliases and retain the generation snapshot', async () => {
  const { letters } = setup()
  const original = await letters.createLetter({ ...baseLetter, content: 'Refined', enhanced_content: 'Refined', generated_content: 'AI original' })
  const edited = await letters.updateLetter(original.id, { letter_content: 'Manual edit' })
  assert.equal(edited.content, 'Manual edit')
  assert.equal(edited.letter_content, 'Manual edit')
  assert.equal(edited.enhanced_content, null)
  assert.equal(edited.enhanced_letter, null)
  assert.equal(edited.generated_content, 'AI original')
  const emptied = await letters.updateLetter(original.id, { content: '' })
  assert.equal(emptied.content, '')
  assert.equal(emptied.generated_content, 'AI original')
})

test('legacy refinement updates promote edited text; metadata updates preserve text', async () => {
  const { letters } = setup()
  const original = await letters.createLetter({ ...baseLetter, generated_content: 'AI original' })
  const refined = await letters.updateLetter(original.id, { enhanced_letter: 'New refinement' })
  assert.equal(refined.content, 'New refinement')
  assert.equal(refined.enhanced_content, 'New refinement')
  const metadata = await letters.updateLetter(original.id, { is_favorite: true, title: 'My letter' })
  assert.equal(metadata.content, 'New refinement')
  assert.equal(metadata.enhanced_letter, 'New refinement')
  assert.equal(metadata.generated_content, 'AI original')
  assert.equal(metadata.favorite, true)
})

test('invalid IDs and PostgREST filter injection never reach database operations', async () => {
  const { letters, shares, legacy, queries, rpcs } = setup({ configured: true })
  assert.equal(await letters.getLetterById('public-slug', true), null)
  await assert.rejects(letters.updateLetter('public-slug', { content: 'Bad' }, true), /Invalid letter ID/)
  assert.equal(await letters.deleteLetter('public-slug', true), false)
  assert.equal(await letters.getLetterByShareId('abc,or(id.neq.null)', true), null)
  assert.equal((await shares.getShareByToken('abc,or(id.neq.null)', false, true)).status, 'not_found')
  assert.equal((await legacy.getPublicLetter('abc,or(id.neq.null)', false, true)).status, 'not_found')
  assert.equal(await letters.incrementLetterViews('abc,or(id.neq.null)', true), 0)
  assert.equal(queries.length, 0)
  assert.equal(rpcs.length, 0)
})

test('configured persistence errors reject instead of returning memory records or fake success', async () => {
  const failure = () => ({ data: null, error: { code: '42501', message: 'Database unavailable' } })
  const { letters, shares, legacy } = setup({ configured: true, result: failure, rpcResult: failure })
  for (const operation of [
    () => letters.createLetter(baseLetter, true),
    () => letters.getLetterById(id, true),
    () => letters.getLetterByShareId('valid-token', true),
    () => letters.updateLetter(id, { content: 'Changed' }, true),
    () => letters.deleteLetter(id, true),
    () => letters.recordDownload(userId, id, 'pdf', true),
    () => letters.getUserDownloads(userId, true),
    () => letters.getUserLetters(userId, {}, true),
    () => shares.createShareRecord({ letter_id: id, user_id: userId }, true),
    () => shares.getShareByToken('valid-token', false, true),
    () => legacy.createPublicLetter({ receiver_name: 'Recipient', letter_content: 'Text' }, true),
    () => legacy.getPublicLetter('valid-token', false, true),
    () => shares.getUserSharedLetters(userId, true),
    () => letters.incrementLetterViews('valid-token', true),
    () => legacy.incrementPublicLetterViews('valid-token', true),
  ]) await assert.rejects(operation(), /Database unavailable/)
})

test('configured letter writes normalize aliases and use the session client for mutations', async () => {
  const { letters, queries, clientKinds } = setup({ configured: true, result: query => ({ data: { id, ...baseLetter, ...query.value }, error: null }) })
  await letters.updateLetter(id, { letter_content: 'Edited', is_favorite: true }, true)
  assert.equal(queries[0].value.content, 'Edited')
  assert.equal(queries[0].value.letter_content, 'Edited')
  assert.equal(queries[0].value.favorite, true)
  assert.deepEqual(clientKinds, ['session'])
})

test('deletion and slug changes remove every stale in-memory alias', async () => {
  const { letters } = setup()
  const letter = await letters.createLetter(baseLetter)
  await letters.updateLetter(letter.id, { share_slug: 'replacement-token' })
  assert.equal(await letters.getLetterByShareId(letter.share_id), null)
  assert.ok(await letters.getLetterByShareId('replacement-token'))
  assert.equal(await letters.deleteLetter(letter.id), true)
  assert.equal(await letters.getLetterById(letter.id), null)
  assert.equal(await letters.getLetterByShareId('replacement-token'), null)
})

test('repeated shares have unique tokens and do not publish their private source letter', async () => {
  const { letters, shares } = setup()
  const letter = await letters.createLetter(baseLetter)
  const first = await shares.createShareRecord({ letter_id: letter.id, is_public: true, expiration: '24h' })
  const second = await shares.createShareRecord({ letter_id: letter.id, is_public: true, expiration: 'never' })
  assert.notEqual(first.share_token, second.share_token)
  assert.notEqual(first.share_token, letter.share_id)
  assert.ok(first.expires_at)
  assert.equal(second.expires_at, null)
  assert.equal((await letters.getLetterById(letter.id)).is_public, false)
  assert.equal((await shares.getShareByToken(first.share_token)).status, 'ok')
  assert.equal((await shares.getShareByToken(letter.share_id)).status, 'private')
})

for (const blocked of ['private', 'expired']) {
  test(`${blocked} share tokens cannot fall through to a permanent public-letter alias`, async () => {
    const { letters, shares } = setup()
    const letter = await letters.createLetter({ ...baseLetter, is_public: true })
    const share = await shares.createShareRecord({ letter_id: letter.id, is_public: blocked !== 'private' })
    if (blocked === 'expired') share.expires_at = new Date(Date.now() - 1).toISOString()
    await letters.updateLetter(letter.id, { share_id: share.share_token })
    const lookup = await shares.getShareByToken(share.share_token)
    assert.equal(lookup.status, blocked)
    assert.equal(lookup.letter, null)
  })

  test(`RPC ${blocked} responses stop before legacy or direct-table lookup`, async () => {
    const { shares, queries, rpcs } = setup({ configured: true, rpcResult: () => ({ data: { status: blocked }, error: null }) })
    const lookup = await shares.getShareByToken('known-token', false, true)
    assert.equal(lookup.status, blocked)
    assert.equal(lookup.letter, null)
    assert.equal(queries.length, 0)
    assert.equal(rpcs.length, 1)
  })
}

test('dashboard history includes canonical and legacy shares once and excludes other users', async () => {
  const { letters, shares, legacy } = setup()
  const letter = await letters.createLetter(baseLetter)
  const canonical = await shares.createShareRecord({ letter_id: letter.id, user_id: userId })
  const old = await legacy.createPublicLetter({ receiver_name: 'Recipient', letter_content: 'Legacy copy', user_id: userId })
  await shares.createShareRecord({ letter_id: letter.id, user_id: 'another-user' })
  const history = await shares.getUserSharedLetters(userId)
  assert.equal(history.length, 2)
  assert.deepEqual(new Set(history.map(row => row.short_id)), new Set([canonical.share_token, old.short_id]))
  assert.equal(history.find(row => row.short_id === canonical.share_token).letter_content, 'Current text')
  assert.equal(history.find(row => row.short_id === old.short_id).letter_content, 'Legacy copy')
})

test('legacy private and invalid-expiry records return no letter content', async () => {
  const { legacy } = setup()
  const privateLetter = await legacy.createPublicLetter({ receiver_name: 'Recipient', letter_content: 'Private', is_public: false })
  assert.equal((await legacy.getPublicLetter(privateLetter.short_id)).letter, null)
  const expired = await legacy.createPublicLetter({ receiver_name: 'Recipient', letter_content: 'Expired' })
  expired.expires_at = 'invalid-date'
  const lookup = await legacy.getPublicLetter(expired.short_id)
  assert.equal(lookup.status, 'expired')
  assert.equal(lookup.letter, null)
})
