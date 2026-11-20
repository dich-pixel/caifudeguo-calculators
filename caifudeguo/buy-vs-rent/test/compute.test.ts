import { describe, expect, it } from 'vitest'
import { compute, scenarioMatrix } from '../src/engine/compute'
import { quantile, runMonteCarlo } from '../src/engine/montecarlo'

function almost(a: number, b: number, eps = 1e-6) {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(eps)
}

describe('initial derived quantities (hand-computed from PRD 5.2, default inputs)', () => {
  it('matches the closed-form purchase, loan and payment figures', () => {
    const result = compute({})
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    const nk = 0.065 + 0.02 + 0.0357
    const cost = 400_000 * (1 + nk) + 20_000
    const L0 = cost - 400_000
    const other = 500_000 - 400_000
    const A0 = L0 * (0.035 + 0.0185) / 12
    const maint0 = 400_000 * 0.012 / 12
    almost(result.derived.nk, nk)
    almost(result.derived.cost, cost)
    almost(cost, 468_280)
    almost(result.derived.L0, L0)
    almost(L0, 68_280)
    almost(result.derived.other, other)
    almost(result.derived.A0, A0)
    almost(A0, 304.415)
    almost(result.derived.maint0, maint0)
    almost(maint0, 400)
    almost(result.derived.grest_amt, 400_000 * 0.065)
    almost(result.derived.notary_amt, 400_000 * 0.02)
    almost(result.derived.broker_amt, 400_000 * 0.0357)
    almost(result.derived.rent_factor, 400_000 / (1850 * 12))
    almost(result.start.buyer_etf, other)
    almost(result.start.renter_etf, 400_000 + other)
    almost(result.start.balance, L0)
    almost(result.start.house, 400_000)
  })
})

describe('model invariants and formulas', () => {
  it('keeps house value on the closed-form path price*(1+g)^(k/12)', () => {
    const result = compute({ horizon_years: 5, house_growth: 0.02 })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    for (const row of result.yearly)
      almost(row.house, 400_000 * (1.02) ** row.year, 1e-7)
    const dec = result.monthly.filter(m => m.miy === 12)
    for (const m of dec)
      almost(m.house, 400_000 * (1.02) ** (m.month / 12), 1e-7)
  })

  it('keeps remaining loan + cumulative principal equal to the original loan', () => {
    const result = compute({ horizon_years: 15 })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    for (const row of result.yearly)
      almost(row.balance + row.cum_principal, result.derived.L0, 1e-6)
  })

  it('deflates nominal values by (1+inflation)^y', () => {
    const result = compute({ horizon_years: 10, inflation: 0.02 })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    for (const row of result.yearly) {
      const f = (1.02) ** row.year
      almost(row.buyer_liq_real, row.buyer_liq / f, 1e-7)
      almost(row.diff_liq_real, row.diff_liq / f, 1e-7)
    }
  })

  it('leaves a 0 loan, pays no interest, and puts the surplus into the buyer ETF (I-NO-LOAN)', () => {
    const result = compute({ down_payment: 480_000, wealth: 500_000 })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    expect(result.infos.some(i => i.id === 'I-NO-LOAN')).toBe(true)
    almost(result.derived.L0, 0)
    almost(result.derived.surplus, 11_720)
    almost(result.start.buyer_etf, 11_720 + 20_000)
    almost(result.end.balance, 0)
    almost(result.end.cum_interest, 0)
    expect(result.payoff_month).toBe(0)
  })

  it('uses a user-entered Grunderwerbsteuer rate instead of the NW 6.5 % default', () => {
    const nw = compute({})
    const by = compute({ grest_pct: 0.035 })
    expect(nw.ok && by.ok).toBe(true)
    if (!nw.ok || !by.ok)
      return
    almost(nw.derived.grest_pct, 0.065)
    almost(by.derived.grest_pct, 0.035)
    almost(by.derived.cost, 400_000 * (1 + 0.035 + 0.02 + 0.0357) + 20_000)
    expect(by.derived.L0).toBeLessThan(nw.derived.L0)
  })

  it('pays no loan interest when the rate is 0 and amortises by Tilgung only', () => {
    const result = compute({
      loan_rate: 0,
      init_tilgung: 0.02,
      down_payment: 100_000,
      wealth: 200_000,
      horizon_years: 2,
    })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    expect(result.monthly.every(m => m.interest === 0)).toBe(true)
    const A = result.derived.A0
    almost(A, result.derived.L0 * 0.02 / 12)
    const first = result.monthly[0]!
    almost(first.principal, Math.min(A, result.derived.L0))
  })

  it('keeps a zero balance after the loan is paid off and invests the leftover cash', () => {
    const result = compute({
      down_payment: 100_000,
      wealth: 200_000,
      loan_rate: 0.01,
      init_tilgung: 0.2,
      fix_years: null,
      horizon_years: 8,
      cash_monthly: 5000,
    })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    expect(result.payoff_month).not.toBeNull()
    expect(result.payoff_month!).toBeGreaterThan(0)
    const after = result.monthly.filter(m => m.month > result.payoff_month!)
    expect(after.length).toBeGreaterThan(0)
    expect(after.every(m => m.bal_end === 0 && m.interest === 0 && m.principal === 0)).toBe(true)
    expect(after.every(m => m.buyer_cost === m.maint + m.other_cost)).toBe(true)
  })

  it('applies Sondertilgung only in month 12 of each model year, capped by the remaining balance', () => {
    const result = compute({
      down_payment: 100_000,
      wealth: 200_000,
      sondertilgung_pct: 0.05,
      horizon_years: 3,
    })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    for (const m of result.monthly) {
      if (m.miy !== 12)
        expect(m.sonder).toBe(0)
      else
        expect(m.sonder).toBeGreaterThan(0)
    }
    const firstSonder = result.monthly.find(m => m.month === 12)!
    almost(firstSonder.sonder, Math.min(0.05 * result.derived.L0, firstSonder.bal_start - firstSonder.principal))
  })

  it('recomputes the annuity under new_tilgung at the first month after the fixed period', () => {
    const result = compute({
      down_payment: 120_000,
      wealth: 200_000,
      loan_rate: 0.05,
      init_tilgung: 0.02,
      fix_years: 10,
      follow_rate: 0.035,
      follow_mode: 'new_tilgung',
      follow_tilgung: 0.03,
      horizon_years: 12,
      cash_monthly: 3000,
    })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    const k = 12 * 10 + 1
    const month = result.monthly.find(m => m.month === k)!
    const expectedA = month.bal_start * (0.035 + 0.03) / 12
    almost(month.interest + month.principal, expectedA, 1e-6)
    expect(month.rate).toBe(0.035)
  })

  it('raises W-REFI and lifts the payment to rate+1% Tilgung when the old annuity no longer covers interest', () => {
    const result = compute({
      down_payment: 120_000,
      wealth: 200_000,
      loan_rate: 0.01,
      init_tilgung: 0.02,
      fix_years: 10,
      follow_rate: 0.05,
      follow_mode: 'keep_payment',
      horizon_years: 12,
      cash_monthly: 3000,
    })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    expect(result.warnings.some(w => w.id === 'W-REFI')).toBe(true)
    const k = 121
    const month = result.monthly.find(m => m.month === k)!
    const lifted = month.bal_start * (0.05 + 0.01) / 12
    almost(month.interest + month.principal, lifted, 1e-6)
  })

  it('computes §23 tax as max(0, sale−cost)*personal_tax_rate when not exempt and year < 10', () => {
    const result = compute({
      self_use_exempt: false,
      horizon_years: 5,
      sell_cost_pct: 0.0357,
      personal_tax_rate: 0.42,
    })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    for (const row of result.yearly) {
      const sale = row.house * (1 - 0.0357)
      const expected = Math.max(0, sale - result.derived.cost) * 0.42
      almost(row.spec_tax, expected, 1e-6)
      almost(row.sell_cost, row.house * 0.0357, 1e-6)
    }
  })

  it('does not compute when validation failed', () => {
    const result = compute({ horizon_years: 0 })
    expect(result.ok).toBe(false)
    if (result.ok)
      return
    expect(result.errors.some(e => e.id === 'E-HORIZON')).toBe(true)
  })

  it('applies I-CASH when month-1 housing costs exceed cash on either side', () => {
    const result = compute({
      cash_monthly: 100,
      down_payment: 200_000,
      wealth: 300_000,
      rent: 200,
    })
    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    expect(result.infos.filter(i => i.id === 'I-CASH').length).toBeGreaterThanOrEqual(1)
  })
})

describe('scenario matrix (CALC-40)', () => {
  it('returns 9 cells, house first then ETF, with the middle cell equal to the base run', () => {
    const inputs = { horizon_years: 5 as const, house_err: 2, etf_err: 4 }
    const result = compute(inputs)
    const matrix = scenarioMatrix(inputs)
    expect(result.ok).toBe(true)
    expect(Array.isArray(matrix)).toBe(true)
    if (!result.ok || !Array.isArray(matrix))
      return
    expect(matrix).toHaveLength(9)
    const g = 0.02
    const r = 0.052
    const gs = [g - 0.02, g, g + 0.02]
    const rs = [r - 0.04, r, r + 0.04]
    let i = 0
    for (const hg of gs) {
      for (const er of rs) {
        almost(matrix[i]!.house_growth, hg, 1e-12)
        almost(matrix[i]!.etf_return, er, 1e-12)
        i++
      }
    }
    almost(matrix[4]!.buyer_liq, result.end.buyer_liq, 1e-8)
    almost(matrix[4]!.renter_liq, result.end.renter_liq, 1e-8)
    almost(matrix[4]!.diff_liq, result.end.diff_liq, 1e-8)
    almost(matrix[4]!.diff_nonliq, result.end.diff_nonliq, 1e-8)
  })
})

describe('hyndman–Fan type 7 quantile and Monte Carlo σ = 0', () => {
  it('interpolates a known sample', () => {
    const x = [10, 20, 30, 40]
    almost(quantile(x, 0), 10)
    almost(quantile(x, 1), 40)
    almost(quantile(x, 0.5), 25)
    // h = 3 * 0.25 = 0.75 → 10 + 0.75*(20-10) = 17.5
    almost(quantile(x, 0.25), 17.5)
  })

  it('reproduces the deterministic result when both volatilities are 0 (CALC-54)', () => {
    const inputs = { horizon_years: 4, mc_runs: 100, mc_sigma: 0, mc_sigma_house: 0, mc_seed: 42 }
    const det = compute(inputs)
    const mc = runMonteCarlo(inputs)
    expect(det.ok).toBe(true)
    expect('ok' in mc ? mc.ok : true).toBe(true)
    if (!det.ok || 'ok' in mc)
      return
    expect(mc.runs).toBe(100)
    for (const run of mc.first_runs) {
      almost(run.buyer_liq, det.end.buyer_liq, 1e-8)
      almost(run.renter_liq, det.end.renter_liq, 1e-8)
      almost(run.diff_liq, det.end.diff_liq, 1e-8)
      almost(run.diff_nonliq, det.end.diff_nonliq, 1e-8)
    }
    almost(mc.buyer_liq.p50, det.end.buyer_liq, 1e-8)
    almost(mc.diff_liq.mean, det.end.diff_liq, 1e-8)
    expect(mc.p_buyer_liq_ge === 0 || mc.p_buyer_liq_ge === 1).toBe(true)
  })
})

describe('config overrides', () => {
  it('lets the admin Basiszins flow into Vorabpauschale', () => {
    const withZins = compute({ horizon_years: 1 }, { basiszins: 0.032 })
    const zeroZins = compute({ horizon_years: 1 }, { basiszins: 0 })
    expect(withZins.ok && zeroZins.ok).toBe(true)
    if (!withZins.ok || !zeroZins.ok)
      return
    expect(withZins.yearly[0]!.vp_buyer).toBeGreaterThan(0)
    almost(zeroZins.yearly[0]!.vp_buyer, 0)
    expect(zeroZins.end.taxes_paid_buyer).toBeLessThan(withZins.end.taxes_paid_buyer)
  })
})
