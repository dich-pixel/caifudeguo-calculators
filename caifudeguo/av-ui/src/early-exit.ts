/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Based on finanzfluss/calculators (AGPL-3.0). Licensed under AGPL-3.0-only.
 *
 * Stage 5 C (PLAN_stage5.md C.1–C.4): what if the AV contract is cashed out early (schädliche Verwendung)?
 * Layer on top of the unchanged core: every year's subsidy, tax saving and depot path come from the core's own
 * functions (generated/av-depot-exposed.ts = precise copy + one export line) and from the core result.
 * The only own steps are sums/differences and the clawback rule of plan C.2/C.3:
 *   withdrawal at the end of savings year N, tax at the WORKING-phase zvE (zveSavingsPhase),
 *   all Zulagen and the whole tax saving are paid back, the gain is taxed (half from age 62 with ≥ 12 years, Q9).
 */
import type { FormValues, Result, TaxSavingsMode } from './model'
import { avDepot } from '../../../src/calculators/av-depot'
import { AV_CONTRIBUTION_CAP, AV_SUBSIDIZED_CAP, TEILFREISTELLUNG } from '../../../src/constants/av-depot'
import { calculateDepotSavings, calculateZulagen, germanIncomeTax, grenzsteuer, günstigerprüfung } from './generated/av-depot-exposed'
import { evaluate } from './model'

/** Plan C.4: points every 5 years. */
export const STEP_YEARS = 5
/** Q9: half taxation of the gain from this age … */
export const HALF_AGE = 62
/** … when the contract ran at least this many years. */
export const HALF_YEARS = 12

export interface ExitPoint {
  /** savings year N (withdrawal at its end) */
  year: number
  /** age at the END of year N = at withdrawal (core row.age is the start-of-year age, + 1) */
  age: number
  calendarYear: number
  /** B_N: AV contract balance (core capitalEnd.avDepot minus the separate account) */
  avBalance: number
  /** R_Z: Σ Zulagen incl. starter bonus, paid back */
  zulagen: number
  /** R_S: Σ tax savings, paid back */
  taxSaving: number
  /** Σ own contributions to the AV contract (savingsRate + reinvested tax saving) */
  ownToAv: number
  /** G before halving */
  gain: number
  /** Q9 applied */
  half: boolean
  /** taxed part of the gain (gain × 0,5 when half) */
  taxableGain: number
  /** T_AV */
  avTax: number
  /** separate account (Nebendepot) balance, its tax, contributions */
  secBalance: number
  secTax: number
  secContrib: number
  /** consume mode only (Q15 b): tax savings already received and spent; 0 otherwise */
  received: number
  /** AV side, after tax, incl. separate account and (consume) received refunds */
  avNet: number
  /** normal ETF account */
  normalBalance: number
  normalVorab: number
  normalTaxable: number
  normalTax: number
  normalNet: number
  diff: number
  /** diff ÷ avNet × 100; null when avNet < savingsRate (Q6, strict) */
  rel: number | null
}

export interface EarlyExit {
  mode: TaxSavingsMode
  savingsRate: number
  savingYears: number
  points: ExitPoint[]
}

/** Plan C.4: every multiple of 5 years plus the year before retirement, no duplicates; none for 1 savings year. */
export function exitYears(savingYears: number): number[] {
  const out: number[] = []
  for (let n = STEP_YEARS; n < savingYears; n += STEP_YEARS)
    out.push(n)
  const last = savingYears - 1
  if (last >= 1 && !out.includes(last))
    out.push(last)
  return out
}

type CoreInput = ReturnType<typeof avDepot.schema.parse>

/** All points for the core input of a successful evaluate() (result = the same run). */
export function earlyExit(input: CoreInput, result: Result): EarlyExit {
  const { savingsRate: c, zveSavingsPhase: zve, taxSavingsMode: mode, age, retirementAge, currentYear, childBirthYears, etfReturnRate, baseRate, exemptionOrder } = input
  const savingYears = retirementAge - age
  // per-year amounts, exactly as calculateAvDepotSavings computes them (av-depot.ts:351-378)
  const zul: number[] = []
  const save: number[] = []
  const reinv: number[] = []
  const secContribs: number[] = []
  for (let y = 1; y <= savingYears; y++) {
    const z = calculateZulagen(c, y, currentYear, age, childBirthYears)
    const d = Math.min(c, AV_SUBSIDIZED_CAP) + z.grundzulage + z.kinderzulage
    const s = Math.max(0, germanIncomeTax(zve) - germanIncomeTax(Math.max(0, zve - d)) - z.grundzulage - z.kinderzulage)
    const r = mode === 'avDepot' ? Math.min(s, AV_CONTRIBUTION_CAP - c) : 0
    zul.push(z.grundzulage + z.kinderzulage + z.starterBonus)
    save.push(s)
    reinv.push(r)
    secContribs.push(mode === 'consume' ? 0 : s - r)
  }
  const sec = secContribs.some(x => x > 0)
    ? calculateDepotSavings(secContribs, etfReturnRate, baseRate, exemptionOrder, zve).yearlyData
    : null
  const sum = (a: number[], n: number) => a.slice(0, n).reduce((x, y) => x + y, 0)

  const points = exitYears(savingYears).map((n): ExitPoint => {
    const row = result.years[n - 1]!
    const secBalance = sec ? sec[n - 1]!.capitalEnd : 0
    const secContrib = sum(secContribs, n)
    const secVorab = sec ? sec.slice(0, n).reduce((x, y) => x + y.vorabpauschale, 0) : 0
    const secTax = günstigerprüfung(Math.max(0, Math.max(0, secBalance - secContrib - secVorab) * TEILFREISTELLUNG - exemptionOrder), zve)
    const avBalance = row.capitalEnd.avDepot - secBalance
    const zulagen = sum(zul, n)
    const taxSaving = sum(save, n)
    const ownToAv = n * c + sum(reinv, n)
    const gain = Math.max(0, avBalance - zulagen - ownToAv)
    const ageEnd = row.age + 1
    const half = ageEnd >= HALF_AGE && n >= HALF_YEARS
    const taxableGain = half ? gain * 0.5 : gain
    const avTax = grenzsteuer(taxableGain, zve)
    const received = mode === 'consume' ? taxSaving : 0
    const avNet = avBalance - zulagen - taxSaving - avTax + secBalance - secTax + received

    const normalBalance = row.capitalEnd.normalDepot
    const normalVorab = result.years.slice(0, n).reduce((x, y) => x + y.vorabpauschale.normalDepot, 0)
    const normalTaxable = Math.max(0, Math.max(0, normalBalance - n * c - normalVorab) * TEILFREISTELLUNG - exemptionOrder)
    const normalTax = günstigerprüfung(normalTaxable, zve)
    const normalNet = normalBalance - normalTax
    const diff = avNet - normalNet
    return {
      year: n,
      age: ageEnd,
      calendarYear: row.calendarYear,
      avBalance,
      zulagen,
      taxSaving,
      ownToAv,
      gain,
      half,
      taxableGain,
      avTax,
      secBalance,
      secTax,
      secContrib,
      received,
      avNet,
      normalBalance,
      normalVorab,
      normalTaxable,
      normalTax,
      normalNet,
      diff,
      rel: avNet < c ? null : (diff / avNet) * 100,
    }
  })
  return { mode, savingsRate: c, savingYears, points }
}

/** Convenience for the UI and tests: form values → points (null when the form has errors). */
export function earlyExitFor(values: FormValues, today: Date = new Date()): EarlyExit | null {
  const o = evaluate(values, today)
  if (!o.ok)
    return null
  return earlyExit(avDepot.schema.parse(o.coreInput), o.result)
}
