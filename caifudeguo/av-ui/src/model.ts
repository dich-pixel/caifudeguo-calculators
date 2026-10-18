/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Based on finanzfluss/calculators (AGPL-3.0). Licensed under AGPL-3.0-only.
 *
 * Glue between the form and the core (src/calculators/av-depot.ts @ dcc29a6, unchanged; numbers via the generated precise copy).
 * No calculation rules live here: validation = core zod schema, numbers = core output.
 */
import type { ParseError } from './parse'
import type { StrKey } from './strings'
import { avDepot } from '../../../src/calculators/av-depot'
import { AV_CONTRIBUTION_CAP, BERUFSEINSTEIGER_BONUS } from '../../../src/constants/av-depot'
import { formatCurrencyAdaptive, parseCurrency } from '../../../src/utils/formatters'
import { formatNumberDe } from './format'
import { avDepotPrecise } from './generated/av-depot-precise'
import { startYear } from './params'
import { parseAmount, parseInteger, parsePercent } from './parse'

export type FieldKind = 'amount' | 'percent' | 'int'
export type TaxSavingsMode = 'avDepot' | 'secondaryDepot' | 'consume'

export const FIELDS = {
  age: 'int',
  retirementAge: 'int',
  savingsRate: 'amount',
  zveSavingsPhase: 'amount',
  zveRetirement: 'amount',
  etfReturnRate: 'percent',
  avDepotCosts: 'percent',
  exemptionOrder: 'amount',
  baseRate: 'percent',
  oneTimePayout: 'percent',
  payoutReturnRate: 'percent',
  payoutUntilAge: 'int',
} as const satisfies Record<string, FieldKind>

export type FieldName = keyof typeof FIELDS

export interface FormValues {
  fields: Record<FieldName, string>
  taxSavingsMode: TaxSavingsMode
  kids: string[]
}

/** Finanzfluss web defaults read 2026-10-14 (plan §2). */
export const DEFAULTS: FormValues = {
  fields: {
    age: '35',
    retirementAge: '67',
    savingsRate: '1.800',
    zveSavingsPhase: '50.000',
    zveRetirement: '20.000',
    etfReturnRate: '6,0',
    avDepotCosts: '0,2',
    exemptionOrder: '1.000',
    baseRate: '0,00',
    oneTimePayout: '0',
    payoutReturnRate: '3,0',
    payoutUntilAge: '85',
  },
  taxSavingsMode: 'avDepot',
  kids: [],
}

/** Plan §8.1: hint above one contract's cap (AV_CONTRIBUTION_CAP = 2 × 6.840 €, src/constants/av-depot.ts:5). */
export const ONE_CONTRACT_CAP = AV_CONTRIBUTION_CAP / 2
export const QUICK_AMOUNTS = [120, 1800, AV_CONTRIBUTION_CAP] as const

export interface FieldError {
  key: StrKey
  vars?: Record<string, string>
}

const PARSE_ERR: Record<ParseError, StrKey> = {
  empty: 'errEmpty',
  amount: 'errAmount',
  percent: 'errPercent',
  int: 'errInt',
}

export interface Money { avDepot: number, normalDepot: number }
export interface PayoutMoney { gross: Money, tax: Money, net: Money }
export interface YearRow {
  year: number
  calendarYear: number
  age: number
  contribution: Money
  grossReturn: Money
  vorabpauschale: Money
  vorabpauschaleTax: Money
  capitalEnd: Money
}
export interface Result {
  totalContributions: Money
  finalCapital: Money
  firstPayoutYear: PayoutMoney
  regularPayoutYear: PayoutMoney
  payoutTotal: PayoutMoney
  /** regularPayoutYear.net / 12 (see MONTHLY_FROM_ROUNDED_ANNUAL) */
  monthlyNet: Money
  years: YearRow[]
  bonusApplied: boolean
}

export type Outcome =
  | { ok: true, result: Result, coreInput: Record<string, unknown> }
  | { ok: false, errors: Record<string, FieldError> }

/**
 * Monthly net payout (plan §3 / tester D1, user decision 2026-10-17: round only once, at display).
 * false (default): unrounded annual net ÷ 12 → defaults show 872 € (normal) / 989 € (AV).
 * true: core-rounded annual net (whole euros) ÷ 12, like the Finanzfluss web page → 873 € / 989 €.
 */
export const MONTHLY_FROM_ROUNDED_ANNUAL = false

function money(p: { avDepot: number, normalDepot: number }): Money {
  return { avDepot: p.avDepot, normalDepot: p.normalDepot }
}
function roundedLikeCore(v: number): number {
  return parseCurrency(formatCurrencyAdaptive(v))
}
function payout(p: { gross: Money, tax: Money, net: Money }): PayoutMoney {
  return { gross: money(p.gross), tax: money(p.tax), net: money(p.net) }
}

function fmtBound(field: string, n: number): string {
  const kind: FieldKind | undefined = (FIELDS as Record<string, FieldKind>)[field]
  if (kind === 'amount')
    return `${formatNumberDe(n)} €`
  if (kind === 'percent')
    return `${formatNumberDe(n, n % 1 === 0 ? 0 : 2)} %`
  return String(n)
}

/** Field key used by the form for a core zod issue path, e.g. ['childBirthYears', 1] → 'kid-1'. */
function pathKey(path: PropertyKey[]): string {
  if (path[0] === 'childBirthYears' && typeof path[1] === 'number')
    return `kid-${path[1]}`
  return String(path[0] ?? 'form')
}

export function evaluate(values: FormValues, today: Date = new Date()): Outcome {
  const errors: Record<string, FieldError> = {}
  const raw: Record<string, unknown> = {}
  for (const [name, kind] of Object.entries(FIELDS) as [FieldName, FieldKind][]) {
    const text = values.fields[name]
    const r = kind === 'amount' ? parseAmount(text) : kind === 'percent' ? parsePercent(text) : parseInteger(text)
    if (r.ok)
      raw[name] = r.value
    else errors[name] = { key: PARSE_ERR[r.error] }
  }
  const thisYear = today.getFullYear()
  const kids: number[] = []
  values.kids.forEach((text, i) => {
    const r = parseInteger(text)
    if (!r.ok)
      errors[`kid-${i}`] = { key: PARSE_ERR[r.error] }
    else if (r.value > thisYear)
      errors[`kid-${i}`] = { key: 'errFuture', vars: { year: String(thisYear) } }
    kids.push(r.ok ? r.value : Number.NaN)
  })
  raw.taxSavingsMode = values.taxSavingsMode
  raw.childBirthYears = kids
  raw.currentYear = startYear(today)

  // Run the core schema even when some fields failed to parse, so that range errors show for all fields at once.
  const probe = { ...raw }
  for (const name of Object.keys(FIELDS)) {
    if (!(name in probe))
      probe[name] = Number.NaN
  }
  const parsed = avDepot.schema.safeParse(probe)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = pathKey(issue.path)
      if (errors[key])
        continue
      if (key === 'form' || Number.isNaN(probe[key as FieldName]))
        continue // NaN from a parse error is already reported
      errors[key] = issueToError(key, issue)
    }
  }
  if (Object.keys(errors).length > 0 || !parsed.success)
    return { ok: false, errors: Object.keys(errors).length ? errors : { form: { key: 'errInvalid' } } }

  // Same schema and formulas as the core; numbers unrounded (see scripts/precise-core.mjs).
  const out = avDepotPrecise.calculate(parsed.data)
  const age = parsed.data.age
  const start = parsed.data.currentYear
  const regular = payout(out.regularPayoutYear)
  return {
    ok: true,
    coreInput: raw,
    result: {
      totalContributions: money(out.totalContributions),
      finalCapital: money(out.finalCapital),
      firstPayoutYear: payout(out.firstPayoutYear),
      regularPayoutYear: regular,
      payoutTotal: payout(out.payoutTotal),
      monthlyNet: MONTHLY_FROM_ROUNDED_ANNUAL
        ? { avDepot: roundedLikeCore(regular.net.avDepot) / 12, normalDepot: roundedLikeCore(regular.net.normalDepot) / 12 }
        : { avDepot: regular.net.avDepot / 12, normalDepot: regular.net.normalDepot / 12 },
      years: out.savingsPerYear.map(y => ({
        year: y.year,
        calendarYear: start + y.year - 1,
        age: age + y.year - 1,
        contribution: money(y.contribution),
        grossReturn: money(y.grossReturn),
        vorabpauschale: money(y.vorabpauschale),
        vorabpauschaleTax: money(y.vorabpauschaleTax),
        capitalEnd: money(y.capitalEnd),
      })),
      // Mirrors the core condition `savingsYear === 1 && age < 25` (src/calculators/av-depot.ts:591-592) for the note only.
      bonusApplied: age < 25 && BERUFSEINSTEIGER_BONUS > 0,
    },
  }
}

interface Issue { code: string, message: string, minimum?: unknown, maximum?: unknown, inclusive?: boolean, path: PropertyKey[] }

function issueToError(key: string, issue: Issue): FieldError {
  if (issue.code === 'too_small')
    return { key: issue.inclusive === false ? 'errGt' : 'errMin', vars: { min: fmtBound(key, Number(issue.minimum)) } }
  if (issue.code === 'too_big')
    return { key: 'errMax', vars: { max: fmtBound(key, Number(issue.maximum)) } }
  if (issue.code === 'custom') {
    if (issue.message.startsWith('age must'))
      return { key: 'errAgeRetire' }
    if (issue.message.startsWith('retirementAge must'))
      return { key: 'errRetirePayout' }
    if (issue.message.includes('etfReturnRate'))
      return { key: 'errCostsEtf' }
    if (issue.message.includes('payoutReturnRate'))
      return { key: 'errCostsPayout' }
  }
  if (issue.code === 'invalid_type')
    return { key: 'errInt' }
  return { key: 'errInvalid' }
}

export interface Verdict { kind: 'same' | 'av' | 'normal', diff: number }

/**
 * Plan §3: D = AV net total − normal net total (unrounded core values).
 * |D| < 1 % of the larger total (strictly) → "same"; exactly 1 % counts as different.
 */
export function verdict(avNet: number, normalNet: number): Verdict {
  const diff = avNet - normalNet
  const larger = Math.max(Math.abs(avNet), Math.abs(normalNet))
  if (Math.abs(diff) < 0.01 * larger)
    return { kind: 'same', diff }
  return { kind: diff > 0 ? 'av' : 'normal', diff }
}

/** Cross-field errors and the two fields they concern (core refinements, av-depot.ts:63-78). */
const CROSS_FIELD: Partial<Record<StrKey, [string, string]>> = {
  errAgeRetire: ['age', 'retirementAge'],
  errRetirePayout: ['retirementAge', 'payoutUntilAge'],
  errCostsEtf: ['avDepotCosts', 'etfReturnRate'],
  errCostsPayout: ['avDepotCosts', 'payoutReturnRate'],
}

/**
 * UI placement only: a cross-field error is shown once, on whichever of its two fields the user changed last
 * (default: the field the core reports it on). Precedence: a range or format error on either field of the pair
 * (e.g. age 70 → 不能大于 67。) is shown alone; the cross-field error is dropped (zod still reports both).
 */
export function placeCrossField(errors: Record<string, FieldError>, lastChanged: string): Record<string, FieldError> {
  const out = { ...errors }
  for (const [key, e] of Object.entries(errors)) {
    const pair = CROSS_FIELD[e.key]
    // Precedence: a range/format error on either field of the pair suppresses the cross-field error.
    if (pair && pair.some(f => f !== key && errors[f] && !CROSS_FIELD[errors[f]!.key])) {
      delete out[key]
      continue
    }
    if (pair && pair.includes(lastChanged) && key !== lastChanged && !out[lastChanged]) {
      delete out[key]
      out[lastChanged] = e
    }
  }
  // Wording follows the field it is shown on.
  if (out.retirementAge?.key === 'errAgeRetire')
    out.retirementAge = { key: 'errRetireAge' }
  return out
}

/** data-testid of the node that shows this error string. `{n}` is the child index. */
export function errorDomTestIds(key: StrKey): string[] | undefined {
  const ids = (names: string[]) => names.map(name => `error-${name}`)
  const amount = Object.entries(FIELDS).filter(([, kind]) => kind === 'amount').map(([name]) => name)
  const percent = Object.entries(FIELDS).filter(([, kind]) => kind === 'percent').map(([name]) => name)
  const ints = Object.entries(FIELDS).filter(([, kind]) => kind === 'int').map(([name]) => name)
  const every = [...Object.keys(FIELDS), 'kid-{n}']
  switch (key) {
    case 'errEmpty':
    case 'errMin':
    case 'errMax':
    case 'errGt':
      return ids(every)
    case 'errAmount':
      return ids(amount)
    case 'errPercent':
      return ids(percent)
    case 'errInt':
      return ids([...ints, 'kid-{n}'])
    case 'errAgeRetire':
      return ['error-age', 'error-retirementAge']
    case 'errRetireAge':
      return ['error-retirementAge']
    case 'errRetirePayout':
      return ['error-retirementAge', 'error-payoutUntilAge']
    case 'errCostsEtf':
      return ['error-avDepotCosts', 'error-etfReturnRate']
    case 'errCostsPayout':
      return ['error-avDepotCosts', 'error-payoutReturnRate']
    case 'errFuture':
      return ['error-kid-{n}']
    case 'errInvalid':
      return ['error-form']
    default:
      return undefined
  }
}
