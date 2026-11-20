import { describe, expect, it } from 'vitest'
import { EtfAccount } from '../src/engine/account'
import { DEFAULT_BASISZINS, TAX_RATE, TEILFREISTELLUNG } from '../src/engine/constants'

const cfg = {
  taxRate: TAX_RATE,
  teilfreistellung: TEILFREISTELLUNG,
  sparerpauschbetrag: 0,
  borrowMonthlyFactor: (1.06) ** (1 / 12),
}

function almost(a: number, b: number, eps = 1e-9) {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(eps)
}

describe('tax rate (PRD K-01 / CALC rate(k))', () => {
  it('equals 0.26375 when church tax is 0', () => {
    const rate = 0.25 / (1 + 0.25 * 0) * (1 + 0.055 + 0)
    expect(TAX_RATE).toBe(rate)
    expect(TAX_RATE).toBe(0.26375)
  })
})

describe('eTF account: Vorabpauschale and withdrawals (hand-computed)', () => {
  it('credits a full-year January deposit after 5.2 % growth', () => {
    const acct = new EtfAccount(cfg)
    const start = 100_000
    acct.deposit(start, 1)
    const annual = 0.052
    const f = (1 + annual) ** (1 / 12)
    for (let i = 0; i < 12; i++)
      acct.grow(f)

    const S = (1 + annual)
    const V_before = start * S
    almost(acct.S, S)
    almost(acct.V, V_before)
    almost(acct.B, start)

    const perUnit = Math.max(0, Math.min(1 * DEFAULT_BASISZINS * 0.7, S - 1))
    almost(perUnit, 0.0224)
    const unitsEff = start * (13 - 1) / 12
    const vp = perUnit * unitsEff
    almost(vp, 2240)

    const tax = TAX_RATE * (vp * (1 - TEILFREISTELLUNG))
    almost(tax, 0.26375 * 1568)
    almost(tax, 413.56)

    const reported = acct.yearEnd(12, DEFAULT_BASISZINS)
    almost(reported, vp)

    // After adding VP to the basis, a withdrawal of `tax` (net) sells slightly more than `tax`.
    const B_after_vp = start + vp
    const gf = (V_before - B_after_vp) / V_before
    const gfz = gf * (1 - TEILFREISTELLUNG)
    const s = tax / (1 - TAX_RATE * gfz)
    const saleTax = TAX_RATE * (s * gf * (1 - TEILFREISTELLUNG))
    const net = s - saleTax
    almost(net, tax, 1e-9)

    almost(acct.V, V_before - s, 1e-6)
    almost(acct.B, B_after_vp * (1 - s / V_before), 1e-6)
    almost(acct.taxes_paid, tax + saleTax, 1e-9)
    almost(acct.latentTax(), TAX_RATE * Math.max(0, (acct.V - acct.B) * (1 - TEILFREISTELLUNG)), 1e-9)
  })

  it('prorates Vorabpauschale for a mid-year (miy = 7) deposit at 6/12', () => {
    const acct = new EtfAccount(cfg)
    const start = 100_000
    acct.deposit(start, 7)
    const annual = 0.052
    const f = (1 + annual) ** (1 / 12)
    for (let i = 0; i < 12; i++)
      acct.grow(f)

    const S = 1 + annual
    const perUnit = Math.min(1 * DEFAULT_BASISZINS * 0.7, S - 1)
    const unitsEff = start * (13 - 7) / 12
    almost(unitsEff, start * 0.5)
    const vp = perUnit * unitsEff
    almost(vp, 0.0224 * 50_000)
    almost(vp, 1120)

    const reported = acct.yearEnd(12, DEFAULT_BASISZINS)
    almost(reported, vp)
  })

  it('sells shares so that the net withdrawal equals the requested cash', () => {
    const acct = new EtfAccount(cfg)
    acct.deposit(100_000, 1)
    const f = (1.052) ** (1 / 12)
    for (let i = 0; i < 12; i++)
      acct.grow(f)
    acct.yearEnd(12, DEFAULT_BASISZINS)

    const want = 50_000
    const V0 = acct.V
    const B0 = acct.B
    const taxes0 = acct.taxes_paid
    const gf = (V0 - B0) / V0
    const gfz = gf * (1 - TEILFREISTELLUNG)
    const s = want / (1 - TAX_RATE * gfz)
    const saleTax = TAX_RATE * (s * gfz)
    almost(s - saleTax, want, 1e-8)

    acct.withdraw(want, 13)
    almost(acct.V, V0 - s, 1e-6)
    almost(acct.B, B0 * (1 - s / V0), 1e-6)
    almost(acct.taxes_paid, taxes0 + saleTax, 1e-8)
    expect(acct.debt).toBe(0)
  })

  it('records debt on an empty account and compounds it monthly at the borrow rate', () => {
    const acct = new EtfAccount(cfg)
    acct.withdraw(1000, 1)
    almost(acct.debt, 1000)
    expect(acct.first_debt_month).toBe(1)
    expect(acct.V).toBe(0)
    acct.grow(1.01) // equity factor is irrelevant while only debt exists
    const expected = 1000 * (1.06) ** (1 / 12)
    almost(acct.debt, expected, 1e-10)
  })

  it('repays debt before buying new shares', () => {
    const acct = new EtfAccount(cfg)
    acct.withdraw(500, 1)
    almost(acct.debt, 500)
    acct.deposit(200, 2)
    almost(acct.debt, 300)
    expect(acct.u).toBe(0)
    acct.deposit(400, 3)
    almost(acct.debt, 0)
    almost(acct.V, 100)
  })

  it('returns zero latent tax on an empty or loss-making book', () => {
    const empty = new EtfAccount(cfg)
    expect(empty.latentTax()).toBe(0)
    const loss = new EtfAccount(cfg)
    loss.deposit(1000, 1)
    loss.grow(0.9)
    expect(loss.V).toBeLessThan(loss.B)
    expect(loss.latentTax()).toBe(0)
  })
})
