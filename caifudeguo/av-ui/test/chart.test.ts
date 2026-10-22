// Stage 3 g5 / stage 4 Q7 / stage 5 B, E: chart geometry, dual axis, label placement.
import type { CmpRow } from '../src/compare'
import type { FormValues } from '../src/model'
import type { FakeEl } from './fake-dom'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { axes, chartHeight, drawChart, GAP, geometry, NARROW_RIGHT_TICKS, PAD } from '../src/chart'
import { clearSweepCache, sweep } from '../src/compare'
import { DEFAULTS } from '../src/model'
import { all, byTestId, installFakeDom } from './fake-dom'

const TODAY = new Date(2026, 9, 17)
const form = (f: Partial<FormValues['fields']> = {}, mode?: FormValues['taxSavingsMode']): FormValues => ({ ...structuredClone(DEFAULTS), ...(mode ? { taxSavingsMode: mode } : {}), fields: { ...DEFAULTS.fields, ...f } })
const est = (s: string) => [...s].reduce((n, c) => n + (/[\u3000-\uFFFF]/.test(c) ? 13 : 7), 0)

let restore: () => void
beforeAll(() => { restore = installFakeDom() })
afterAll(() => restore())

describe('chart geometry', () => {
  it('height 200–320, depends only on width', () => {
    expect(chartHeight(317)).toBe(200)
    expect(chartHeight(375)).toBe(200)
    expect(chartHeight(800)).toBe(320)
    expect(chartHeight(600)).toBe(270)
  })
  it.each([['1.800', 12], ['9.000', 13], ['1.800,50', 13]])('user %s: %i evenly spaced points, no band, diff sign kept', (amount, n) => {
    clearSweepCache()
    const s = sweep(form({ savingsRate: amount }), undefined, { today: TODAY })!
    const g = geometry(s.rows, 800)
    expect(g.xs).toHaveLength(n)
    expect('band' in g).toBe(false)
    const gaps = g.xs.slice(1).map((x, i) => x - g.xs[i]!)
    for (const d of gaps) expect(d).toBeCloseTo(gaps[0]!, 9)
    for (const r of s.rows) {
      expect(Math.sign(g.y(0) - g.y(r.diff))).toBe(Math.sign(r.diff))
      if (r.rel !== null)
        expect(Math.sign(g.y(0) - g.yR(r.rel))).toBe(Math.sign(r.rel))
    }
  })
  it('both axes share the zero line', () => {
    for (const [l, r] of [[[-500, 3000], [-2, 4]], [[100, 900], [-30, 1]], [[-9000, -10], [0.5, 12]]] as const) {
      const a = axes([...l], [...r], 50, 250, false)
      expect(a.y(0)).toBeCloseTo(a.yR(0), 9)
      for (const v of l) expect(a.y(v)).toBeGreaterThanOrEqual(50 - 1e-9)
      for (const v of r) expect(a.yR(v)).toBeLessThanOrEqual(250 + 1e-9)
    }
  })
  it('narrow: at most 3 right ticks', () => {
    for (const r of [[-1, 37], [-12, 13], [0.1, 0.9], [-80, 5]]) {
      const a = axes([-100, 2000], r, 50, 160, true)
      expect(a.ticksR.length).toBeLessThanOrEqual(NARROW_RIGHT_TICKS)
      expect(a.ticksR).toContain(0)
    }
  })
})

describe('chart drawing (stage 5 B)', () => {
  it('no band, dashed rel line, right axis, legend', () => {
    clearSweepCache()
    const s = sweep(form(), undefined, { today: TODAY })!
    const svg = drawChart(s.rows, 800) as unknown as FakeEl
    expect(all(svg, e => (e.attrs.class ?? '').includes('band'))).toEqual([])
    expect(byTestId(svg, 'chart-rel')).toHaveLength(1)
    const lines = all(svg, e => e.tag === 'polyline' && e.attrs.class === 'rel')
    expect(lines.length).toBeGreaterThan(0)
    for (const l of lines) expect(l.attrs['stroke-dasharray']).toBe('5 3')
    expect(byTestId(svg, 'chart-axis-right')[0]!.textContent).toContain('%')
    expect(byTestId(svg, 'chart-legend')[0]!.textContent).toContain('虚线')
  })
  it('rel null breaks the dashed line and drops the point', () => {
    clearSweepCache()
    const s = sweep(form(), undefined, { today: TODAY })!
    const rows: CmpRow[] = s.rows.map((r, i) => (i === 3 ? { ...r, rel: null } : r))
    const svg = drawChart(rows, 800) as unknown as FakeEl
    const lines = all(svg, e => e.tag === 'polyline' && e.attrs.class === 'rel')
    expect(lines).toHaveLength(2)
    expect(all(svg, e => e.attrs.class === 'rel-pt')).toHaveLength(rows.length - 1)
  })
})

function boxesOf(svg: FakeEl, width: number) {
  return all(svg, e => e.tag === 'text' && e.attrs.transform === undefined).map((e) => {
    const x = Number(e.attrs.x)
    const y = Number(e.attrs.y)
    expect(e.attrs['text-anchor'], e.textContent).toMatch(/^(?:start|middle)$/)
    const l = e.attrs['text-anchor'] === 'middle' ? x - est(e.textContent) / 2 : x
    expect(l, e.textContent).toBeGreaterThanOrEqual(0)
    expect(l + est(e.textContent), e.textContent).toBeLessThanOrEqual(width)
    return { text: e.textContent, cls: e.attrs.class ?? '', l, r: l + est(e.textContent), t: y - 11, b: y + 3 }
  })
}

describe('chart labels on narrow screens (stage 4, Q7)', () => {
  it.each([
    [320, '1.800'],
    [360, '1.800'],
    [375, '1.800'],
    [320, '400'],
    [360, '2.000'],
    [375, '300'],
    [320, '1.700'],
    [375, '6.840'],
  ])('%i px, user %s: kink and user labels do not overlap', (width, amount) => {
    clearSweepCache()
    const s = sweep(form({ savingsRate: amount }), undefined, { today: TODAY })!
    const svg = drawChart(s.rows, width) as unknown as FakeEl
    const marks = svg.children.filter((c): c is FakeEl => typeof c !== 'string' && /^cmp3-marker-(?:360|1800)$/.test(c.attrs['data-testid'] ?? ''))
    expect(marks.map(m => m.attrs['data-testid'])).toEqual(['cmp3-marker-360', 'cmp3-marker-1800'])
    const labels = boxesOf(svg, width).filter(b => /拐点|你的金额/.test(b.text))
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i]!
        const b = labels[j]!
        expect(a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b, `${a.text} / ${b.text}`).toBe(false)
      }
    }
  })
})

// Stage 5 E: user amount swept in 120 € steps; kink / user / cap labels keep ≥ 4 px from each other and every other text
describe('label sweep (stage 5 E)', () => {
  const amounts = Array.from({ length: Math.floor(6840 / 120) }, (_, i) => (i + 1) * 120)
  const cases: [string, FormValues['taxSavingsMode'] | undefined, Partial<FormValues['fields']>][] = [
    ['default', undefined, {}],
    ['consume', 'consume', {}],
    ['secondaryDepot', 'secondaryDepot', {}],
    ['zvE 20.000', undefined, { zveSavingsPhase: '20.000' }],
  ]
  it.each(cases.flatMap(([n, m, f]) => [1280, 375].map(w => [n, m, f, w] as const)))('%s @ %d px', (_n, mode, f, width) => {
    const bad: string[] = []
    for (const a of amounts) {
      clearSweepCache()
      const s = sweep(form({ ...f, savingsRate: String(a).replace(/\B(?=(\d{3})+$)/g, '.') }, mode), undefined, { today: TODAY })
      if (!s)
        continue
      const svg = drawChart(s.rows, width) as unknown as FakeEl
      const bs = boxesOf(svg, width)
      const movable = bs.filter(b => /拐点|你的金额|上限/.test(b.text))
      for (const m of movable) {
        for (const o of bs) {
          if (o === m)
            continue
          const apart = m.r + GAP <= o.l || o.r + GAP <= m.l || m.b + GAP <= o.t || o.b + GAP <= m.t
          if (!apart)
            bad.push(`${a}: ${m.text} / ${o.text}`)
        }
      }
    }
    expect([...new Set(bad)].join('\n')).toBe('')
  }, 120_000)
})

void PAD
