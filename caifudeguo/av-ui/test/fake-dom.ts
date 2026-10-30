// Minimal DOM stand-in for the DOM-less tests (stage 5): enough for dom.ts h()/txt(), chart.ts el() and the views.
export interface FakeEl {
  tag: string
  attrs: Record<string, string>
  textContent: string
  children: (FakeEl | string)[]
  hidden: boolean
  clientWidth: number
  setAttribute: (k: string, v: string) => void
  getAttribute: (k: string) => string | null
  removeAttribute: (k: string) => void
  hasAttribute: (k: string) => boolean
  append: (...c: (FakeEl | string)[]) => void
  replaceChildren: (...c: (FakeEl | string)[]) => void
  insertBefore: (c: FakeEl, ref: FakeEl) => void
  addEventListener: (type: string, fn: (ev: { preventDefault: () => void }) => void) => void
  click: () => void
  /** count of scrollIntoView calls and the last options (stage 5 (2)) */
  scrolled: { n: number, opts?: unknown }
  scrollIntoView: (opts?: unknown) => void
  classList: { toggle: (c: string, on?: boolean) => void, contains: (c: string) => boolean }
}

/** width every new fake element reports as clientWidth (0 = not laid out yet) */
let fakeWidth = 0
export function setFakeWidth(w: number): void {
  fakeWidth = w
}

export function make(tag: string): FakeEl {
  const listeners: Record<string, ((ev: { preventDefault: () => void }) => void)[]> = {}
  const e: FakeEl = {
    tag,
    attrs: {},
    children: [],
    hidden: false,
    clientWidth: fakeWidth,
    get textContent() { return e.children.map(c => typeof c === 'string' ? c : c.textContent).join('') },
    set textContent(v: string) { e.children = [v] },
    setAttribute: (k, v) => {
      e.attrs[k] = v
      if (k === 'hidden')
        e.hidden = true
    },
    getAttribute: k => e.attrs[k] ?? null,
    removeAttribute: (k) => { delete e.attrs[k] },
    hasAttribute: k => k in e.attrs,
    append: (...c) => { e.children.push(...c) },
    replaceChildren: (...c) => { e.children = [...c] },
    insertBefore: (c, ref) => { e.children.splice(Math.max(0, e.children.indexOf(ref)), 0, c) },
    addEventListener: (type, fn) => { (listeners[type] ??= []).push(fn) },
    click: () => { for (const fn of listeners.click ?? []) fn({ preventDefault: () => {} }) },
    scrolled: { n: 0 },
    scrollIntoView: (opts) => { e.scrolled = { n: e.scrolled.n + 1, opts } },
    classList: {
      toggle: (c, on) => {
        const set = new Set((e.attrs.class ?? '').split(' ').filter(Boolean))
        if (on ?? !set.has(c))
          set.add(c)
        else set.delete(c)
        e.attrs.class = [...set].join(' ')
      },
      contains: c => (e.attrs.class ?? '').split(' ').includes(c),
    },
  }
  return e
}

/** install a fake document (and ResizeObserver) on globalThis; returns a restore function */
export function installFakeDom(): () => void {
  const g = globalThis as Record<string, unknown>
  const saved = { document: g.document, ResizeObserver: g.ResizeObserver }
  g.document = { createElementNS: (_ns: string, tag: string) => make(tag), createElement: (tag: string) => make(tag) }
  g.ResizeObserver = class { observe() {} disconnect() {} }
  return () => {
    g.document = saved.document
    g.ResizeObserver = saved.ResizeObserver
  }
}

export function all(e: FakeEl | string, pred: (x: FakeEl) => boolean): FakeEl[] {
  if (typeof e === 'string')
    return []
  return [...(pred(e) ? [e] : []), ...e.children.flatMap(c => all(c, pred))]
}
export const byTestId = (root: FakeEl, id: string) => all(root, x => x.attrs['data-testid'] === id)

/** Attribute-order-preserving serialisation (outerHTML stand-in): <tag a="v" ...>children</tag>. */
export function serialize(e: FakeEl | string, skipAttrs: readonly string[] = []): string {
  if (typeof e === 'string')
    return e
  const attrs = Object.entries(e.attrs).filter(([k]) => !skipAttrs.includes(k)).map(([k, v]) => ` ${k}="${v}"`).join('')
  return `<${e.tag}${attrs}>${e.children.map(c => serialize(c, skipAttrs)).join('')}</${e.tag}>`
}
