// Start the production build on localhost:3100 before running this read/invalid-input smoke check.
const assert = require('node:assert/strict')
const base = process.env.CHITHI_SMOKE_URL || 'http://127.0.0.1:3100'
const cases = [
  ['/', 200], ['/login', 200], ['/signup', 200], ['/forgot-password', 200],
  ['/api/letters?userId=guest-user', 200],
  ['/api/user/shared-letters?userId=guest-user', 200],
  ['/api/downloads?userId=guest-user', 200],
  ['/admin', 307, { headers: { cookie: 'chithi_admin_token=forged' } }],
  ['/api/admin/stats', 401, { headers: { cookie: 'chithi_admin_token=forged' } }],
  ['/api/generate-letter', 400, { method: 'POST', body: '{}' }],
  ['/api/refine-letter', 400, { method: 'POST', body: '{}' }],
  ['/api/voice-letter', 400, { method: 'POST', body: '{}' }],
  ['/api/letters', 400, { method: 'POST', body: '{}' }],
  ['/api/shares', 400, { method: 'POST', body: '{"letter_id":"bad-id"}' }],
  ['/api/letters/share', 400, { method: 'POST', body: '{"letter_id":"bad-id"}' }],
  ['/api/read/%28unsafe%29', 404],
]
Promise.all(cases.map(async ([path, status, init]) => {
  const response = await fetch(`${base}${path}`, { ...init, redirect: 'manual', signal: AbortSignal.timeout(10000) })
  assert.equal(response.status, status, path)
  if (path === '/') assert.match(response.headers.get('content-security-policy'), /media-src 'self' data: blob:/)
  if (path.includes('guest-user')) {
    const data = await response.json()
    assert.equal(data.success, true)
    assert.equal((data.letters || data.sharedLetters || data.downloads).length, 0)
  }
})).then(() => console.log(`${cases.length} HTTP smoke checks passed`)).catch(error => { console.error(error); process.exitCode = 1 })
