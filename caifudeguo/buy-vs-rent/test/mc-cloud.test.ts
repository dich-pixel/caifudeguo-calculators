import { describe, expect, it } from 'vitest'
import { compute } from '../src/engine/compute'
import { DEFAULT_INPUTS } from '../src/engine/constants'
import { runMonteCarlo } from '../src/engine/montecarlo'
import { mergeConfig, mergeInputs } from '../src/engine/validate'
import { yearlyCsv } from '../src/ui/csv'
import snapshot from './snapshots/3e2c2f8-engine.json' with { type: 'json' }

function deepIs(a: unknown, b: unknown, path: string): void {
  if (Object.is(a, b)) return
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      throw new Error(
        `${path}: array mismatch (${Array.isArray(a)}/${Array.isArray(b)} ${Array.isArray(a) ? a.length : '-'} ${Array.isArray(b) ? b.length : '-'})`,
      )
    }
    for (let i = 0; i < a.length; i++) deepIs(a[i], b[i], `${path}[${i}]`)
    return
  }
  if (
    a !== null &&
    b !== null &&
    typeof a === 'object' &&
    typeof b === 'object'
  ) {
    const ak = Object.keys(a).sort()
    const bk = Object.keys(b).sort()
    if (ak.length !== bk.length || ak.some((k, i) => k !== bk[i]))
      throw new Error(`${path}: keys [${ak.join(',')}] vs [${bk.join(',')}]`)
    const ao = a as Record<string, unknown>
    const bo = b as Record<string, unknown>
    for (const k of ak) deepIs(ao[k], bo[k], `${path}.${k}`)
    return
  }
  throw new Error(
    `${path}: ${String(a)} !== ${String(b)} (${typeof a}/${typeof b})`,
  )
}

describe('monte carlo yearly probability cloud', () => {
  it('sets last-year p50 equal to the existing end p50 (Object.is)', () => {
    const mc = runMonteCarlo(
      mergeInputs({ horizon_years: 10, mc_runs: 200, mc_seed: 42 }),
      mergeConfig(),
    )
    if ('ok' in mc) throw new Error('mc failed')
    const last = mc.yearly.years.length - 1
    expect(mc.yearly.years[last]).toBe(10)
    expect(Object.is(mc.yearly.buyer_liq[last]!.p50, mc.buyer_liq.p50)).toBe(
      true,
    )
    expect(Object.is(mc.yearly.renter_liq[last]!.p50, mc.renter_liq.p50)).toBe(
      true,
    )
    expect(Object.is(mc.yearly.buyer_liq[last]!.p5, mc.buyer_liq.p5)).toBe(true)
    expect(Object.is(mc.yearly.renter_liq[last]!.p95, mc.renter_liq.p95)).toBe(
      true,
    )
  })

  it('collapses all percentiles at year 0 (start is deterministic)', () => {
    const mc = runMonteCarlo(
      mergeInputs({ horizon_years: 4, mc_runs: 100, mc_seed: 42 }),
      mergeConfig(),
    )
    if ('ok' in mc) throw new Error('mc failed')
    const b0 = mc.yearly.buyer_liq[0]!
    const r0 = mc.yearly.renter_liq[0]!
    expect(b0.p5).toBe(b0.p50)
    expect(b0.p95).toBe(b0.p50)
    expect(r0.p5).toBe(r0.p50)
    const det = compute({ horizon_years: 4 })
    expect(det.ok).toBe(true)
    if (!det.ok) return
    expect(b0.p50).toBe(det.start.buyer_liq)
    expect(r0.p50).toBe(det.start.renter_liq)
  })

  it('matches the deterministic yearly path when sigma is 0 (CALC-54)', () => {
    const inputs = mergeInputs({
      horizon_years: 5,
      mc_runs: 100,
      mc_sigma: 0,
      mc_sigma_house: 0,
      mc_seed: 42,
    })
    const det = compute(inputs)
    const mc = runMonteCarlo(inputs, mergeConfig())
    expect(det.ok).toBe(true)
    if (!det.ok || 'ok' in mc) return
    expect(mc.yearly.years).toEqual([0, 1, 2, 3, 4, 5])
    for (const row of det.yearly) {
      const i = row.year
      expect(mc.yearly.buyer_liq[i]!.p50).toBe(row.buyer_liq)
      expect(mc.yearly.renter_liq[i]!.p5).toBe(row.renter_liq)
      expect(mc.yearly.renter_liq[i]!.p95).toBe(row.renter_liq)
    }
    expect(mc.yearly.buyer_liq[0]!.p50).toBe(det.start.buyer_liq)
  })
})

describe('regression against 3e2c2f8 existing fields (Object.is)', () => {
  for (const [name, pack] of Object.entries(snapshot.cases)) {
    it(`compute() is unchanged for ${name}`, () => {
      const fresh = compute(pack.inputs as never)
      deepIs(fresh, pack.compute, `compute:${name}`)
    })

    it(`runMonteCarlo() existing fields are unchanged for ${name}`, () => {
      const fresh = runMonteCarlo({ ...DEFAULT_INPUTS, ...pack.inputs })
      if ('ok' in fresh) throw new Error(`mc failed: ${name}`)
      const { yearly, ...rest } = fresh
      deepIs(rest, pack.monteCarlo, `mc:${name}`)
      const last = yearly.years[yearly.years.length - 1]!
      expect(Object.is(yearly.buyer_liq[last]!.p50, fresh.buyer_liq.p50)).toBe(
        true,
      )
      expect(
        Object.is(yearly.renter_liq[last]!.p50, fresh.renter_liq.p50),
      ).toBe(true)
      expect(Object.is(yearly.buyer_liq[last]!.p5, fresh.buyer_liq.p5)).toBe(
        true,
      )
      expect(Object.is(yearly.buyer_liq[last]!.p25, fresh.buyer_liq.p25)).toBe(
        true,
      )
      expect(Object.is(yearly.buyer_liq[last]!.p75, fresh.buyer_liq.p75)).toBe(
        true,
      )
      expect(Object.is(yearly.buyer_liq[last]!.p95, fresh.buyer_liq.p95)).toBe(
        true,
      )
      expect(Object.is(yearly.renter_liq[last]!.p5, fresh.renter_liq.p5)).toBe(
        true,
      )
      expect(
        Object.is(yearly.renter_liq[last]!.p25, fresh.renter_liq.p25),
      ).toBe(true)
      expect(
        Object.is(yearly.renter_liq[last]!.p75, fresh.renter_liq.p75),
      ).toBe(true)
      expect(
        Object.is(yearly.renter_liq[last]!.p95, fresh.renter_liq.p95),
      ).toBe(true)
    })
  }
})

describe('csv keeps existing yearly columns and appends an MC section', () => {
  it('leaves the original yearly table unchanged when MC results are added', () => {
    const result = compute({ horizon_years: 3 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const base = yearlyCsv(result.yearly)
    const mc = runMonteCarlo(
      mergeInputs({ horizon_years: 3, mc_runs: 100, mc_seed: 42 }),
    )
    if ('ok' in mc) throw new Error('mc failed')
    const withMc = yearlyCsv(result.yearly, mc)
    expect(withMc.startsWith(base)).toBe(true)
    expect(withMc.slice(0, base.length)).toBe(base)
    expect(withMc.slice(base.length).startsWith('\r\n\r\n')).toBe(true)
    expect(withMc).toContain('renter_liq_p5')
    expect(withMc).toContain('buyer_liq_p95')
  })
})
