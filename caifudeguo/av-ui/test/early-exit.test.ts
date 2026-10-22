// Stage 5 C: early-withdrawal layer (PLAN_stage5.md C.2–C.6, E.7). Separate from the core; reference values = plan C.6.
import type { FormValues } from '../src/model'
import type { FakeEl } from './fake-dom'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { earlyExitFor, exitYears } from '../src/early-exit'
import { calculateZulagen, germanIncomeTax } from '../src/generated/av-depot-exposed'
import { DEFAULTS, evaluate  } from '../src/model'
import { all, byTestId, installFakeDom } from './fake-dom'

const TODAY = new Date(2026, 9, 17)
const form = (f: Partial<FormValues['fields']> = {}, mode: FormValues['taxSavingsMode'] = 'avDepot', kids: string[] = []): FormValues =>
  ({ ...structuredClone(DEFAULTS), taxSavingsMode: mode, kids, fields: { ...DEFAULTS.fields, ...f } })
const run = (v: FormValues) => {
  const e = earlyExitFor(v, TODAY)!
  expect(e).not.toBeNull()
  return e
}
const at = (v: FormValues, n: number) => run(v).points.find(p => p.year === n)!
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(0.01)
const coreAv = (v: FormValues, n: number) => {
  const o = evaluate(v, TODAY)
  if (!o.ok)
    throw new Error('invalid')
  return o.result.years[n - 1]!.capitalEnd.avDepot
}

describe('data points (C.4)', () => {
  it('every 5 years plus the year before retirement', () => {
    expect(exitYears(32)).toEqual([5, 10, 15, 20, 25, 30, 31])
    expect(exitYears(1)).toEqual([])
    expect(exitYears(6)).toEqual([5])
    expect(exitYears(17)).toEqual([5, 10, 15, 16])
    expect(run(form()).points.map(p => p.year)).toEqual([5, 10, 15, 20, 25, 30, 31])
  })
  it('66 → 67: no points; 61 → 67: only year 5', () => {
    expect(run(form({ age: '66' })).points).toEqual([])
    expect(run(form({ age: '61' })).points.map(p => p.year)).toEqual([5])
  })
})

describe('c.6 reference values', () => {
  it('e1: 1.800, reinvest, N = 10', () => {
    const p = at(form(), 10)
    // core row.age = age at the start of year N (35 + 9); the plan's 「45 岁」 counts the end of year N
    expect(p.age).toBe(44)
    near(p.avBalance, 34106.58)
    near(p.zulagen, 5400)
    near(p.taxSaving, 2720)
    near(p.ownToAv, 20720)
    near(p.taxableGain, 7986.58)
    near(p.avTax, 2915)
    near(p.avNet, 23071.58)
    near(p.normalBalance, 23725.43)
    near(p.normalTaxable, 3007.80)
    near(p.normalTax, 793.31)
    near(p.normalNet, 22932.12)
    near(p.diff, 139.45)
    expect(p.rel!).toBeCloseTo(0.60, 2)
    expect(p.secBalance).toBe(0)
  })
  it('e1 by hand: AV tax = ESt(zvE + G) − ESt(zvE) (no Soli at this level)', () => {
    const p = at(form(), 10)
    expect(germanIncomeTax(50000 + p.taxableGain) - germanIncomeTax(50000)).toBeCloseTo(p.avTax, 6)
    expect(germanIncomeTax(50000 + p.taxableGain)).toBeGreaterThan(germanIncomeTax(50000))
  })
  it('e2: N = 20', () => {
    const p = at(form(), 20)
    expect(p.age).toBe(54)
    near(p.avBalance, 94043.55)
    near(p.taxableGain, 41803.55)
    near(p.avTax, 17714.44)
    near(p.avNet, 60089.11)
    near(p.normalNet, 60899.54)
    near(p.diff, -810.43)
    expect(p.rel!).toBeCloseTo(-1.35, 2)
  })
  it('e3: 3.600, consume, N = 10 — Q15(b): refunds received count on the AV side', () => {
    const p = at(form({ savingsRate: '3.600' }, 'consume'), 10)
    near(p.avBalance, 54058.66)
    near(p.taxableGain, 12658.66)
    near(p.avTax, 4722)
    near(p.received, 2720)
    near(p.avNet, 41216.66 + 2720)
    near(p.normalNet, 45600.50)
    near(p.diff, -1663.83)
    expect(p.rel!).toBeCloseTo(-3.79, 2)
    expect(p.secBalance).toBe(0)
  })
  it('e4: 1.800, secondary account, N = 10; B + Sec = core', () => {
    const v = form({}, 'secondaryDepot')
    const p = at(v, 10)
    near(p.avBalance, 30554.90)
    near(p.secBalance, 3585.18)
    near(p.secContrib, 2720)
    near(p.secTax, 0)
    near(p.taxableGain, 7154.90)
    near(p.avTax, 2601)
    near(p.avNet, 23419.07)
    near(p.diff, 486.95)
    expect(p.rel!).toBeCloseTo(2.08, 2)
    near(p.avBalance + p.secBalance, coreAv(v, 10))
  })
  it('e5: 13.500, reinvest overflow', () => {
    const p = at(form({ savingsRate: '13.500' }), 10)
    near(p.secBalance, 1212.63)
    near(p.secContrib, 920)
    near(p.avBalance, 185679.75)
    near(p.taxableGain, 43479.75)
    near(p.avTax, 18502.22)
    near(p.avNet, 160270.16)
    near(p.normalNet, 170276.55)
    near(p.diff, -10006.38)
    expect(p.rel!).toBeCloseTo(-6.24, 2)
  })
  it('overflow boundary: 13.408 no secondary, 13.409 secondary 13,18 at year 10', () => {
    expect(at(form({ savingsRate: '13.408' }), 10).secBalance).toBe(0)
    near(at(form({ savingsRate: '13.409' }), 10).secBalance, 13.18)
  })
})

describe('invariants over modes and inputs (E.7)', () => {
  const variants: [string, FormValues][] = [
    ['reinvest', form()],
    ['secondary', form({}, 'secondaryDepot')],
    ['consume', form({}, 'consume')],
    ['basiszins 2,53 %', form({ baseRate: '2,53' })],
    ['kids', form({}, 'avDepot', ['2015', '2024'])],
    ['age 22 (starter bonus)', form({ age: '22' })],
    ['13.500 reinvest', form({ savingsRate: '13.500' })],
  ]
  it.each(variants)('%s: B + Sec = core, refunds yearly, AV tax only on B', (_n, v) => {
    const e = run(v)
    expect(e.points.length).toBeGreaterThan(0)
    for (const p of e.points) {
      near(p.avBalance + p.secBalance, coreAv(v, p.year))
      expect(p.taxSaving).toBeGreaterThanOrEqual(0)
      near(p.gain, Math.max(0, p.avBalance - p.zulagen - p.ownToAv))
      if (v.taxSavingsMode === 'consume')
        expect(p.secBalance).toBe(0)
      near(p.diff, p.avNet - p.normalNet)
      near(p.normalNet, p.normalBalance - p.normalTax)
    }
  })
  it('basiszins 2,53 %: Vorabpauschale is deducted on the normal side', () => {
    const p = at(form({ baseRate: '2,53' }), 10)
    expect(p.normalVorab).toBeGreaterThan(0)
    near(p.normalTaxable, Math.max(0, (p.normalBalance - 18000 - p.normalVorab) * 0.7 - 1000))
  })
  it('kids: Zulagen = Σ yearly core Zulagen (calendar years)', () => {
    const p = at(form({}, 'avDepot', ['2015', '2024']), 10)
    let z = 0
    for (let y = 1; y <= 10; y++) {
      const r = calculateZulagen(1800, y, 2027, 35, [2015, 2024])
      z += r.grundzulage + r.kinderzulage + r.starterBonus
    }
    near(p.zulagen, z)
    expect(p.zulagen).toBeGreaterThan(5400)
  })
  it('age 22: starter bonus is paid back too', () => {
    expect(at(form({ age: '22' }), 5).zulagen).toBeGreaterThan(at(form(), 5).zulagen)
  })
})

describe('q9 half taxation and the not-drawn rule', () => {
  it('50 → 67: year 15 (age 64, 15 years) halved, years 5 and 10 not', () => {
    const e = run(form({ age: '50' }))
    expect(e.points.map(p => p.year)).toEqual([5, 10, 15, 16])
    const [p5, p10, p15] = e.points
    expect([p5!.half, p10!.half, p15!.half]).toEqual([false, false, true])
    expect(p15!.age).toBe(64)
    near(p15!.taxableGain, p15!.gain / 2)
    near(p10!.taxableGain, p10!.gain)
  })
  it('default: year 30 (age 64) halved', () => {
    const p = at(form(), 30)
    expect(p.half).toBe(true)
    expect(at(form(), 25).half).toBe(false)
  })
  it('65 → 67, 120 €, consume, year 1: Q15(b) av side = 120,00 is not < 120, so drawn', () => {
    const e = run(form({ age: '65', savingsRate: '120' }, 'consume'))
    expect(e.points.map(p => p.year)).toEqual([1])
    near(e.points[0]!.avNet, 120)
    expect(e.points[0]!.rel).not.toBeNull()
  })
})

describe('view (C.5)', () => {
  let restore: () => void
  beforeAll(() => { restore = installFakeDom() })
  afterAll(() => restore())

  it('mobile cards: 4 values, the rest in 「明细」; table + notes', async () => {
    const { cards, regionContent, wideTable, summaryLines } = await import('../src/early-exit-view')
    const e = run(form({}, 'consume'))
    const c = cards(e) as unknown as FakeEl
    const card = byTestId(c, 'ee-card-10')[0]!
    const main = all(card, x => x.attrs.class === 'ee-main')[0]!
    expect(all(main, x => x.tag === 'dt').map(x => x.textContent)).toEqual(['AV 一侧到手', '普通账户到手', '差额', '相对差异'].map(s => expect.stringContaining(s)))
    const det = byTestId(card, 'ee-details-10')[0]!
    expect(det.tag).toBe('details')
    expect(det.textContent).toContain('明细')
    expect(det.textContent).toContain('已拿到的退税')
    expect(byTestId(c, 'ee-card-rel-10')[0]!.textContent).toMatch(/[-−]?\d+,\d\d %$/)
    const tbl = wideTable(e) as unknown as FakeEl
    expect(all(tbl, x => x.tag === 'th' && x.attrs.scope === 'col')).toHaveLength(1 + e.points.length)
    const notes = regionContent(e).map(n => (n as unknown as FakeEl).attrs['data-testid'])
    expect(notes).toContain('ee-consume-refund-note')
    expect(summaryLines(e)).toHaveLength(2)
  })
  it.each([[1280, 'avDepot'], [375, 'avDepot'], [375, 'consume'], [375, 'secondaryDepot'], [1280, 'consume']] as const)('chart %i px %s: x = age, zero shared, labels inside, ≤ 3 right ticks narrow', async (width, mode) => {
    const { drawEarlyChart } = await import('../src/early-exit-view')
    const e = run(form({}, mode))
    const svg = drawEarlyChart(e, width) as unknown as FakeEl
    expect(all(svg, x => x.attrs.class === 'pt')).toHaveLength(e.points.length)
    expect(all(svg, x => x.attrs.class === 'rel-pt')).toHaveLength(e.points.filter(p => p.rel !== null).length)
    const right = all(byTestId(svg, 'chart-axis-right')[0]!, x => x.tag === 'text')
    if (width < 400)
      expect(right.length).toBeLessThanOrEqual(3)
    const est = (t: string) => [...t].reduce((n, c) => n + (/[\u3000-\uFFFF]/.test(c) ? 13 : 7), 0)
    const xl = all(svg, x => x.attrs.class === 'xl')
    expect(xl.length).toBeGreaterThan(1)
    for (const t of xl) {
      expect(Number(t.attrs.x)).toBeGreaterThanOrEqual(0)
      expect(Number(t.attrs.x) + est(t.textContent)).toBeLessThanOrEqual(width)
    }
    const ls = xl.map(t => [Number(t.attrs.x), Number(t.attrs.x) + est(t.textContent)] as const)
    for (let i = 1; i < ls.length; i++) expect(ls[i]![0]).toBeGreaterThanOrEqual(ls[i - 1]![1] + 4)
  })
  it('section: disclaimer always, region has assumptions + single notices, no jointApproxNotice', async () => {
    const { createEarlyExit } = await import('../src/early-exit-view')
    const v = createEarlyExit()
    const o = evaluate(form(), TODAY)
    v.update(form(), o.ok ? o : null)
    const s = v.section as unknown as FakeEl
    expect(byTestId(s, 'ee-disclaimer')).toHaveLength(1)
    const btn = all(s, x => x.tag === 'button')[0]!
    btn.click()
    const ids = all(s, x => !!x.attrs['data-testid']).map(x => x.attrs['data-testid'])
    for (const id of ['ee-assume-1', 'ee-assume-6', 'single-only-footnote', 'spouse-only-notice', 'ee-table', 'ee-cards'])
      expect(ids).toContain(id)
    expect(ids).not.toContain('joint-approx-notice')
  })
})
