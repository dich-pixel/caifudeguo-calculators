import { describe, expect, it } from 'vitest'
import { EtfAccount } from '../src/engine/account'
import { compute } from '../src/engine/compute'
import {
  churchTaxCombinedRate,
  DEFAULT_GREST_PCT,
  DEFAULT_INPUTS,
  KIRCHEN_RATE_DEFAULT,
  SPARERPAUSCHBETRAG,
  SPARERPAUSCHBETRAG_SINGLE,
  TAX_RATE,
} from '../src/engine/constants'
import { runMonteCarlo } from '../src/engine/montecarlo'
import { computeNk, mergeConfig, mergeInputs, validate } from '../src/engine/validate'

describe('q-01: single Grunderwerbsteuer rate (default NW 6.5 %)', () => {
  it('defaults grest_pct to the Appendix A NW rate and includes it in detailed Nebenkosten', () => {
    expect(DEFAULT_INPUTS.grest_pct).toBe(DEFAULT_GREST_PCT)
    expect(DEFAULT_GREST_PCT).toBe(0.065)
    const { nk, grest_pct } = computeNk(DEFAULT_INPUTS)
    expect(grest_pct).toBe(0.065)
    expect(nk).toBeCloseTo(0.065 + 0.02 + 0.0357, 12)
  })

  it('lets the user overwrite the rate, e.g. with the Bayern 3.5 % rate', () => {
    const { nk, grest_pct } = computeNk(mergeInputs({ grest_pct: 0.035 }))
    expect(grest_pct).toBe(0.035)
    expect(nk).toBeCloseTo(0.035 + 0.02 + 0.0357, 12)
    const result = compute({ grest_pct: 0.035 })
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.derived.grest_amt).toBeCloseTo(400_000 * 0.035, 8)
  })

  it('does not accept a rate outside 0–20 %', () => {
    const cfg = mergeConfig()
    expect(validate(mergeInputs({ grest_pct: 0.21 }), cfg).errors.some(e => e.field === 'grest_pct')).toBe(true)
  })
})

describe('q-02: default monthly cash stays 2.500 €', () => {
  it('keeps cash_monthly at 2500', () => {
    expect(DEFAULT_INPUTS.cash_monthly).toBe(2500)
  })
})

describe('q-03: Sparerpauschbetrag / Kirchensteuer switch (default off)', () => {
  it('stays off by default, with allowance 0 and rate 26.375 %', () => {
    expect(DEFAULT_INPUTS.use_sparer_kirchen).toBe(false)
    expect(DEFAULT_INPUTS.kirchen_rate).toBe(KIRCHEN_RATE_DEFAULT)
    expect(KIRCHEN_RATE_DEFAULT).toBe(0.09)
    expect(SPARERPAUSCHBETRAG).toBe(0)
    expect(TAX_RATE).toBe(0.26375)
    expect(churchTaxCombinedRate(0)).toBe(0.26375)
  })

  it('uses the PRD combined-rate formula for 8 % and 9 % church tax', () => {
    const r8 = churchTaxCombinedRate(0.08)
    const r9 = churchTaxCombinedRate(0.09)
    expect(r8).toBeCloseTo(0.25 / 1.02 * 1.135, 15)
    expect(r9).toBeCloseTo(0.25 / 1.0225 * 1.145, 15)
    expect(r8).toBeGreaterThan(TAX_RATE)
    expect(r9).toBeGreaterThan(r8)
  })

  it('applies a 1.000 € allowance and resets it at year-end when the switch is on', () => {
    const rate = churchTaxCombinedRate(0.09)
    const acct = new EtfAccount({
      taxRate: rate,
      teilfreistellung: 0.3,
      sparerpauschbetrag: SPARERPAUSCHBETRAG_SINGLE,
      borrowMonthlyFactor: 1,
    })
    expect(acct.allow_rem).toBe(1000)
    // A 2000 € after-Teilfreistellung gain uses up the allowance and taxes the rest.
    const taxable = acct.taxable(2000)
    expect(taxable).toBe(1000)
    expect(acct.allow_rem).toBe(0)
    acct.yearEnd(12, 0.032)
    expect(acct.allow_rem).toBe(1000)
  })

  it('lowers tax paid on a simple withdrawal when the switch is on', () => {
    const off = compute({ horizon_years: 5, use_sparer_kirchen: false })
    const on9 = compute({ horizon_years: 5, use_sparer_kirchen: true, kirchen_rate: 0.09 })
    const on8 = compute({ horizon_years: 5, use_sparer_kirchen: true, kirchen_rate: 0.08 })
    expect(off.ok && on9.ok && on8.ok).toBe(true)
    if (!off.ok || !on9.ok || !on8.ok)
      return
    // Default case has leftover ETF and Vorabpauschale; the 1.000 € allowance reduces tax paid.
    expect(on9.end.taxes_paid_buyer + on9.end.taxes_paid_renter)
      .toBeLessThan(off.end.taxes_paid_buyer + off.end.taxes_paid_renter)
    // 8 % church tax is a slightly lower combined rate than 9 %.
    expect(on8.end.taxes_paid_buyer + on8.end.taxes_paid_renter)
      .toBeLessThanOrEqual(on9.end.taxes_paid_buyer + on9.end.taxes_paid_renter)
  })

  it('rejects a Kirchensteuer rate other than 8 % or 9 % when the switch is on', () => {
    const { errors } = validate(mergeInputs({ use_sparer_kirchen: true, kirchen_rate: 0.07 }), mergeConfig())
    expect(errors.some(e => e.field === 'kirchen_rate')).toBe(true)
  })
})

describe('q-04: house price does not fluctuate in Monte Carlo (σ_Haus fixed at 0)', () => {
  it('defaults mc_sigma_house to 0', () => {
    expect(DEFAULT_INPUTS.mc_sigma_house).toBe(0)
  })

  it('matches the deterministic result when ETF σ is also 0 (CALC-54)', () => {
    const inputs = mergeInputs({ horizon_years: 4, mc_runs: 100, mc_sigma: 0, mc_sigma_house: 0, mc_seed: 42 })
    const det = compute(inputs)
    const mc = runMonteCarlo(inputs, mergeConfig())
    expect(det.ok).toBe(true)
    expect('ok' in mc ? mc.ok : true).toBe(true)
    if (!det.ok || 'ok' in mc)
      return
    for (const row of mc.first_runs) {
      expect(row.diff_liq).toBeCloseTo(det.end.diff_liq, 8)
      expect(row.buyer_liq).toBeCloseTo(det.end.buyer_liq, 8)
    }
  })
})
