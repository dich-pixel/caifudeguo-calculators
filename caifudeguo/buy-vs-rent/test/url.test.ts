import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../src/engine/constants'
import { mergeInputs } from '../src/engine/validate'
import { inputsToQuery, queryToInputs } from '../src/ui/url'

describe('share link vs effective defaults', () => {
  it('omits inputs that match the effective (admin) defaults', () => {
    const admin = mergeInputs({ price: 350_000, rent: 1600 })
    expect(inputsToQuery(admin, admin)).toBe('')
  })

  it('encodes only values that differ from the admin defaults, not the built-in ones', () => {
    const admin = mergeInputs({ price: 350_000, rent: 1600 })
    const current = mergeInputs({ ...admin, price: 400_000 })
    const q = inputsToQuery(current, admin)
    expect(q).toContain('price=400000')
    expect(q).not.toContain('rent=')
    const fromBuiltin = inputsToQuery(current, DEFAULT_INPUTS)
    expect(fromBuiltin).not.toContain('price=')
    expect(fromBuiltin).toContain('rent=1600')
  })

  it('ignores a legacy bundesland param and mc_sigma_house in the query', () => {
    const parsed = queryToInputs('?bundesland=BY&mc_sigma_house=0.1&price=350000')
    expect('bundesland' in parsed).toBe(false)
    expect('mc_sigma_house' in parsed).toBe(false)
    expect(parsed.price).toBe(350_000)
  })

  it('round-trips the Sparerpauschbetrag switch and Kirchensteuer rate', () => {
    const inputs = mergeInputs({ use_sparer_kirchen: true, kirchen_rate: 0.08 })
    const q = inputsToQuery(inputs)
    expect(q).toContain('use_sparer_kirchen=1')
    expect(q).toContain('kirchen_rate=0.08')
    const parsed = queryToInputs(`?${q}`)
    expect(parsed.use_sparer_kirchen).toBe(true)
    expect(parsed.kirchen_rate).toBe(0.08)
  })
})
