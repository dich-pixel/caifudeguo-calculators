import type {
  EngineConfig,
  Inputs,
  Issue,
  MonteCarloResult,
  MonteCarloStats,
  YearlyPercentiles,
} from './types'
import {
  mergeConfig,
  mergeInputs,
  resolveInputs,
  runModel,
  validate,
} from './compute'
import { Pcg32 } from './prng'

/** Hyndman–Fan type 7: sorted x[0..n-1], h = (n-1)*q, lo = floor(h). */
export function quantile(sorted: ArrayLike<number>, q: number): number {
  const n = sorted.length
  if (n === 0) return Number.NaN
  const h = (n - 1) * q
  const lo = Math.floor(h)
  const hi = Math.min(lo + 1, n - 1)
  const a = sorted[lo] ?? Number.NaN
  const b = sorted[hi] ?? a
  return a + (h - lo) * (b - a)
}

export function statsOf(values: number[]): MonteCarloStats {
  const sorted = values.slice().sort((a, b) => a - b)
  const sum = values.reduce((s, v) => s + v, 0)
  return {
    p5: quantile(sorted, 0.05),
    p10: quantile(sorted, 0.1),
    p25: quantile(sorted, 0.25),
    p50: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
    p95: quantile(sorted, 0.95),
    mean: values.length ? sum / values.length : Number.NaN,
  }
}

export function runMonteCarlo(
  partial: Partial<Inputs> | Inputs,
  configPartial?: Partial<EngineConfig>,
  onProgress?: (done: number, total: number) => void,
): MonteCarloResult | { ok: false; errors: Issue[] } {
  const config = mergeConfig(configPartial)
  const raw = mergeInputs(partial)
  const { errors } = validate(raw, config)
  if (errors.length) return { ok: false, errors }
  const resolved = resolveInputs(raw, config)
  const n = resolved.mc_runs
  const M = 12 * resolved.horizon_years
  const rng = new Pcg32(resolved.mc_seed, config.prng_initseq)
  const sigma = resolved.mc_sigma
  const sigmaH = resolved.mc_sigma_house
  const r = resolved.etf_return
  const g = resolved.house_growth
  const mu = Math.log(1 + r) / 12 - (sigma * sigma) / 24
  const sd = sigma / Math.sqrt(12)
  const muH = Math.log(1 + g) / 12 - (sigmaH * sigmaH) / 24
  const sdH = sigmaH / Math.sqrt(12)

  const buyerLiq: number[] = []
  const renterLiq: number[] = []
  const diffLiq: number[] = []
  const diffNonliq: number[] = []
  const firstRuns: MonteCarloResult['first_runs'] = []
  let buyerDebt = 0
  let renterDebt = 0

  const etfFactors = Array.from({ length: M }, () => 1)
  const housePath = Array.from({ length: M }, () => 0)
  const nYears = resolved.horizon_years
  const nPoints = nYears + 1
  const buyerByYear = new Float64Array(n * nPoints)
  const renterByYear = new Float64Array(n * nPoints)

  for (let i = 0; i < n; i++) {
    for (let k = 0; k < M; k++) etfFactors[k] = Math.exp(mu + sd * rng.normal())
    if (sigmaH > 0) {
      let H = resolved.price
      for (let k = 0; k < M; k++) {
        H *= Math.exp(muH + sdH * rng.normal())
        housePath[k] = H
      }
    }
    const model = runModel(resolved, config, {
      detail: 'yearly_liq',
      etf_factors: etfFactors,
      house_path: sigmaH > 0 ? housePath : undefined,
    })
    const base = i * nPoints
    buyerByYear[base] = model.start.buyer_liq
    renterByYear[base] = model.start.renter_liq
    for (let y = 1; y <= nYears; y++) {
      const row = model.yearly[y - 1]!
      buyerByYear[base + y] = row.buyer_liq
      renterByYear[base + y] = row.renter_liq
    }
    buyerLiq.push(model.end.buyer_liq)
    renterLiq.push(model.end.renter_liq)
    diffLiq.push(model.end.diff_liq)
    diffNonliq.push(model.end.diff_nonliq)
    if (model.first_debt_month.buyer !== null) buyerDebt++
    if (model.first_debt_month.renter !== null) renterDebt++
    if (i < 3) {
      firstRuns.push({
        buyer_liq: model.end.buyer_liq,
        renter_liq: model.end.renter_liq,
        diff_liq: model.end.diff_liq,
        diff_nonliq: model.end.diff_nonliq,
      })
    }
    if (onProgress && (i % 20 === 19 || i === n - 1)) onProgress(i + 1, n)
  }

  const years: number[] = []
  const buyerYearly: YearlyPercentiles[] = []
  const renterYearly: YearlyPercentiles[] = []
  const col = new Float64Array(n)
  for (let y = 0; y < nPoints; y++) {
    years.push(y)
    for (let i = 0; i < n; i++) col[i] = buyerByYear[i * nPoints + y]!
    buyerYearly.push(percentilesOf(col))
    for (let i = 0; i < n; i++) col[i] = renterByYear[i * nPoints + y]!
    renterYearly.push(percentilesOf(col))
  }

  return {
    runs: n,
    seed: resolved.mc_seed,
    buyer_liq: statsOf(buyerLiq),
    renter_liq: statsOf(renterLiq),
    diff_liq: statsOf(diffLiq),
    diff_nonliq: statsOf(diffNonliq),
    p_buyer_liq_ge: diffLiq.filter((v) => v >= 0).length / n,
    buyer_debt_rate: buyerDebt / n,
    renter_debt_rate: renterDebt / n,
    first_runs: firstRuns,
    yearly: { years, buyer_liq: buyerYearly, renter_liq: renterYearly },
  }
}

function percentilesOf(values: Float64Array): YearlyPercentiles {
  const sorted = Float64Array.from(values)
  sorted.sort()
  return {
    p5: quantile(sorted, 0.05),
    p25: quantile(sorted, 0.25),
    p50: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    p95: quantile(sorted, 0.95),
  }
}
