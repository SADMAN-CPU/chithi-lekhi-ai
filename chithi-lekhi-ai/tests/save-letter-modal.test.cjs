const assert = require('node:assert/strict')
const test = require('node:test')
const { loadTs } = require('./helpers/load-ts.cjs')

const userId = '87654321-4321-4321-8321-210987654321'
const letterId = '12345678-1234-4234-8234-123456789012'

function mount({ user = { id: userId }, initialLetterId = letterId, ok = true, response = { success: true, letter: { id: letterId } } } = {}) {
  const states = []
  const calls = []
  const saved = []
  let cursor = 0
  const react = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }]
    },
    useRef: initial => ({ current: initial }),
    useEffect() {},
  }
  const { SaveLetterModal } = loadTs('src/components/letter/SaveLetterModal.tsx', {
    mocks: {
      react,
      'next/link': 'a',
      'lucide-react': Object.fromEntries(['Heart', 'Lock', 'Globe', 'X', 'Check', 'Copy', 'Sparkles'].map(name => [name, 'svg'])),
      '@/hooks/useAuth': { useAuth: () => ({ user }) },
      '@/components/providers/LanguageProvider': { useLanguage: () => ({ locale: 'en' }) },
    },
    globals: {
      console: { ...console, error() {} },
      fetch: async (url, options) => {
        calls.push({ url, method: options.method, body: JSON.parse(options.body) })
        return { ok, json: async () => response }
      },
    },
  })
  const render = () => {
    cursor = 0
    return SaveLetterModal({
      letter: 'Current edited text', receiverName: 'Recipient', letterId: initialLetterId,
      onClose() {}, onSaved: (...args) => saved.push(args),
    })
  }
  const text = node => {
    if (Array.isArray(node)) return node.map(text).join('')
    if (!node || typeof node === 'boolean') return ''
    return typeof node === 'object' ? text(node.props.children) : String(node)
  }
  const nodes = node => Array.isArray(node)
    ? node.flatMap(nodes)
    : node && typeof node === 'object' ? [node, ...nodes(node.props.children)] : []
  const button = label => {
    const found = nodes(render()).find(node => node.type === 'button' && text(node).startsWith(label))
    assert.ok(found, `Expected visible button: ${label}`)
    return found
  }
  return { calls, saved, text: () => text(render()), button, click: label => button(label).props.onClick() }
}

test('authenticated local letters are created through POST /api/letters', async () => {
  const modal = mount({ initialLetterId: 'local-123' })
  await modal.click('Save Privately')
  assert.equal(modal.calls.length, 1)
  assert.equal(modal.calls[0].url, '/api/letters')
  assert.equal(modal.calls[0].method, 'POST')
  assert.equal(modal.calls[0].body.content, 'Current edited text')
  assert.deepEqual(modal.saved, [[letterId, false]])
  assert.match(modal.text(), /Letter Saved Successfully/)
})

test('owned UUID private saves PATCH without resetting favorites', async () => {
  const modal = mount()
  await modal.click('Save Privately')
  assert.equal(modal.calls.length, 1)
  assert.equal(modal.calls[0].url, `/api/letters/${letterId}`)
  assert.equal(modal.calls[0].method, 'PATCH')
  assert.equal(Object.hasOwn(modal.calls[0].body, 'favorite'), false)
  assert.equal(Object.hasOwn(modal.calls[0].body, 'is_favorite'), false)
  assert.equal(modal.calls[0].body.is_public, false)
})

test('guest Save & Share uses one canonical call and does not claim ownership of the returned ID', async () => {
  const shareUrl = 'https://example.test/read/guest-token'
  const modal = mount({ user: null, initialLetterId: 'local-guest', response: { success: true, letter: { id: letterId, user_id: null }, shareUrl } })
  await modal.click('Save and share')
  await modal.click('Save & Create Link')
  assert.equal(modal.calls.length, 1)
  assert.equal(modal.calls[0].url, '/api/shares')
  assert.equal(modal.calls[0].method, 'POST')
  assert.equal(modal.calls[0].body.letter_content, 'Current edited text')
  assert.equal(modal.calls[0].body.user_id, null)
  assert.equal(modal.saved.length, 0)
  assert.ok(modal.text().includes(shareUrl))
  assert.match(modal.text(), /Letter Saved Successfully/)
})

test('share failures remain visible errors and allow retry without reporting a successful save', async () => {
  const modal = mount({ ok: false, response: { success: false, error: { message: 'Could not persist share' } } })
  await modal.click('Save and share')
  await modal.click('Save & Create Link')
  assert.equal(modal.calls.length, 1)
  assert.equal(modal.calls[0].url, '/api/shares')
  assert.match(modal.text(), /Could not persist share/)
  assert.doesNotMatch(modal.text(), /Letter Saved Successfully/)
  assert.equal(modal.button('Save & Create Link').props.disabled, false)
  assert.equal(modal.saved.length, 0)
})

test('a successful response without a share URL cannot display a successful share', async () => {
  const modal = mount()
  await modal.click('Save and share')
  await modal.click('Save & Create Link')
  assert.match(modal.text(), /Share link could not be created/)
  assert.doesNotMatch(modal.text(), /Letter Saved Successfully/)
  assert.equal(modal.saved.length, 0)
})
