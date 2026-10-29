// 0.3.2: the app reports its height on start, on resize/load, and again whenever its parent asks (embed.js may start late).
import { describe, expect, it } from 'vitest'
import { HEIGHT_MESSAGE_TYPE, HEIGHT_REQUEST_TYPE } from '../src/params'

interface Posted { m: unknown, target: string }
async function setup(opts: { embedded?: boolean, height?: number } = {}) {
  const { startHeightReporting } = await import('../src/height')
  const posted: Posted[] = []
  const parent = { postMessage: (m: unknown, target: string) => posted.push({ m, target }) }
  const listeners: Record<string, ((e: any) => void)[]> = {}
  let height = opts.height ?? 3000
  let resize: (() => void) | undefined
  const classes: string[] = []
  const win = {
    parent: opts.embedded === false ? undefined as unknown : parent,
    addEventListener: (t: string, fn: (e: any) => void) => { (listeners[t] ??= []).push(fn) },
  }
  if (opts.embedded === false)
    win.parent = win
  const env = {
    win,
    root: { getBoundingClientRect: () => ({ height }), classList: { add: (c: string) => classes.push(c) } },
    observe: (fn: () => void) => { resize = fn },
  }
  startHeightReporting(env as any)
  return {
    posted,
    classes,
    parent,
    fire: (t: string, e: any = {}) => (listeners[t] ?? []).forEach(fn => fn(e)),
    resize: () => resize?.(),
    setHeight: (h: number) => { height = h },
  }
}
const heights = (p: Posted[]) => p.map(x => (x.m as any).height)

describe('height reporting', () => {
  it('constants', () => {
    expect(HEIGHT_MESSAGE_TYPE).toBe('caifudeguo-av-depot:height')
    expect(HEIGHT_REQUEST_TYPE).toBe('caifudeguo-av-depot:resend')
  })
  it('does nothing when not embedded', async () => {
    const s = await setup({ embedded: false })
    expect(s.posted).toEqual([])
    expect(s.classes).toEqual([])
  })
  it('sends once on start, adds the embedded class, rounds up', async () => {
    const s = await setup({ height: 1234.2 })
    expect(s.classes).toEqual(['embedded'])
    expect(s.posted).toEqual([{ m: { type: HEIGHT_MESSAGE_TYPE, height: 1235 }, target: '*' }])
  })
  it('sends on resize / load only when the height changed', async () => {
    const s = await setup()
    s.resize()
    s.fire('load')
    expect(s.posted).toHaveLength(1)
    s.setHeight(3500)
    s.resize()
    s.fire('load')
    expect(heights(s.posted)).toEqual([3000, 3500])
  })
  it('a resend request from the parent window repeats the unchanged height', async () => {
    const s = await setup()
    s.fire('message', { source: s.parent, data: { type: HEIGHT_REQUEST_TYPE } })
    s.fire('message', { source: s.parent, data: { type: HEIGHT_REQUEST_TYPE } })
    expect(heights(s.posted)).toEqual([3000, 3000, 3000])
  })
  it('a resend request from anything but window.parent is ignored', async () => {
    const s = await setup()
    for (const source of [{}, null, undefined, { postMessage: () => 0 }])
      s.fire('message', { source, data: { type: HEIGHT_REQUEST_TYPE } })
    expect(s.posted).toHaveLength(1)
  })
  it('other message types / shapes from the parent are ignored', async () => {
    const s = await setup()
    for (const data of [{ type: HEIGHT_MESSAGE_TYPE }, { type: 'x' }, null, 'resend', 5, undefined])
      s.fire('message', { source: s.parent, data })
    expect(s.posted).toHaveLength(1)
  })
})
