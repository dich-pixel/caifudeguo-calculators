import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../src/engine/constants'
import { computeNk, mergeConfig, mergeInputs, resolveInputs, validate } from '../src/engine/validate'

const cfg = mergeConfig()

describe('validation rules (PRD chapter 7)', () => {
  it('rejects a horizon of 0 (E-HORIZON)', () => {
    const { errors } = validate(mergeInputs({ horizon_years: 0 }), cfg)
    expect(errors.some(e => e.id === 'E-HORIZON')).toBe(true)
  })

  it('rejects a non-integer horizon (E-HORIZON)', () => {
    const { errors } = validate(mergeInputs({ horizon_years: 10.5 }), cfg)
    expect(errors.some(e => e.id === 'E-HORIZON')).toBe(true)
  })

  it('rejects down payment above total wealth (E-DOWN-GT-WEALTH)', () => {
    const { errors } = validate(mergeInputs({ down_payment: 600_000, wealth: 500_000 }), cfg)
    expect(errors.some(e => e.id === 'E-DOWN-GT-WEALTH')).toBe(true)
  })

  it('rejects rent or price of 0 (E-PRICE)', () => {
    expect(validate(mergeInputs({ rent: 0 }), cfg).errors.some(e => e.id === 'E-PRICE')).toBe(true)
    expect(validate(mergeInputs({ price: 0 }), cfg).errors.some(e => e.id === 'E-PRICE')).toBe(true)
  })

  it('rejects a negative amount (E-NEG)', () => {
    const { errors } = validate(mergeInputs({ renovation: -1 }), cfg)
    expect(errors.some(e => e.id === 'E-NEG' && e.field === 'renovation')).toBe(true)
  })

  it('rejects a rate outside its allowed range (E-RATE)', () => {
    const { errors } = validate(mergeInputs({ loan_rate: 0.2 }), cfg)
    expect(errors.some(e => e.id === 'E-RATE' && e.field === 'loan_rate')).toBe(true)
  })

  it('rejects a rate of -100 % or below (E-RATE)', () => {
    const { errors } = validate(mergeInputs({ etf_return: -1 }), cfg)
    expect(errors.some(e => e.id === 'E-RATE' && e.field === 'etf_return')).toBe(true)
  })

  it('rejects loan rate and Tilgung both 0 when a loan is needed (E-NO-AMORT)', () => {
    const { errors } = validate(mergeInputs({ loan_rate: 0, init_tilgung: 0, down_payment: 50_000 }), cfg)
    expect(errors.some(e => e.id === 'E-NO-AMORT')).toBe(true)
  })

  it('rejects new_tilgung without a follow Tilgung (E-REFI-INPUT)', () => {
    const { errors } = validate(mergeInputs({ follow_mode: 'new_tilgung', follow_tilgung: null }), cfg)
    expect(errors.some(e => e.id === 'E-REFI-INPUT')).toBe(true)
  })

  it('rejects a non-integer or out-of-range Zinsbindung (E-FIX)', () => {
    expect(validate(mergeInputs({ fix_years: 0 }), cfg).errors.some(e => e.id === 'E-FIX')).toBe(true)
    expect(validate(mergeInputs({ fix_years: 10.2 }), cfg).errors.some(e => e.id === 'E-FIX')).toBe(true)
  })

  it('allows an empty Zinsbindung (full term)', () => {
    const { errors } = validate(mergeInputs({ fix_years: null }), cfg)
    expect(errors.some(e => e.id === 'E-FIX')).toBe(false)
  })

  it('flags I-NO-LOAN when own funds exceed total purchase cost (hand-computed)', () => {
    // Default GrESt (NW rate 6.5%) + 2% + 3.57% = 12.07%
    // cost = 400000 * 1.1207 + 20000 = 468280
    const { nk } = computeNk(DEFAULT_INPUTS, cfg)
    expect(nk).toBeCloseTo(0.1207, 12)
    const cost = 400_000 * (1 + nk) + 20_000
    expect(cost).toBeCloseTo(468_280, 8)
    const down = 480_000
    const { errors, infos } = validate(mergeInputs({ down_payment: down, wealth: 500_000 }), cfg)
    expect(errors).toEqual([])
    const info = infos.find(i => i.id === 'I-NO-LOAN')
    expect(info).toBeTruthy()
    expect(info!.params!.x).toBeCloseTo(down - cost, 8)
  })

  it('flags W-NOTILG when Tilgung is 0 and the rate is positive', () => {
    const { warnings } = validate(mergeInputs({ init_tilgung: 0, loan_rate: 0.03, down_payment: 50_000 }), cfg)
    expect(warnings.some(w => w.id === 'W-NOTILG')).toBe(true)
  })

  it('flags W-23 when self-use exemption is off and the horizon is under 10 years', () => {
    const { warnings } = validate(mergeInputs({ self_use_exempt: false, horizon_years: 5 }), cfg)
    expect(warnings.some(w => w.id === 'W-23')).toBe(true)
  })

  it('flags W-RANGE for unusually high ETF return, house growth or Nebenkosten', () => {
    const a = validate(mergeInputs({ etf_return: 0.11 }), cfg)
    expect(a.warnings.some(w => w.id === 'W-RANGE' && w.field === 'etf_return')).toBe(true)
    const b = validate(mergeInputs({ house_growth: 0.07 }), cfg)
    expect(b.warnings.some(w => w.id === 'W-RANGE' && w.field === 'house_growth')).toBe(true)
    const c = validate(mergeInputs({ nk_mode: 'total', nk_total_pct: 0.16 }), cfg)
    expect(c.warnings.some(w => w.id === 'W-RANGE')).toBe(true)
  })

  it('inherits empty growth fields from inflation', () => {
    const raw = mergeInputs({ inflation: 0.04, rent_growth: null, cash_growth: null, maint_growth: null })
    const resolved = resolveInputs(raw, cfg)
    expect(resolved.rent_growth).toBe(0.04)
    expect(resolved.cash_growth).toBe(0.04)
    expect(resolved.maint_growth).toBe(0.04)
    expect(resolved.follow_rate).toBe(raw.loan_rate)
  })

  it('rejects a Grunderwerbsteuer rate outside 0–20 %', () => {
    expect(validate(mergeInputs({ grest_pct: 0.21 }), cfg).errors.some(e => e.id === 'E-RATE' && e.field === 'grest_pct')).toBe(true)
    expect(validate(mergeInputs({ grest_pct: -0.01 }), cfg).errors.some(e => e.id === 'E-RATE' && e.field === 'grest_pct')).toBe(true)
    expect(validate(mergeInputs({ grest_pct: 0 }), cfg).errors).toEqual([])
  })
})
