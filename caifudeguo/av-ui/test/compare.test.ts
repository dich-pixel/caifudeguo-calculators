// Stage 3 g2: compare.ts (PLAN_stage3.md a, b, b2, b3, f6). Oracle = one separate core run per amount.
import type { FormValues, Result } from '../src/model'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { avDepot } from '../../../src/calculators/av-depot'
import { formatCurrencyAdaptive } from '../../../src/utils/formatters'
import { amountId, amountText, clearSweepCache, flipText, maxText, sensitivityText, sweep, TIERS } from '../src/compare'
import { roundHalfUp } from '../src/format'
import { DEFAULTS, evaluate, verdict } from '../src/model'

const TODAY = new Date(2026, 9, 17)
function form(fields: Partial<FormValues['fields']> = {}, extra: Partial<Omit<FormValues, 'fields'>> = {}): FormValues {
  return { ...structuredClone(DEFAULTS), ...extra, fields: { ...DEFAULTS.fields, ...fields } }
}
function ref(v: FormValues, a: number): Result {
  const o = evaluate({ ...v, fields: { ...v.fields, savingsRate: amountText(a) } }, TODAY)
  if (!o.ok)
    throw new Error('invalid')
  return o.result
}
function run(v: FormValues, fn = evaluate, main?: Result) {
  const s = sweep(v, fn, { today: TODAY, main })
  if (!s)
    throw new Error('null sweep')
  return s
}
const c2 = (n: number) => roundHalfUp(n, 2)
const byAmount = (s: ReturnType<typeof run>, a: number) => s.rows.find(r => r.amount === a)!

beforeEach(() => clearSweepCache())

describe('tiers and ids', { timeout: 15000 }, () => {
  it('t3-14 TIERS', () => {
    expect([...TIERS]).toEqual([120, 300, 360, 600, 1200, 1800, 2400, 3600, 6840, 8400, 10000, 13680])
  })
  it('amount ids and texts', () => {
    expect(amountId(1800)).toBe('1800')
    expect(amountId(1800.5)).toBe('1800_50')
    expect(amountId(1800.05)).toBe('1800_05')
    expect(amountText(1800.5)).toBe('1.800,50')
    expect(amountText(13680)).toBe('13.680')
  })
})

const SCEN: [string, FormValues][] = [
  ['defaults', form()],
  ['consume', form({}, { taxSavingsMode: 'consume' })],
  ['secondary', form({}, { taxSavingsMode: 'secondaryDepot' })],
  ['kids', form({}, { kids: ['2020', '2023'] })],
  ['user 1.850', form({ savingsRate: '1.850' })],
  ['user 1.800,50, age 18', form({ savingsRate: '1.800,50', age: '18' })],
  ['user 9.000, retirement 0', form({ savingsRate: '9.000', zveRetirement: '0' })],
  ['user 125, consume, kids 2010', form({ savingsRate: '125' }, { taxSavingsMode: 'consume', kids: ['2010'] })],
]

describe('t3-15/16 every field = one separate core run', () => {
  it.each(SCEN)('%s', (_n, v) => {
    const s = run(v)
    for (const row of s.rows) {
      const r = ref(v, row.amount)
      const av = r.payoutTotal.net.avDepot
      const nd = r.payoutTotal.net.normalDepot
      expect(row.avNet).toBe(av)
      expect(row.normalNet).toBe(nd)
      expect(row.diff).toBe(av - nd)
      expect(row.kind).toBe(verdict(av, nd).kind)
      expect(row.result.monthlyNet).toEqual(r.monthlyNet)
      expect(row.foerderung).toBe(r.years.reduce((x, y) => x + y.contribution.avDepot, 0) - r.totalContributions.avDepot)
      if (row.amount > 1800 && row.amount - 1800 >= 120)
        expect(row.split).toBe(ref(v, 1800).payoutTotal.net.avDepot + ref(v, Math.round((row.amount - 1800) * 100) / 100).payoutTotal.net.normalDepot)
      else expect(row.split).toBeNull()
      if (row.marginal) {
        const b = ref(v, row.marginal.from)
        expect(row.marginal.av).toBe((av - b.payoutTotal.net.avDepot) / (r.totalContributions.avDepot - b.totalContributions.avDepot))
        expect(row.marginal.normal).toBe((nd - b.payoutTotal.net.normalDepot) / (r.totalContributions.normalDepot - b.totalContributions.normalDepot))
      }
      // formatted = public core
      const o = evaluate({ ...v, fields: { ...v.fields, savingsRate: amountText(row.amount) } }, TODAY)
      if (!o.ok)
        throw new Error('x')
      const core = avDepot.validateAndCalculate(o.coreInput)
      expect(formatCurrencyAdaptive(row.avNet)).toBe(core.payoutTotal.net.avDepot)
      expect(formatCurrencyAdaptive(row.normalNet)).toBe(core.payoutTotal.net.normalDepot)
      expect(formatCurrencyAdaptive(row.result.totalContributions.avDepot)).toBe(core.totalContributions.avDepot)
    }
  }, 15000) // CI runners took 5.0–5.5 s for 'secondary' (runs 39906750031 #1/#2)
})

describe('known values (TESTPLAN appendix A)', { timeout: 15000 }, () => {
  it('a1 defaults', () => {
    const s = run(form())
    expect(s.rows.map(r => c2(r.diff))).toEqual([1179.70, 2860.02, 3539.11, 6820.58, 13733.46, 25107.30, 23596.85, 20881.94, 10168.83, 4123.11, -2652.71, -15296.36])
    expect(s.rows.map(r => roundHalfUp(r.foerderung))).toEqual([2016, 5056, 6048, 9408, 17728, 25984, 25984, 25984, 25984, 25984, 25984, 25984])
    expect(c2(byAmount(s, 13680).avNet)).toBe(1380336.61)
  })
  it('t3-38 Förderung per mode at 1.800 €', () => {
    expect(roundHalfUp(byAmount(run(form({}, { taxSavingsMode: 'secondaryDepot' })), 1800).foerderung)).toBe(25984)
    clearSweepCache()
    expect(roundHalfUp(byAmount(run(form({}, { taxSavingsMode: 'consume' })), 1800).foerderung)).toBe(17280)
    expect(roundHalfUp(byAmount(run(form({}, { kids: ['2020', '2023'] })), 1800).foerderung)).toBe(29901)
  })
  it('t3-18/19 ±1 € only in tests; 6.840 continuous', () => {
    const v = form()
    const d = (a: number) => { const r = ref(v, a); return c2(r.payoutTotal.net.avDepot - r.payoutTotal.net.normalDepot) }
    expect([d(359), d(360), d(361)]).toEqual([3563.07, 3539.11, 3606.66])
    expect([d(1799), d(1800), d(1801)]).toEqual([25113.27, 25107.30, 25101.33])
    expect([d(6839), d(6840), d(6841)]).toEqual([10160.99, 10168.83, 10158.68])
    expect(run(v).rows.map(r => r.amount).some(a => [359, 361, 1799, 1801, 6839, 6841].includes(a))).toBe(false)
  })
  it('t3-21 13.680 €: avDepot = secondaryDepot, consume differs', () => {
    const a = ref(form(), 13680)
    const b = ref(form({}, { taxSavingsMode: 'secondaryDepot' }), 13680)
    const c = ref(form({}, { taxSavingsMode: 'consume' }), 13680)
    expect(a.payoutTotal.net.avDepot).toBe(b.payoutTotal.net.avDepot)
    expect(c2(c.payoutTotal.net.avDepot)).toBe(1348923.89)
  })
  it('t3-43 b2 values (A5)', () => {
    const tiers = [2400, 3600, 6840, 8400, 10000, 13680]
    expect(tiers.map(a => c2(byAmount(run(form()), a).split!))).toEqual([279508.39, 402019.93, 730742.60, 889352.35, 1052029.01, 1426185.34])
    clearSweepCache()
    expect(tiers.map(a => c2(byAmount(run(form({}, { taxSavingsMode: 'consume' })), a).split!))).toEqual([252526.80, 375038.34, 703761.02, 862370.77, 1025047.43, 1399203.75])
    clearSweepCache()
    expect(c2(run(form({ savingsRate: '1.920' }, { taxSavingsMode: 'consume' })).userRow.split!)).toBe(200440.59)
  })
  it('t3-45 b2 dash rules', () => {
    expect(run(form({ savingsRate: '1.850' })).userRow.splitNote).toBe('lt120')
    expect(run(form({ savingsRate: '1.919' })).userRow.splitNote).toBe('lt120')
    expect(run(form({ savingsRate: '1.800' })).userRow.splitNote).toBe('le1800')
    expect(run(form()).tiers.filter(t => t.amount <= 1800).every(t => t.split === null && t.splitNote === 'le1800')).toBe(true)
  })
})

describe('b3 rule 3: 多存 1 €', () => {
  const m = (v: FormValues, a: number) => { clearSweepCache(); const r = byAmount(run(v), a).marginal; return r && [r.from, c2(r.av), c2(r.normal)] }
  it('fixed tiers', () => {
    expect(m(form(), 120)).toBeNull()
    expect(m(form(), 300)).toEqual([120, 3.90, 3.61])
    expect(m(form(), 360)).toEqual([120, 3.89, 3.58])
    expect(m(form(), 600)).toEqual([360, 3.63, 3.20])
    expect(m(form(), 1800)).toEqual([1200, 3.78, 3.19])
    expect(m(form(), 2400)).toEqual([1800, 3.10, 3.17])
    expect(m(form({ savingsRate: '1.850' }), 2400)).toEqual([1800, 3.10, 3.17])
  }, 15000)
  it('user row', () => {
    expect(m(form({ savingsRate: '1.850' }), 1850)).toEqual([1200, 3.73, 3.18])
    // TESTPLAN T3-33 says 3,19 for normal; the core gives 3,1845… → 3,18 (3,19 is the 1.800 row)
    expect(m(form({ savingsRate: '1.799' }), 1799)).toEqual([1200, 3.78, 3.18])
    expect(m(form({ savingsRate: '225' }), 225)?.slice(0, 1)).toEqual([120])
    expect(m(form({ savingsRate: '220' }), 220)?.[0]).toBe(120)
    expect(m(form({ savingsRate: '125' }), 125)).toBeNull()
    expect(m(form({ savingsRate: '219' }), 219)).toBeNull()
    expect(m(form({ savingsRate: '1.799' }), 1800)).toEqual([1200, 3.78, 3.19])
  }, 15000) // CI runner took 5.8 s for this test (run 39955498783)
  it('t3-20 user amount equal to a tier: no extra row', () => {
    const s = run(form())
    expect(s.rows).toHaveLength(12)
    expect(s.userRow.tier && s.userRow.user).toBe(true)
    clearSweepCache()
    const s2 = run(form({ savingsRate: '1.800,50' }))
    expect(s2.rows.map(r => r.amount).slice(5, 8)).toEqual([1800, 1800.5, 2400])
    expect(s2.rows.filter(r => r.user)).toHaveLength(1)
  }, 15000)
})

const sens = (v: FormValues) => { clearSweepCache(); const s = run(v); return [sensitivityText(s), maxText(s), s.marginalHigher, s.flips.map(flipText)] as const }
// heavy core sweeps: 15 s per test (CI run 39957317788: t3-95 took 5.0 s)
describe('b3 / f6 sentences', { timeout: 15000 }, () => {
  it('defaults', () => {
    const [a, b, c, f] = sens(form())
    expect(a).toBe('按你现在的其他输入，在 6.840–8.400 € 之间变成两者基本相同，在 10.000–13.680 € 之间又变成普通账户多拿。')
    expect(b).toBe('在这些档位里，差额最大的是 1.800 €（AV 多拿约 25.107\u00A0€，税后）。')
    expect(c).toBe(true)
    expect(f).toEqual(['在 6.840–8.400 € 之间变成『两者基本相同』', '在 10.000–13.680 € 之间变成『普通账户多拿』'])
  })
  it('retirement 40.000 (4 flips)', () => {
    const [a, b, c] = sens(form({ zveRetirement: '40.000' }))
    expect(a).toBe('按你现在的其他输入，120 € 时普通账户多拿，在 360–600 € 之间变成两者基本相同，在 1.200–1.800 € 之间又变成 AV 多拿，在 2.400–3.600 € 之间又变成两者基本相同，详见下表。')
    expect(b).toBe('在这些档位里，差额最大的是 1.800 €（AV 多拿约 7.409\u00A0€，税后）。')
    expect(c).toBe(true)
  })
  it('kids 2', () => {
    const [a, b] = sens(form({}, { kids: ['2020', '2023'] }))
    expect(a).toBe('按你现在的其他输入，在 8.400–10.000 € 之间变成两者基本相同。')
    expect(b).toContain('36.283')
  })
  it('retirement 0', () => {
    const [a, b, c] = sens(form({ zveRetirement: '0' }))
    expect(a).toBe('在 120–13.680 € 之间，结论都是『AV 多拿』。')
    expect(b).toContain('71.151')
    expect(c).toBe(false)
  })
  it('30.000 + 30.000: max tier is "same"', () => {
    const [a, b, c] = sens(form({ zveSavingsPhase: '30.000', zveRetirement: '30.000' }))
    expect(a).toBe('按你现在的其他输入，在 360–600 € 之间变成两者基本相同，在 2.400–3.600 € 之间又变成普通账户多拿。')
    expect(b).toBe('在这些档位里，差额最大的是 1.800 €（两者基本相同，AV 多约 846\u00A0€，税后）。')
    expect(c).toBe(true)
  })
  it('retirement 48.000 / 60.000', () => {
    const [a, b, c] = sens(form({ zveRetirement: '48.000' }))
    expect(a).toBe('按你现在的其他输入，120 € 时普通账户多拿，在 1.200–1.800 € 之间变成两者基本相同，在 1.800–2.400 € 之间又变成普通账户多拿。')
    expect(b).toBe('在这些档位里，AV 都没有多拿（普通账户多拿或两者基本相同）。')
    expect(c).toBe(false)
    const [d, e, g] = sens(form({ zveRetirement: '60.000' }))
    expect(d).toBe('在 120–13.680 € 之间，结论都是『普通账户多拿』。')
    expect(e).toBe('在这些档位里，普通账户都多拿。')
    expect(g).toBe(false)
  })
  it('consume: max at 360', () => {
    expect(sens(form({}, { taxSavingsMode: 'consume' }))[1]).toBe('在这些档位里，差额最大的是 360 €（AV 多拿约 2.823\u00A0€，税后）。')
  })
  it('t3-95 fixed tiers do not depend on the user amount', () => {
    const base = sens(form({ savingsRate: '1.800' }))
    for (const a of ['1.799', '1.850', '9.000', '125', '13.680'])
      expect(sens(form({ savingsRate: a }))).toEqual(base)
  })
  it('t3-27 b2 does not feed conclusions', () => {
    clearSweepCache()
    const s = run(form())
    const before = [sensitivityText(s), maxText(s), s.marginalHigher]
    for (const r of s.rows) r.split = Math.random()
    expect([sensitivityText(s), maxText(s), s.marginalHigher]).toEqual(before)
  })
})

describe('t3-44/71 core calls (spy)', { timeout: 15000 }, () => {
  it('≤ 17 per round, user row from the main result', () => {
    const v = form({ age: '18', savingsRate: '12.000' }, { kids: ['2020', '2023'] })
    const main = ref(v, 12000)
    const spy = vi.fn(evaluate)
    run(v, spy, main)
    expect(spy).toHaveBeenCalledTimes(17)
  })
  it('16 when the user amount ≤ 1.920 (15 when it is a tier: the main result covers that tier)', () => {
    for (const [a, n] of [['2.400', 15], ['3.600', 15], ['1.900', 16], ['1.000', 16]] as const) {
      clearSweepCache()
      const v = form({ savingsRate: a })
      const spy = vi.fn(evaluate)
      run(v, spy, ref(v, Number(a.replace('.', ''))))
      expect(spy).toHaveBeenCalledTimes(n)
    }
  })
  it('only savingsRate changed: 0 or 1', () => {
    const v = form({ savingsRate: '5.000' })
    run(v, evaluate, ref(v, 5000))
    const count = (a: string, amount: number) => {
      const w = form({ savingsRate: a })
      const spy = vi.fn(evaluate)
      run(w, spy, ref(w, amount))
      return spy.mock.calls.length
    }
    expect(count('3.200', 3200)).toBe(1)
    expect(count('2.400', 2400)).toBe(0)
    expect(count('3.600', 3600)).toBe(0)
    expect(count('1.900', 1900)).toBe(0)
    expect(count('1.000', 1000)).toBe(0)
  })
  it('user row equals the main result', () => {
    const v = form({ savingsRate: '9.000' })
    const main = ref(v, 9000)
    expect(run(v, evaluate, main).userRow.result).toBe(main)
  })
  it('invalid input → null, no core run', () => {
    const spy = vi.fn(evaluate)
    expect(sweep(form({ savingsRate: 'abc' }), spy, { today: TODAY })).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('t3-68 round time (Node 22.14.0 gate)', () => {
  it('17 core runs ≤ 650 ms on average over 5 rounds', { timeout: 600000 }, () => {
    const v = form({ age: '18', savingsRate: '12.000' }, { kids: ['2020', '2023'] })
    sweep(v, evaluate, { today: TODAY })
    let total = 0
    for (let i = 0; i < 5; i++) {
      clearSweepCache()
      const main = ref(v, 12000)
      const t0 = performance.now()
      sweep(v, evaluate, { today: TODAY, main })
      total += performance.now() - t0
    }
    const avg = total / 5
    console.warn(`t3-68: sweep average ${avg.toFixed(1)} ms over 5 rounds (17 core runs)`)
    // Plan e/h: the 650 ms gate is measured on the box (Node 22.14.0). GitHub runners are slower; CI only records it.
    const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
    if (!env.CI)
      expect(avg).toBeLessThanOrEqual(650)
  })
})

describe('g3: Förderung row in the main result', { timeout: 15000 }, () => {
  it('t3-39 label follows the tax-saving mode', async () => {
    const { foerderungKey } = await import('../src/compare')
    const { t } = await import('../src/strings')
    expect(t(foerderungKey('avDepot'))).toBe('国家补贴*')
    expect(t(foerderungKey('secondaryDepot'))).toBe('国家补贴*')
    expect(t(foerderungKey('consume'))).toBe('国家补贴*')
    expect(t('foerBonus')).toBe('开始存钱那年年初未满 25 岁的话，已含一次性 200 € 新手奖励（Erhöhung der Grundzulage，§84 S. 2 EStG n.F.）。')
    expect(t('foerKids')).toBe('假设孩子的补贴记在你名下。')
    expect(t('chartCap')).toBe('一份合同每年的上限')
  })
  it('t3-40 main-result value = the user row of the table, no extra core run', async () => {
    const { foerderung } = await import('../src/compare')
    const v = form({ savingsRate: '9.000' })
    const main = ref(v, 9000)
    expect(foerderung(main)).toBe(run(v, evaluate, main).userRow.foerderung)
  })
  it('t3-41 200 € bonus: 24/66 vs 25/67', async () => {
    const { foerderung } = await import('../src/compare')
    const f = (age: string, ret: string, mode: 'avDepot' | 'consume') => roundHalfUp(foerderung(ref(form({ age, retirementAge: ret }, { taxSavingsMode: mode }), 1800)))
    expect([f('24', '66', 'consume'), f('25', '67', 'consume')]).toEqual([22880, 22680])
    expect([f('24', '66', 'avDepot'), f('25', '67', 'avDepot')]).toEqual([34304, 34104])
  })
})

describe('g6: chunked rounds (pendingAmounts + prefetch)', { timeout: 15000 }, async () => {
  const { pendingAmounts, prefetch } = await import('../src/compare')
  it('one prefetch per pending amount, then sweep needs 0 core runs', () => {
    const v = form({ age: '18', savingsRate: '12.000' }, { kids: ['2020', '2023'] })
    const main = ref(v, 12000)
    const queue = pendingAmounts(v, { main, today: TODAY })
    expect(queue).toHaveLength(17)
    expect(queue).not.toContain(12000)
    const spy = vi.fn(evaluate)
    for (const a of queue) prefetch(v, a, spy, TODAY)
    expect(spy).toHaveBeenCalledTimes(17)
    const spy2 = vi.fn(evaluate)
    const chunked = run(v, spy2, main)
    expect(spy2).not.toHaveBeenCalled()
    clearSweepCache()
    expect(chunked.rows.map(r => r.diff)).toEqual(run(v, evaluate, main).rows.map(r => r.diff))
  })
  it('only savingsRate changed: 0 or 1 pending', () => {
    const v = form({ savingsRate: '5.000' })
    run(v, evaluate, ref(v, 5000))
    const w = form({ savingsRate: '3.200' })
    expect(pendingAmounts(w, { main: ref(w, 3200), today: TODAY })).toEqual([1400])
    const x = form({ savingsRate: '2.400' })
    expect(pendingAmounts(x, { main: ref(x, 2400), today: TODAY })).toEqual([])
  })
  it('another input changed: cache is dropped', () => {
    run(form(), evaluate, ref(form(), 1800))
    const v = form({ age: '40' })
    expect(pendingAmounts(v, { main: ref(v, 1800), today: TODAY }).length).toBe(15) // 11 tiers + 5.040/6.600/8.200/11.880
  })
})

// Stage 5 B.2 / Q14: rel = D ÷ max_y capitalEnd.avDepot × 100 (secondary account included); reference = scratch/b.json "Bincl"
describe('stage 5 relative difference', { timeout: 15000 }, () => {
  it.each([
    ['avDepot', 1800, 10.985623402669923],
    ['avDepot', 13680, -1.2054294792595226],
    ['secondaryDepot', 1800, 12.872505724227857],
    ['consume', 1800, -0.9154122057864972],
    ['consume', 120, 5.975576591019951],
  ] as const)('%s %i: %f %', async (mode, amount, want) => {
    const { relOf } = await import('../src/compare')
    clearSweepCache()
    const s = sweep(form({}, { taxSavingsMode: mode }), undefined, { today: TODAY })!
    const r = s.rows.find(x => x.amount === amount)!
    expect(Math.abs(r.rel! - want)).toBeLessThan(0.01)
    const peak = Math.max(...r.result.years.map(y => y.capitalEnd.avDepot))
    expect(r.relBase).toBe(peak)
    expect(relOf(r.diff, r.result, amount)).toEqual({ rel: (r.diff / peak) * 100, relBase: peak })
  })
  it('not drawn only when the base is below the yearly amount (strict)', async () => {
    const { relOf } = await import('../src/compare')
    const res = (b: number) => ({ years: [{ capitalEnd: { avDepot: b } }] }) as unknown as Result
    expect(relOf(10, res(119.99), 120).rel).toBeNull()
    expect(relOf(12, res(120), 120).rel).toBe(10)
    const { relText } = await import('../src/cmp3')
    expect(relText(null)).toBe('—')
    expect(relText(-1.2054)).toBe('-1,21 %'.replace('-', relText(-1).startsWith('−') ? '−' : '-'))
    expect(relText(12.87)).toBe('12,87 %')
  })
})
