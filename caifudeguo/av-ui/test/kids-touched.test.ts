// Stage 3 g7: untouched kid rows are not calculated and show no error (plan f4, g2 Q-T1).
import type { FormValues } from '../src/model'
import { describe, expect, it } from 'vitest'
import { evaluate, remapKidErrors, withTouchedKids } from '../src/model'
import { LEGACY_DEFAULTS as DEFAULTS } from './legacy-defaults'

const TODAY = new Date(2026, 9, 17)
const form = (kids: string[]): FormValues => ({ ...structuredClone(DEFAULTS), kids })

describe('touched kid rows', () => {
  it('t3-77 new empty untouched row: same result as without it, no error', () => {
    const { values } = withTouchedKids(form(['']), [false])
    const o = evaluate(values, TODAY)
    const base = evaluate(form([]), TODAY)
    expect(o.ok && base.ok && o.result.payoutTotal.net.avDepot === base.result.payoutTotal.net.avDepot).toBe(true)
  })
  it('t3-78 touched (blurred) empty row → errEmpty on that row', () => {
    const { values, rowOf } = withTouchedKids(form(['']), [true])
    const o = evaluate(values, TODAY)
    expect(o.ok).toBe(false)
    if (!o.ok)
      expect(remapKidErrors(o.errors, rowOf)).toEqual({ 'kid-0': { key: 'errEmpty' } })
  })
  it('t3-78 touched 2030 → future-year error; 2020 counted', () => {
    const o = evaluate(withTouchedKids(form(['2030']), [true]).values, TODAY)
    expect(!o.ok && o.errors['kid-0']?.key).toBe('errFuture')
    const a = evaluate(withTouchedKids(form(['2020']), [true]).values, TODAY)
    const b = evaluate(form(['2020']), TODAY)
    expect(a.ok && b.ok && a.result.payoutTotal.net.avDepot === b.result.payoutTotal.net.avDepot).toBe(true)
  })
  it('t3-79 mixed rows: only the touched one is flagged, index maps back to the form row', () => {
    const { values, rowOf } = withTouchedKids(form(['2023', '', '']), [true, false, true])
    expect(values.kids).toEqual(['2023', ''])
    const o = evaluate(values, TODAY)
    expect(!o.ok && remapKidErrors(o.errors, rowOf)).toEqual({ 'kid-2': { key: 'errEmpty' } })
  })
})
