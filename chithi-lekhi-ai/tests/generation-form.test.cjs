const assert = require('node:assert/strict')
const test = require('node:test')
const { loadTs } = require('./helpers/load-ts.cjs')

function mount({ locale = 'en', ok = true, response = { success: true, letter: 'Generated letter', letterId: 'saved-letter' } } = {}) {
  const states = []
  const requests = []
  const generated = []
  const clearedIntervals = []
  let cursor = 0
  let releaseFetch
  const pendingFetch = new Promise(resolve => { releaseFetch = resolve })
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
    useMemo: factory => factory(),
  }
  const { EmotionalStorytellerForm } = loadTs('src/components/generator/EmotionalStorytellerForm.tsx', {
    mocks: {
      react,
      'lucide-react': Object.fromEntries(['Heart', 'Feather', 'Sparkles', 'Lightbulb', 'BookOpen'].map(name => [name, 'svg'])),
      '@/components/providers/LanguageProvider': { useLanguage: () => ({ locale, t: key => key }) },
      '@/hooks/useWritingLanguage': { useWritingLanguage: () => ({ writingLanguage: 'bengali' }) },
    },
    globals: {
      console: { ...console, error() {} },
      setInterval: () => 1,
      clearInterval: id => clearedIntervals.push(id),
      fetch: async (url, options) => {
        requests.push({ url, method: options.method, body: JSON.parse(options.body) })
        await pendingFetch
        return { ok, json: async () => response }
      },
    },
  })
  const render = () => {
    cursor = 0
    return EmotionalStorytellerForm({
      initialValues: { receiverName: '  Recipient  ', relationship: 'first-love', feeling: '  I miss you  ', memory: 'A shared memory' },
      onLetterGenerated: (...args) => generated.push(args),
    })
  }
  const nodes = node => Array.isArray(node)
    ? node.flatMap(nodes)
    : node && typeof node === 'object' ? [node, ...nodes(node.props.children)] : []
  const text = node => Array.isArray(node)
    ? node.map(text).join('')
    : node && typeof node === 'object' ? text(node.props.children) : typeof node === 'string' ? node : ''
  return {
    requests, generated, clearedIntervals, releaseFetch,
    submit: () => render().props.onSubmit({ preventDefault() {} }),
    submitButton: () => nodes(render()).find(node => node.type === 'button' && node.props.type === 'submit'),
    alert: () => nodes(render()).find(node => node.props.role === 'alert'),
    alertText: () => text(nodes(render()).find(node => node.props.role === 'alert')),
  }
}

test('valid generation submits once and advances through onLetterGenerated after success', async () => {
  const form = mount()
  const pending = form.submit()
  assert.equal(form.submitButton().props.disabled, true)
  assert.equal(form.generated.length, 0)
  assert.equal(form.requests.length, 1)
  assert.equal(form.requests[0].url, '/api/generate-letter')
  assert.equal(form.requests[0].method, 'POST')
  assert.equal(form.requests[0].body.receiverName, 'Recipient')
  assert.equal(form.requests[0].body.feeling, 'I miss you')
  form.releaseFetch()
  await pending
  assert.equal(form.generated.length, 1)
  assert.equal(form.generated[0][0].letter, 'Generated letter')
  assert.equal(form.generated[0][0].letterId, 'saved-letter')
  assert.equal(form.generated[0][1].receiverName, 'Recipient')
  assert.equal(form.submitButton().props.disabled, false)
  assert.equal(form.alert(), undefined)
  assert.deepEqual(form.clearedIntervals, [1])
})

for (const [locale, expected] of [
  ['en', 'Service configuration required.'],
  ['bn', 'সেবা চালু করতে কনফিগারেশন প্রয়োজন।'],
]) {
  test(`unconfigured generation displays the ${locale} alert without advancing`, async () => {
    const form = mount({ locale, ok: false, response: { success: false, error: {
      code: 'QUOTA_NOT_CONFIGURED', status: 503,
      message: 'Service configuration required.',
      messageEn: 'Service configuration required.',
      messageBn: 'সেবা চালু করতে কনফিগারেশন প্রয়োজন।',
    } } })
    const pending = form.submit()
    form.releaseFetch()
    await pending
    assert.equal(form.generated.length, 0)
    assert.equal(form.requests.length, 1)
    assert.equal(form.alertText(), `⚠️ ${expected}`)
    assert.equal(form.submitButton().props.disabled, false)
    assert.deepEqual(form.clearedIntervals, [1])
  })
}

test('daily quota exhaustion keeps the form and displays the quota message', async () => {
  const form = mount({ ok: false, response: { success: false, error: {
    code: 'DAILY_LIMIT_REACHED', status: 429, message: 'You have reached your daily limit.',
  } } })
  const pending = form.submit()
  form.releaseFetch()
  await pending
  assert.equal(form.generated.length, 0)
  assert.equal(form.alertText(), '⚠️ You have reached your daily limit.')
  assert.equal(form.submitButton().props.disabled, false)
})

test('legacy string errors remain visible without localized error fields', async () => {
  const form = mount({ ok: false, response: { success: false, error: 'Temporary service issue. Please try again.' } })
  const pending = form.submit()
  form.releaseFetch()
  await pending
  assert.equal(form.generated.length, 0)
  assert.equal(form.alertText(), '⚠️ Temporary service issue. Please try again.')
  assert.equal(form.submitButton().props.disabled, false)
})
