const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const ts = require('typescript')

const root = path.resolve(__dirname, '../..')

// Execute real TypeScript modules with isolated collaborators and environment.
function createLoader({ mocks = {}, env = {}, globals = {} } = {}) {
  const cache = new Map()
  const context = vm.createContext({
    console, Buffer, URL, URLSearchParams, Request, Response, Headers,
    TextEncoder, TextDecoder, AbortController, crypto: globalThis.crypto,
    btoa, atob, setTimeout, clearTimeout, setInterval, clearInterval,
    process: { env: { NODE_ENV: 'test', ...env } },
    ...globals,
  })
  function load(file) {
    const filename = path.resolve(root, file)
    if (cache.has(filename)) return cache.get(filename).exports
    const mod = { exports: {} }
    cache.set(filename, mod)
    const nativeRequire = createRequire(filename)
    const localRequire = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier]
      if (specifier.startsWith('.') || specifier.startsWith('@/')) {
        const base = specifier.startsWith('@/')
          ? path.join(root, 'src', specifier.slice(2))
          : path.resolve(path.dirname(filename), specifier)
        const target = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]
          .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
        if (target?.match(/\.tsx?$/)) return load(target)
      }
      return nativeRequire(specifier)
    }
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: filename,
    }).outputText
    const run = vm.runInContext(`(function(require, module, exports) { ${code}\n})`, context, { filename })
    run(localRequire, mod, mod.exports)
    return mod.exports
  }
  return load
}

module.exports = { createLoader, loadTs: (file, options) => createLoader(options)(file) }
