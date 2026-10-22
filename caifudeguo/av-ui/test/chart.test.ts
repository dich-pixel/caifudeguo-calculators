// Stage 3 g5: chart geometry (PLAN_stage3.md c).
import type { FormValues } from '../src/model'
import { describe, expect, it } from 'vitest'
import { chartHeight, geometry } from '../src/chart'
import { clearSweepCache, sweep } from '../src/compare'
import { DEFAULTS } from '../src/model'

const TODAY = new Date(2026, 9, 17)
const form = (f: Partial<FormValues['fields']> = {}): FormValues => ({ ...structuredClone(DEFAULTS), fields: { ...DEFAULTS.fields, ...f } })

describe('chart geometry', () => {
  it('height 200–320, depends only on width', () => {
    expect(chartHeight(317)).toBe(200)
    expect(chartHeight(375)).toBe(200)
    expect(chartHeight(800)).toBe(320)
    expect(chartHeight(600)).toBe(270)
  })
  it.each([['1.800', 12], ['9.000', 13], ['1.800,50', 13]])('user %s: %i evenly spaced points, band ⇔ verdict', (amount, n) => {
    clearSweepCache()
    const s = sweep(form({ savingsRate: amount }), undefined, { today: TODAY })!
    const g = geometry(s.rows, 800)
    expect(g.xs).toHaveLength(n)
    const gaps = g.xs.slice(1).map((x, i) => x - g.xs[i]!)
    for (const d of gaps) expect(d).toBeCloseTo(gaps[0]!, 9)
    expect(s.rows.map(r => r.amount)).toEqual([...s.rows.map(r => r.amount)].sort((a, b) => a - b))
    s.rows.forEach((r, i) => {
      const inside = Math.abs(r.diff) < g.band[i]!
      expect(inside).toBe(r.kind === 'same')
      expect(g.y(0) - g.y(r.diff)).toBeGreaterThanOrEqual(r.diff > 0 ? 0 : -Infinity)
    })
  })
})

// Stage 4 (Q7): below 400 px the chart labels must not overlap (estimated boxes, same width rule as chart.ts).
interface FakeEl { tag: string, attrs: Record<string, string>, textContent: string, children: FakeEl[], setAttribute: (k: string, v: string) => void, append: (...c: FakeEl[]) => void }
function fakeDocument() {
  const make = (tag: string): FakeEl => {
    const e: FakeEl = { tag, attrs: {}, textContent: '', children: [], setAttribute: (k, v) => { e.attrs[k] = v }, append: (...c) => { e.children.push(...c) } }
    return e
  }
  return { createElementNS: (_ns: string, tag: string) => make(tag) }
}
function texts(e: FakeEl): FakeEl[] {
  return [...(e.tag === 'text' ? [e] : []), ...e.children.flatMap(texts)]
}
const est = (s: string) => [...s].reduce((n, c) => n + (/[\u3000-\uFFFF]/.test(c) ? 12 : 7), 0)

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
  ])('%i px, user %s: kink and user labels do not overlap', async (width, amount) => {
    const g = globalThis as { document?: unknown }
    const saved = g.document
    g.document = fakeDocument()
    try {
      const { drawChart } = await import('../src/chart')
      clearSweepCache()
      const s = sweep(form({ savingsRate: amount }), undefined, { today: TODAY })!
      const svg = drawChart(s.rows, width) as unknown as FakeEl
      const marks = svg.children.filter(c => /^cmp3-marker-(?:360|1800)$/.test(c.attrs['data-testid'] ?? ''))
      expect(marks.map(m => m.attrs['data-testid'])).toEqual(['cmp3-marker-360', 'cmp3-marker-1800'])
      const labels = [...marks.flatMap(texts), ...svg.children.flatMap(texts).filter(e => e.attrs.class === 'user-label')]
      const boxes = labels.map((e) => {
        const x = Number(e.attrs.x)
        const y = Number(e.attrs.y)
        expect(e.attrs['text-anchor']).toBe('start')
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x + est(e.textContent)).toBeLessThanOrEqual(width)
        return { l: x, r: x + est(e.textContent), t: y - 11, b: y + 3 }
      })
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!
          const b = boxes[j]!
          expect(a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b, `${labels[i]!.textContent} / ${labels[j]!.textContent}`).toBe(false)
        }
      }
    }
    finally {
      g.document = saved
    }
  })
})
