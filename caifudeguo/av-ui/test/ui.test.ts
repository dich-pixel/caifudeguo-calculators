import type { FormValues } from '../src/model'
import { describe, expect, it } from 'vitest'
import { avDepot } from '../../../src/calculators/av-depot'
import { parseCurrency } from '../../../src/utils/formatters'
import { formatEuro, formatEuro2, formatNumberDe, formatPercentDe, roundHalfUp } from '../src/format'
import { DEFAULTS, evaluate, ONE_CONTRACT_CAP, verdict } from '../src/model'
import { PARAMS_CHECK_DATE, startYear } from '../src/params'
import { parseAmount, parseInteger, parsePercent } from '../src/parse'
import { t } from '../src/strings'

const TODAY = new Date(2026, 9, 17)

function form(fields: Partial<FormValues['fields']> = {}, extra: Partial<Omit<FormValues, 'fields'>> = {}): FormValues {
  return { ...structuredClone(DEFAULTS), ...extra, fields: { ...DEFAULTS.fields, ...fields } }
}

function ok(v: FormValues, today = TODAY) {
  const o = evaluate(v, today)
  if (!o.ok)
    throw new Error(`unexpected errors: ${JSON.stringify(o.errors)}`)
  return o
}

function errs(v: FormValues, today = TODAY) {
  const o = evaluate(v, today)
  expect(o.ok).toBe(false)
  return o.ok ? {} : o.errors
}

describe('parseAmount (plan §8.4, T2-49)', () => {
  it.each([
    ['50.000', 50000],
    ['1.800', 1800],
    ['13.680', 13680],
    ['1.800,50', 1800.5],
    ['1800', 1800],
    ['120', 120],
    ['1.000.000', 1000000],
    [' 1.800 € ', 1800],
    ['0,5', 0.5],
    ['-5', -5],
  ])('%s → %d', (raw, value) => {
    expect(parseAmount(raw)).toEqual({ ok: true, value })
  })
  it.each(['6.5', '6.50', '1.80', '50.0000', 'abc', '1,800.50', '1.8000', '.800', '1.800.5', '12.34.567'])('%s → error', (raw) => {
    expect(parseAmount(raw)).toEqual({ ok: false, error: 'amount' })
  })
  it('empty → error', () => {
    expect(parseAmount('  ')).toEqual({ ok: false, error: 'empty' })
  })
})

describe('parsePercent', () => {
  it.each([['6,5', 6.5], ['6.5', 6.5], ['6', 6], ['0,01', 0.01], ['3,0 %', 3]])('%s → %d', (raw, value) => {
    expect(parsePercent(raw)).toEqual({ ok: true, value })
  })
  it.each(['abc', '6,5,1', '1.000,5'])('%s → error', (raw) => {
    expect(parsePercent(raw).ok).toBe(false)
  })
})

describe('parseInteger', () => {
  it('accepts digits only', () => {
    expect(parseInteger('35')).toEqual({ ok: true, value: 35 })
    expect(parseInteger('35,5')).toEqual({ ok: false, error: 'int' })
    expect(parseInteger('')).toEqual({ ok: false, error: 'empty' })
  })
})

describe('rounding and German format (T2-22, T2-24, T2-55)', () => {
  it('rounds .5 up', () => {
    expect(roundHalfUp(872.5)).toBe(873)
    expect(roundHalfUp(872.49)).toBe(872)
    expect(roundHalfUp(1.005, 2)).toBe(1.01)
    expect(roundHalfUp(2.675, 2)).toBe(2.68)
    expect(roundHalfUp(-2.5)).toBe(-3)
    expect(roundHalfUp(-0.4)).toBe(0)
  })
  it('formats', () => {
    expect(formatEuro(228547)).toBe('228.547\u00A0€')
    expect(formatEuro(872.5)).toBe('873\u00A0€')
    expect(formatEuro(-1234.5)).toBe('-1.235\u00A0€')
    expect(formatEuro2(1800)).toBe('1.800,00\u00A0€')
    expect(formatEuro2(151.5)).toBe('151,50\u00A0€')
    expect(formatNumberDe(1800)).toBe('1.800')
    expect(formatNumberDe(13680)).toBe('13.680')
    expect(formatPercentDe(6)).toBe('6,0\u00A0%')
  })
})

describe('verdict threshold (plan §3, T2-20, T2-21)', () => {
  it('exactly 1 % is "different", 1 € below is "same", 1 € above is "different"', () => {
    expect(verdict(100000, 99000)).toEqual({ kind: 'av', diff: 1000 })
    expect(verdict(100000, 99001).kind).toBe('same')
    expect(verdict(100000, 98999).kind).toBe('av')
    expect(verdict(99000, 100000).kind).toBe('normal')
    expect(verdict(99001, 100000).kind).toBe('same')
    expect(verdict(98999, 100000).kind).toBe('normal')
  })
  it('uses unrounded values', () => {
    // 999,60 € < 1 %; rounding the smaller total to 99.000 would make it exactly 1 %.
    expect(verdict(100000, 99000.4).kind).toBe('same')
    expect(verdict(100000, roundHalfUp(99000.4)).kind).toBe('av')
  })
  it('equal totals', () => {
    expect(verdict(5, 5).kind).toBe('same')
  })
})

describe('start year (T2-05)', () => {
  it('max(2027, current year)', () => {
    expect(startYear(new Date(2026, 5, 1))).toBe(2027)
    expect(startYear(new Date(2028, 0, 1))).toBe(2028)
    expect(ok(form(), new Date(2028, 0, 1)).coreInput.currentYear).toBe(2028)
  })
})

describe('defaults (T2-02, T2-03, T2-07)', () => {
  it('reproduces the Finanzfluss reference numbers', () => {
    const { result: r } = ok(form())
    expect(r.finalCapital.avDepot).toBe(228547)
    expect(formatEuro(r.monthlyNet.avDepot)).toBe('989\u00A0€')
    expect(formatEuro(r.monthlyNet.normalDepot)).toBe('873\u00A0€')
    expect(r.payoutTotal.net).toEqual({ avDepot: 213564, normalDepot: 188456 })
    const v = verdict(r.payoutTotal.net.avDepot, r.payoutTotal.net.normalDepot)
    expect(v.kind).toBe('av')
    expect(t('verdictAv', { x: formatEuro(v.diff) })).toBe('按你的假设，AV-Depot 税后共多拿约 25.108\u00A0€。')
    expect(r.years).toHaveLength(32)
    expect(r.bonusApplied).toBe(false)
  })
  it('default core input', () => {
    expect(ok(form()).coreInput).toEqual({
      age: 35,
      retirementAge: 67,
      savingsRate: 1800,
      zveSavingsPhase: 50000,
      zveRetirement: 20000,
      etfReturnRate: 6,
      avDepotCosts: 0.2,
      exemptionOrder: 1000,
      taxSavingsMode: 'avDepot',
      baseRate: 0,
      oneTimePayout: 0,
      payoutReturnRate: 3,
      payoutUntilAge: 85,
      childBirthYears: [],
      currentYear: 2027,
    })
  })
})

// ---- golden matrix: UI numbers must equal the core output for the same input (T2-04, T2-14) ----
function expectMatchesCore(v: FormValues) {
  const { result, coreInput } = ok(v)
  const core = avDepot.validateAndCalculate(coreInput)
  const pair = (p: { avDepot: string, normalDepot: string }) => ({ avDepot: parseCurrency(p.avDepot), normalDepot: parseCurrency(p.normalDepot) })
  const po = (p: typeof core.payoutTotal) => ({ gross: pair(p.gross), tax: pair(p.tax), net: pair(p.net) })
  expect(result.finalCapital).toEqual(pair(core.finalCapital))
  expect(result.totalContributions).toEqual(pair(core.totalContributions))
  expect(result.firstPayoutYear).toEqual(po(core.firstPayoutYear))
  expect(result.regularPayoutYear).toEqual(po(core.regularPayoutYear))
  expect(result.payoutTotal).toEqual(po(core.payoutTotal))
  expect(result.years.map(y => y.capitalEnd)).toEqual(core.savingsPerYear.map(y => pair(y.capitalEnd)))
  expect(result.years.map(y => y.contribution)).toEqual(core.savingsPerYear.map(y => pair(y.contribution)))
  expect(result.years.map(y => y.vorabpauschaleTax)).toEqual(core.savingsPerYear.map(y => pair(y.vorabpauschaleTax)))
  return result
}

const MATRIX: [string, FormValues][] = [
  ['defaults', form()],
  ['secondaryDepot', form({}, { taxSavingsMode: 'secondaryDepot' })],
  ['consume', form({}, { taxSavingsMode: 'consume' })],
  ['kids, avDepot', form({}, { kids: ['2020', '2026'] })],
  ['kids, secondaryDepot, base rate 2,29', form({ baseRate: '2,29' }, { taxSavingsMode: 'secondaryDepot', kids: ['2015'] })],
  ['one-time 30 %, consume', form({ oneTimePayout: '30' }, { taxSavingsMode: 'consume' })],
  ['retire 65, payout to 120', form({ retirementAge: '65', payoutUntilAge: '120' })],
  ['retire 70, base rate 3,5, one-time 30', form({ retirementAge: '70', baseRate: '3,5', oneTimePayout: '30' })],
  ['age 24 bonus, 13.680', form({ age: '24', savingsRate: '13.680' })],
  ['high income, 6.840, secondary', form({ zveSavingsPhase: '120.000', zveRetirement: '60.000', savingsRate: '6.840' }, { taxSavingsMode: 'secondaryDepot' })],
  ['120 € minimum, zvE 0', form({ savingsRate: '120', zveSavingsPhase: '0', zveRetirement: '0' })],
  ['no Sparerpauschbetrag, base 2', form({ exemptionOrder: '0', baseRate: '2' }, { taxSavingsMode: 'consume', kids: ['2010', '2012', '2024'] })],
  ['age 18, retire 67, payout 100, return 8', form({ age: '18', etfReturnRate: '8', avDepotCosts: '1,5', payoutUntilAge: '100' })],
]

describe('golden matrix vs core dcc29a6', () => {
  it.each(MATRIX)('%s', (_name, v) => {
    expectMatchesCore(v)
  })
})

describe('input ranges from the core zod schema (T2-09, T2-12, T2-13, T2-51)', () => {
  it('savingsRate 120–13.680', () => {
    expect(errs(form({ savingsRate: '119' })).savingsRate?.key).toBe('errMin')
    expect(errs(form({ savingsRate: '13.681' })).savingsRate?.key).toBe('errMax')
    for (const s of ['120', '121', '359', '360', '361', '1.799', '1.800', '1.801', '6.839', '6.840', '6.841', '13.679', '13.680'])
      expectMatchesCore(form({ savingsRate: s }))
  })
  it('subsidy only on the first 1.800 €', () => {
    const y1 = (s: string) => ok(form({ savingsRate: s, zveSavingsPhase: '0' }, { taxSavingsMode: 'consume' })).result.years[0]!.contribution.avDepot
    const sub = (s: string) => y1(s) - (parseAmount(s) as { value: number }).value
    expect(sub('1.801')).toBe(sub('1.800'))
    expect(sub('1.900')).toBe(sub('1.800'))
    // core output ≥ 1.000 € is whole euros, so compare 100 € apart: 25 % of 100 € = 25 €
    expect(sub('1.800') - sub('1.700')).toBe(25)
  })
  it('retirementAge 65–70, oneTimePayout 0–30, payoutUntilAge 85–120', () => {
    expect(errs(form({ retirementAge: '64' })).retirementAge).toBeDefined()
    expect(errs(form({ retirementAge: '71' })).retirementAge).toBeDefined()
    ok(form({ retirementAge: '65' }))
    ok(form({ retirementAge: '70' }))
    expect(errs(form({ oneTimePayout: '-1' })).oneTimePayout).toBeDefined()
    expect(errs(form({ oneTimePayout: '31' })).oneTimePayout).toBeDefined()
    ok(form({ oneTimePayout: '0' }))
    ok(form({ oneTimePayout: '30' }))
    expect(errs(form({ payoutUntilAge: '84' })).payoutUntilAge).toBeDefined()
    expect(errs(form({ payoutUntilAge: '121' })).payoutUntilAge).toBeDefined()
    ok(form({ payoutUntilAge: '85' }))
    ok(form({ payoutUntilAge: '120' }))
  })
  it('age 18–67 and age < retirementAge', () => {
    expect(errs(form({ age: '17' })).age?.key).toBe('errMin')
    ok(form({ age: '18' }))
    expect(errs(form({ age: '67' })).retirementAge?.key).toBe('errAgeRetire')
    ok(form({ age: '67', retirementAge: '68' }))
    expect(errs(form({ age: '68' })).age?.key).toBe('errMax')
  })
  it('return > 0, costs < return, base rate 0–100', () => {
    expect(errs(form({ etfReturnRate: '0' })).etfReturnRate?.key).toBe('errGt')
    ok(form({ etfReturnRate: '0,01', avDepotCosts: '0' }))
    expect(errs(form({ avDepotCosts: '6' })).avDepotCosts?.key).toBe('errCostsEtf')
    expect(errs(form({ avDepotCosts: '3' })).avDepotCosts?.key).toBe('errCostsPayout')
    ok(form({ baseRate: '0' }))
    ok(form({ baseRate: '100' }))
    expect(errs(form({ baseRate: '100,01' })).baseRate?.key).toBe('errMax')
    expect(errs(form({ baseRate: '-0,1' })).baseRate?.key).toBe('errMin')
  })
  it('exemption 0–1.000', () => {
    expect(errs(form({ exemptionOrder: '1.001' })).exemptionOrder?.key).toBe('errMax')
    ok(form({ exemptionOrder: '0' }))
  })
  it('invalid text, negatives, empty (T2-15)', () => {
    const e = errs(form({ zveSavingsPhase: 'abc', zveRetirement: '-1', savingsRate: '', etfReturnRate: '6.5', age: '35,5' }))
    expect(e.zveSavingsPhase?.key).toBe('errAmount')
    expect(e.zveRetirement?.key).toBe('errMin')
    expect(e.savingsRate?.key).toBe('errEmpty')
    expect(e.etfReturnRate).toBeUndefined()
    expect(e.age?.key).toBe('errInt')
    expect(ok(form({ etfReturnRate: '6.5' })).coreInput.etfReturnRate).toBe(6.5)
    expect(ok(form({ etfReturnRate: '6,5' })).coreInput.etfReturnRate).toBe(6.5)
  })
  it('error messages show German-formatted bounds', () => {
    const e = errs(form({ savingsRate: '13.681' })).savingsRate!
    expect(t(e.key, e.vars)).toBe('不能大于 13.680 €。')
  })
})

describe('children (T2-16, T2-17, T2-52)', () => {
  it('rejects future and too early years', () => {
    expect(errs(form({}, { kids: ['2027'] }))['kid-0']?.key).toBe('errFuture')
    expect(errs(form({}, { kids: ['1899'] }))['kid-0']?.key).toBe('errMin')
    expect(errs(form({}, { kids: ['2010', 'abc'] }))['kid-1']?.key).toBe('errInt')
  })
  it('kinderzulage counted while child age < 18 (av-depot.ts:594-599)', () => {
    // start 2027; child born 2010 is 17 in 2027 → counted in year 1, not in year 2 (18).
    const base = ok(form({ zveSavingsPhase: '0' }, { taxSavingsMode: 'consume' })).result.years
    const kid = ok(form({ zveSavingsPhase: '0' }, { taxSavingsMode: 'consume', kids: ['2010'] })).result.years
    expect(kid[0]!.contribution.avDepot - base[0]!.contribution.avDepot).toBe(300)
    expect(kid[1]!.contribution.avDepot - base[1]!.contribution.avDepot).toBe(0)
    expectMatchesCore(form({}, { kids: ['2010'] }))
    expectMatchesCore(form({}, { kids: ['2009'] }))
  })
})

describe('berufseinsteigerbonus (T2-18, av-depot.ts:591-592)', () => {
  it('age 24 gets 200 € and note, age 25 not', () => {
    const r24 = ok(form({ age: '24', zveSavingsPhase: '0' }, { taxSavingsMode: 'consume' })).result
    const r25 = ok(form({ age: '25', zveSavingsPhase: '0' }, { taxSavingsMode: 'consume' })).result
    expect(r24.bonusApplied).toBe(true)
    expect(r25.bonusApplied).toBe(false)
    expect(r24.years[0]!.contribution.avDepot - r24.years[1]!.contribution.avDepot).toBe(200)
    expect(r25.years[0]!.contribution.avDepot - r25.years[1]!.contribution.avDepot).toBe(0)
  })
})

describe('misc', () => {
  it('two-contract hint threshold is 6.840 € (T2-50)', () => {
    expect(ONE_CONTRACT_CAP).toBe(6840)
  })
  it('params date notice (T2-54)', () => {
    expect(t('noticeParams', { date: PARAMS_CHECK_DATE, sha: 'dcc29a6' })).toBe('参数核对日期：2026-10-16（核心 commit dcc29a6）')
  })
  it('notice-kids-18 exact text', () => {
    expect(t('noticeKids')).toBe('只要还在为孩子领 Kindergeld（一般最长到 25 岁，§32 Abs. 4 EStG），子女补贴就一直有。本计算器只算到 18 岁，所以结果偏保守。')
  })
})
