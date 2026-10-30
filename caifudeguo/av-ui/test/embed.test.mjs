// 0.3.2: assets/embed.js trust model + resend handshake (run in a vm sandbox with a fake window/document).
// A message sizes an iframe only if (1) event.source === that iframe's contentWindow AND (2) event.origin is the origin of
// new URL(data-lazy-src || src, page base) or an explicitly configured extra origin. The page origin is never accepted implicitly.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

const code = readFileSync(new URL('../../wp-plugin/caifudeguo-av-depot/assets/embed.js', import.meta.url), 'utf8')
const PAGE = 'https://www.example-blog.de'
const APP = 'https://app.caifudeguo.de'
const HEIGHT = 'caifudeguo-av-depot:height'
const RESEND = 'caifudeguo-av-depot:resend'

function frame({ src = `${APP}/app/index.html?v=1`, lazy = null, win = { posted: [] } } = {}) {
  const attrs = {}
  if (src !== null)
    attrs.src = src
  if (lazy !== null)
    attrs['data-lazy-src'] = lazy
  const listeners = {}
  win.postMessage = (m, target) => { win.posted.push({ m, target }) }
  return {
    style: { height: '' },
    contentWindow: win,
    getAttribute: k => attrs[k] ?? null,
    addEventListener: (type, fn) => { (listeners[type] ??= []).push(fn) },
    fire: type => (listeners[type] ?? []).forEach(fn => fn()),
  }
}

/** load embed.js into a fresh sandbox; returns helpers. `frames` may change after start (lazy-loading plugins). */
function boot(frames, cfg) {
  const handlers = []
  const win = {
    addEventListener: (type, fn) => { if (type === 'message') handlers.push(fn) },
    location: { href: `${PAGE}/rechner/`, origin: PAGE },
  }
  if (cfg !== undefined)
    win.caifudeguoAvDepot = cfg
  const doc = {
    baseURI: `${PAGE}/rechner/`,
    querySelectorAll: sel => sel === 'iframe.caifudeguo-av-depot' ? frames : [],
  }
  const sandbox = { window: win, document: doc, location: win.location, URL, Number, Array, Math, Object }
  vm.runInNewContext(code, sandbox)
  return {
    win,
    send: (event) => { for (const h of handlers) h(event) },
    messages: handlers.length,
  }
}
const msg = (source, origin, height = 4000, type = HEIGHT) => ({ source, origin, data: { type, height } })
/** precondition for every negative test: the correct source+origin pair IS accepted (so the test cannot pass vacuously) */
function expectWorks(f, e, origin = APP) {
  e.send(msg(f.contentWindow, origin, 3000))
  expect(f.style.height).toBe('3000px')
  f.style.height = ''
}

describe('embed.js: source AND origin must match (RED for each)', () => {
  it('accepts a message from the iframe window with the iframe-derived origin, with no config at all', () => {
    const f = frame()
    const e = boot([f])
    e.send(msg(f.contentWindow, APP, 3999.2))
    expect(f.style.height).toBe('4000px')
  })
  it('wrong source rejected: right origin, but event.source is another window', () => {
    const f = frame()
    const other = { posted: [] }
    const e = boot([f])
    expectWorks(f, e)
    e.send(msg(other, APP))
    expect(f.style.height).toBe('')
  })
  it('wrong origin rejected: right source, but a different origin', () => {
    const f = frame()
    const e = boot([f])
    expectWorks(f, e)
    e.send(msg(f.contentWindow, 'https://evil.example'))
    e.send(msg(f.contentWindow, `${APP}:8443`))
    e.send(msg(f.contentWindow, 'http://app.caifudeguo.de'))
    expect(f.style.height).toBe('')
  })
  it('the page origin is NOT accepted implicitly: same-origin message whose source is not the iframe is rejected', () => {
    const f = frame()
    const e = boot([f])
    expectWorks(f, e)
    e.send(msg({ posted: [] }, PAGE))
    e.send(msg(null, PAGE))
    e.send(msg(undefined, PAGE))
    expect(f.style.height).toBe('')
  })
  it('the page origin is NOT accepted implicitly: the iframe window with the page origin is rejected when the iframe lives elsewhere', () => {
    const f = frame()
    const e = boot([f])
    expectWorks(f, e)
    e.send(msg(f.contentWindow, PAGE))
    expect(f.style.height).toBe('')
  })
  it('a same-origin iframe (src on the page origin) works through its own derived origin, no config needed', () => {
    const f = frame({ src: '/wp-content/plugins/x/app/index.html' })
    const e = boot([f])
    e.send(msg(f.contentWindow, PAGE, 2500))
    expect(f.style.height).toBe('2500px')
  })
  it('relative src is resolved against the page base URI', () => {
    const f = frame({ src: '../app/index.html' })
    const e = boot([f])
    e.send(msg(f.contentWindow, PAGE, 2600))
    expect(f.style.height).toBe('2600px')
  })
});

describe('embed.js: origin comes from new URL(data-lazy-src || src)', () => {
  it('data-lazy-src wins over src (a lazy-load plugin parks a placeholder in src)', () => {
    const f = frame({ src: 'data:image/gif;base64,R0lGOD', lazy: `${APP}/app/index.html` })
    const e = boot([f])
    e.send(msg(f.contentWindow, APP, 3100))
    expect(f.style.height).toBe('3100px')
  })
  it('falls back to src when data-lazy-src is empty', () => {
    const f = frame({ lazy: '' })
    const e = boot([f])
    e.send(msg(f.contentWindow, APP, 3200))
    expect(f.style.height).toBe('3200px')
  })
  it.each([
    ['no src, no data-lazy-src', null, null],
    ['empty src', '', null],
    ['about:blank (origin "null")', 'about:blank', null],
    ['data: URL (origin "null")', 'data:text/html,hi', null],
    ['unparsable URL', 'http://', null],
  ])('iframe origin cannot be determined (%s) → nothing is accepted, not even event.origin "null" or the page origin', (_n, src, lazy) => {
    const f = frame({ src, lazy })
    // even an explicitly configured extra origin must not rescue an iframe whose own origin is unknown
    const e = boot([f], { origins: [APP, PAGE] })
    for (const origin of ['null', '', PAGE, APP, 'https://evil.example'])
      e.send(msg(f.contentWindow, origin))
    expect(f.style.height).toBe('')
  })
})

describe('embed.js: config is optional and read lazily, per message', () => {
  it.each([
    ['missing', undefined],
    ['empty object', {}],
    ['origins not an array', { origins: 'https://evil.example' }],
    ['empty list', { origins: [] }],
    ['null', null],
  ])('config %s: only the iframe-derived origin passes; an unrelated origin is never accepted', (_n, cfg) => {
    const f = frame()
    const e = boot([f], cfg)
    expectWorks(f, e)
    for (const origin of ['https://evil.example', PAGE, 'null', '', 'https://caifudeguo.de'])
      e.send(msg(f.contentWindow, origin))
    expect(f.style.height).toBe('')
    e.send(msg(f.contentWindow, APP, 3300))
    expect(f.style.height).toBe('3300px')
  })
  it('config defined AFTER embed.js started (delayed inline script) is honoured; explicit extras still need the iframe as source', () => {
    const f = frame()
    const e = boot([f])
    expectWorks(f, e)
    e.win.caifudeguoAvDepot = { origins: ['https://cdn.example'] }
    e.send(msg(f.contentWindow, 'https://cdn.example', 2800))
    expect(f.style.height).toBe('2800px')
    f.style.height = ''
    e.send(msg({ posted: [] }, 'https://cdn.example', 2900))
    expect(f.style.height).toBe('')
  })
  it('config swapped after start is read again on the next message', () => {
    const f = frame()
    const e = boot([f], { origins: ['https://one.example'] })
    e.send(msg(f.contentWindow, 'https://two.example', 2100))
    expect(f.style.height).toBe('')
    e.win.caifudeguoAvDepot = { origins: ['https://two.example'] }
    e.send(msg(f.contentWindow, 'https://two.example', 2100))
    expect(f.style.height).toBe('2100px')
  })
  it('iframes inserted after start are found (queried per message)', () => {
    const frames = []
    const e = boot(frames)
    const f = frame()
    frames.push(f)
    e.send(msg(f.contentWindow, APP, 2200))
    expect(f.style.height).toBe('2200px')
  })
})

describe('embed.js: message shape', () => {
  it('ignores other types, non-numbers, too small values; clamps huge values; only the matching iframe is touched', () => {
    const a = frame()
    const b = frame({ win: { posted: [] } })
    const e = boot([a, b])
    e.send(msg(a.contentWindow, APP, 4000, 'something-else'))
    e.send(msg(a.contentWindow, APP, '4000'))
    e.send(msg(a.contentWindow, APP, Number.NaN))
    e.send(msg(a.contentWindow, APP, 99))
    e.send({ source: a.contentWindow, origin: APP, data: null })
    e.send({ source: a.contentWindow, origin: APP, data: 'x' })
    expect(a.style.height).toBe('')
    e.send(msg(a.contentWindow, APP, 9e9))
    expect(a.style.height).toBe('200000px')
    expect(b.style.height).toBe('')
  })
});

describe('embed.js: resend request on start (host started after the app\'s first message)', () => {
  it('asks every iframe with a determinable origin once, targetOrigin = that origin (never "*")', () => {
    const a = frame()
    const b = frame({ src: 'data:image/gif;base64,R0lGOD', lazy: 'https://other.example/app/index.html', win: { posted: [] } })
    boot([a, b])
    expect(a.contentWindow.posted).toEqual([{ m: { type: RESEND }, target: APP }])
    expect(b.contentWindow.posted).toEqual([{ m: { type: RESEND }, target: 'https://other.example' }])
  })
  it('does not post to an iframe whose origin cannot be determined, or without a contentWindow', () => {
    const a = frame({ src: 'about:blank' })
    const b = frame()
    b.contentWindow = null
    boot([a, b])
    expect(a.contentWindow.posted).toEqual([])
  })
  it('config origins do not widen the resend target', () => {
    const a = frame()
    boot([a], { origins: ['https://evil.example'] })
    expect(a.contentWindow.posted.map(p => p.target)).toEqual([APP])
  })
})

describe('embed.js: no CSSOM beyond the single height write', () => {
  it('exactly one `.style` occurrence, no cssText', () => {
    expect(code.split('\n').filter(l => l.includes('.style'))).toHaveLength(1)
    expect(code).not.toContain('cssText')
  })
})
