const assert = require('node:assert/strict')
const test = require('node:test')
const { loadTs } = require('./helpers/load-ts.cjs')

function setup({ mobile = false, fontsReady = Promise.resolve(), captureError = false, downloadError = false } = {}) {
  const captures = []
  const events = []
  class FakePdf {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }
    addPage(...args) { events.push(['page', ...args]) }
    addImage(...args) { events.push(['image', ...args]) }
    save(filename) { events.push(['save', filename]) }
  }
  const api = loadTs('src/lib/export-utils.ts', {
    globals: {
      window: { innerWidth: mobile ? 390 : 1400 },
      navigator: { userAgent: mobile ? 'iPhone' : 'Desktop' },
      document: {
        fonts: { ready: fontsReady },
        body: {
          appendChild: element => events.push(['append', element]),
          removeChild: element => events.push(['remove', element]),
        },
        createElement: () => ({ click() {
          events.push(['download', this.download, this.href])
          if (downloadError) throw new Error('Download blocked')
        } }),
      },
      setTimeout: callback => { callback(); return 0 },
    },
    mocks: {
      '@/utils/helpers': { formatDate: value => value },
      'html-to-image': {
        getFontEmbedCSS: async () => { events.push(['fonts']); return 'embedded-letter-fonts' },
        toPng: async (element, options) => {
          captures.push({ element, options })
          if (captureError) throw new Error('Capture failed')
          return `data:image/png;base64,${element.id}`
        },
      },
      jspdf: FakePdf,
    },
  })
  return { api, captures, events }
}

test('capture waits for fonts and preserves desktop print quality', async () => {
  let ready
  const { api, captures } = setup({ fontsReady: new Promise(resolve => { ready = resolve }) })
  const promise = api.captureElementAsPng({ id: 'letter' }, 3.5, 0.99)
  await Promise.resolve()
  assert.equal(captures.length, 0)
  ready()
  await promise
  assert.equal(captures[0].options.pixelRatio, 3.5)
  assert.equal(captures[0].options.quality, 0.99)
  assert.equal(captures[0].options.cacheBust, false)
})

test('merged and single PNG exports use the selected quality and remove download nodes', async () => {
  const { api, captures, events } = setup()
  assert.equal(api.exportMergedLetterPng, api.exportElementToPng)
  await api.exportMergedLetterPng({ id: 'long-letter' }, 'full', undefined, { pixelRatio: 3.5, quality: 0.99 })
  assert.equal(captures[0].options.pixelRatio, 3.5)
  assert.equal(captures[0].options.quality, 0.99)
  assert.deepEqual(events.map(([name]) => name), ['append', 'download', 'remove'])
  assert.equal(events[1][1], 'full.png')
})

test('mobile PNG capture retains the existing safe resolution cap', async () => {
  const { api, captures } = setup({ mobile: true })
  await api.exportElementToPng({ id: 'letter' }, 'letter.png', undefined, { pixelRatio: 3.5 })
  assert.equal(captures[0].options.pixelRatio, 2)
})

test('multipage PDF embeds fonts once and exports every A4 page in order', async () => {
  const { api, captures, events } = setup()
  await api.exportMultiPageA4Pdf([{ id: 'one' }, { id: 'two' }], 'letter')
  assert.deepEqual(captures.map(({ element }) => element.id), ['one', 'two'])
  assert.equal(events.filter(([name]) => name === 'fonts').length, 1)
  assert.equal(events.filter(([name]) => name === 'page').length, 1)
  assert.ok(captures.every(({ options }) => options.fontEmbedCSS === 'embedded-letter-fonts'))
  assert.deepEqual(events.filter(([name]) => name === 'image').map(event => event.slice(3, 7)), [[0, 0, 210, 297], [0, 0, 210, 297]])
  assert.deepEqual(events.at(-1), ['save', 'letter.pdf'])
})

test('legacy single-page PDF uses the same A4 capture path', async () => {
  const { api, captures, events } = setup()
  await api.exportElementToA4Pdf({ id: 'one' }, 'single.pdf')
  assert.equal(captures.length, 1)
  assert.equal(events.filter(([name]) => name === 'image').length, 1)
  assert.deepEqual(events.at(-1), ['save', 'single.pdf'])
})

test('empty or failed PDF capture rejects without saving a partial export', async () => {
  const { api, events } = setup({ captureError: true })
  await assert.rejects(api.exportMultiPageA4Pdf([], 'empty'))
  await assert.rejects(api.exportMultiPageA4Pdf([{ id: 'one' }], 'failed'), /Capture failed/)
  assert.equal(events.some(([name]) => name === 'save'), false)
})

test('download nodes are cleaned up even when a browser download fails', () => {
  const { api, events } = setup({ downloadError: true })
  assert.throws(() => api.downloadDataUrl('data:image/png;base64,a', 'letter.png'), /Download blocked/)
  assert.equal(events.at(-1)[0], 'remove')
})
