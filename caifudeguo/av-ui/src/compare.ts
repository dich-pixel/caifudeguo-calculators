/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Based on finanzfluss/calculators (AGPL-3.0). Licensed under AGPL-3.0-only.
 *
 * Stage 3 (PLAN_stage3.md a, b, b2, b3): the same calculation for several savings amounts.
 * Every tier is one full core run (evaluate → avDepotPrecise.calculate) with the user's other inputs; only
 * savingsRate changes. No formulas besides sums/differences/quotients of core outputs named in the plan.
 */
import type { FormValues, Result, TaxSavingsMode, Verdict } from './model'
import type { StrKey } from './strings'
import { formatEuro, formatNumberDe } from './format'
import { evaluate, verdict } from './model'
import { parseAmount } from './parse'
import { t } from './strings'

/** Plan a: the 12 fixed tiers. Flips, largest difference and "多存 1 €" use only these (b3). */
export const TIERS = [120, 300, 360, 600, 1200, 1800, 2400, 3600, 6840, 8400, 10000, 13680] as const
/** b2: AV gets 1.800 €, the rest goes to the normal ETF account. */
export const SPLIT_AV = 1800
/** b2: the core's minimum savingsRate (av-depot.ts:23). */
export const MIN_RATE = 120
/** b3 rule 3: compare with a tier at least 100 € lower. */
export const MARGINAL_GAP = 100

export type Kind = Verdict['kind']
export type EvaluateFn = typeof evaluate

export interface Flip { from: number, to: number, kind: Kind }
export interface Marginal { from: number, av: number, normal: number }

export interface CmpRow {
  amount: number
  tier: boolean
  user: boolean
  result: Result
  /** Σ savingsPerYear[].contribution.avDepot − totalContributions.avDepot (plan b) */
  foerderung: number
  avNet: number
  normalNet: number
  /** D = avNet − normalNet, unrounded */
  diff: number
  /** D ÷ larger net total (display only) */
  share: number
  kind: Kind
  /** b3 rule 3; null = "—" */
  marginal: Marginal | null
  /** b2 S(a); null = "—" (see splitNote) */
  split: number | null
  splitNote: 'le1800' | 'lt120' | null
  /** b3 rule 1; only on fixed tiers */
  flip: Flip | null
}

export type MaxInfo =
  | { type: 'max', amount: number, kind: 'av' | 'same', diff: number }
  | { type: 'allNormal' }
  | { type: 'noAv' }

export interface SweepResult {
  /** fixed tiers plus the user's amount (inserted by size, or merged into an equal tier) */
  rows: CmpRow[]
  tiers: CmpRow[]
  userRow: CmpRow
  flips: Flip[]
  max: MaxInfo
  /** "超过这个数，多存的部分放普通 ETF 账户税后回报更高。" shown? (b3 rule 3) */
  marginalHigher: boolean
}

export interface SweepOptions {
  /** main result for the user's own amount (the user row reuses it, no extra core run) */
  main?: Result
  today?: Date
}

const round2 = (n: number) => Math.round(n * 100) / 100
/** Amount as the German input text the form would contain (1800 → "1.800", 1800.5 → "1.800,50"). */
export function amountText(a: number): string {
  return formatNumberDe(a, Number.isInteger(a) ? 0 : 2)
}
/** testid suffix: 1800 → "1800", 1800.5 → "1800_50" (plan e). */
export function amountId(a: number): string {
  if (Number.isInteger(a))
    return String(a)
  const cents = Math.round(a * 100)
  return `${Math.floor(cents / 100)}_${String(cents % 100).padStart(2, '0')}`
}

/** Label of the Förderung column/row, depends on where the tax saving goes (plan b, f5). */
export function foerderungKey(mode: TaxSavingsMode): StrKey {
  return mode === 'avDepot' ? 'foerAv' : mode === 'secondaryDepot' ? 'foerSecondary' : 'foerConsume'
}

export function foerderung(r: Result): number {
  return r.years.reduce((s, y) => s + y.contribution.avDepot, 0) - r.totalContributions.avDepot
}

/** Cache (plan e3): results per amount while all inputs except savingsRate stay the same. */
let cache: { key: string, results: Map<number, Result> } | null = null
function otherInputsKey(values: FormValues, today: Date): string {
  return JSON.stringify([{ ...values.fields, savingsRate: '' }, values.taxSavingsMode, values.kids, today.getFullYear()])
}
/** Tests only: forget cached results. */
export function clearSweepCache() {
  cache = null
}

function marginal(r: CmpRow, base: CmpRow | undefined): Marginal | null {
  if (!base)
    return null
  const dTc = r.result.totalContributions
  const bTc = base.result.totalContributions
  return {
    from: base.amount,
    av: (r.avNet - base.avNet) / (dTc.avDepot - bTc.avDepot),
    normal: (r.normalNet - base.normalNet) / (dTc.normalDepot - bTc.normalDepot),
  }
}

/** Nearest fixed tier at least 100 € below `amount`. */
function baseTier(tiers: CmpRow[], amount: number): CmpRow | undefined {
  let best: CmpRow | undefined
  for (const t of tiers) {
    if (t.amount <= amount - MARGINAL_GAP)
      best = t
  }
  return best
}

/**
 * One comparison round. Returns null if the user's inputs are invalid.
 * Core runs: 12 tiers + remainders 5.040/6.600/8.200/11.880 + the user's remainder (≤ 17); 0 or 1 when only
 * savingsRate changed (cache). `evaluateFn` is swapped for a spy in tests only.
 */
export function sweep(values: FormValues, evaluateFn: EvaluateFn = evaluate, opts: SweepOptions = {}): SweepResult | null {
  const today = opts.today ?? new Date()
  const userAmount = parseAmount(values.fields.savingsRate)
  if (!userAmount.ok)
    return null
  const key = otherInputsKey(values, today)
  if (!cache || cache.key !== key)
    cache = { key, results: new Map() }
  const results = cache.results
  const run = (a: number): Result | null => {
    const hit = results.get(a)
    if (hit)
      return hit
    const o = evaluateFn({ ...values, fields: { ...values.fields, savingsRate: amountText(a) } }, today)
    if (!o.ok)
      return null
    results.set(a, o.result)
    return o.result
  }
  const ua = userAmount.value
  if (opts.main)
    results.set(ua, opts.main)
  const userResult = run(ua)
  if (!userResult)
    return null

  const makeRow = (amount: number, result: Result, tier: boolean, user: boolean): CmpRow => {
    const avNet = result.payoutTotal.net.avDepot
    const normalNet = result.payoutTotal.net.normalDepot
    const v = verdict(avNet, normalNet)
    return {
      amount,
      tier,
      user,
      result,
      foerderung: foerderung(result),
      avNet,
      normalNet,
      diff: v.diff,
      share: v.diff / Math.max(Math.abs(avNet), Math.abs(normalNet)),
      kind: v.kind,
      marginal: null,
      split: null,
      splitNote: null,
      flip: null,
    }
  }

  const tiers: CmpRow[] = []
  for (const a of TIERS) {
    const r = run(a)
    if (!r)
      return null
    tiers.push(makeRow(a, r, true, a === ua))
  }
  const avAt1800 = tiers.find(t => t.amount === SPLIT_AV)!.avNet
  const fillSplit = (row: CmpRow): boolean => {
    if (row.amount <= SPLIT_AV) {
      row.splitNote = 'le1800'
      return true
    }
    const rest = round2(row.amount - SPLIT_AV)
    if (rest < MIN_RATE) {
      row.splitNote = 'lt120'
      return true
    }
    const r = run(rest)
    if (!r)
      return false
    row.split = avAt1800 + r.payoutTotal.net.normalDepot
    return true
  }

  // b3 rule 1 + 3 on fixed tiers only
  const flips: Flip[] = []
  tiers.forEach((row, i) => {
    row.marginal = marginal(row, baseTier(tiers.slice(0, i), row.amount))
    const prev = tiers[i - 1]
    if (prev && prev.kind !== row.kind) {
      row.flip = { from: prev.amount, to: row.amount, kind: row.kind }
      flips.push(row.flip)
    }
  })
  for (const row of tiers) {
    if (!fillSplit(row))
      return null
  }

  let userRow = tiers.find(t => t.amount === ua)
  const rows = [...tiers]
  if (!userRow) {
    userRow = makeRow(ua, userResult, false, true)
    userRow.marginal = marginal(userRow, baseTier(tiers, ua))
    if (!fillSplit(userRow))
      return null
    const at = rows.findIndex(r => r.amount > ua)
    rows.splice(at === -1 ? rows.length : at, 0, userRow)
  }

  // b3 rule 2
  let max: MaxInfo
  let marginalHigher = false
  if (tiers.some(t => t.kind === 'av')) {
    let k = 0
    tiers.forEach((t, i) => {
      if (t.diff > tiers[k]!.diff)
        k = i
    })
    const top = tiers[k]!
    max = { type: 'max', amount: top.amount, kind: top.kind === 'av' ? 'av' : 'same', diff: top.diff }
    const after = tiers.slice(k + 1)
    marginalHigher = after.length > 0 && after.every(t => t.marginal !== null && t.marginal.av < t.marginal.normal)
  }
  else {
    max = tiers.every(t => t.kind === 'normal') ? { type: 'allNormal' } : { type: 'noAv' }
  }
  return { rows, tiers, userRow, flips, max, marginalHigher }
}

// ---------- sentences (b3, e, f6); wording lives in strings.ts ----------

const KIND_KEY: Record<Kind, StrKey> = { av: 'kindAv', same: 'kindSame', normal: 'kindNormal' }
export function kindName(k: Kind): string {
  return t(KIND_KEY[k])
}
/** Space between a Chinese word and a following Latin word ("变成 AV 多拿"). */
function afterZh(k: Kind): string {
  const name = kindName(k)
  return /^[A-Z]/i.test(name) ? ` ${name}` : name
}

/** Table / chart marker: 「在 X–Y € 之间变成『…』」 */
export function flipText(f: Flip): string {
  return t('flipMark', { x: formatNumberDe(f.from), y: formatNumberDe(f.to), k: kindName(f.kind) })
}

/** f6: the sensitivity sentence, fixed tiers only; at most 3 flips are written. */
export function sensitivityText(s: SweepResult): string {
  if (s.flips.length === 0)
    return t('sensNone', { k: kindName(s.tiers[0]!.kind) })
  const first = s.tiers[0]!.kind
  const parts = s.flips.slice(0, 3).map((f, i) =>
    t(i === 0 ? 'sensFirst' : 'sensAgain', { x: formatNumberDe(f.from), y: formatNumberDe(f.to), k: afterZh(f.kind) }))
  return `${t('sensPrefix')}${first !== 'av' ? t('sensStart', { k: kindName(first) }) : ''}${parts.join('，')}${s.flips.length > 3 ? t('sensMore') : ''}。`
}

/** e / b3 rule 2: second summary line. */
export function maxText(s: SweepResult): string {
  const m = s.max
  if (m.type === 'allNormal')
    return t('maxAllNormal')
  if (m.type === 'noAv')
    return t('maxNoAv')
  return t(m.kind === 'av' ? 'maxAv' : 'maxSame', { a: formatNumberDe(m.amount), x: formatEuro(m.diff) })
}
