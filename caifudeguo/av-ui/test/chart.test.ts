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
