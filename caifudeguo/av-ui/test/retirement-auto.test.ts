// 0.3.3: default Basiszins 3,2 % and zveRetirement auto-estimated from zveSavingsPhase (RETIREMENT_ZVE_RATIO).
import { describe, expect, it } from 'vitest'
import { avDepot } from '../../../src/calculators/av-depot'
import { autoRetirementZve, createRetirementAuto, DEFAULTS, RETIREMENT_ZVE_RATIO } from '../src/model'
import { STR } from '../src/strings'

describe('default Basiszins 3,2 %', () => {
  it('form default is 3,20 and parses to 3.2', () => {
    expect(DEFAULTS.fields.baseRate).toBe('3,20')
  })
})

describe('retirement zvE ratio constant', () => {
  it('is one named constant, 0.5', () => {
    expect(RETIREMENT_ZVE_RATIO).toBe(0.5)
  })
  it('autoRetirementZve = round(zveSavings × ratio), German format', () => {
    expect(autoRetirementZve('50.000')).toBe('25.000')
    expect(autoRetirementZve('30.000')).toBe('15.000')
    expect(autoRetirementZve('0')).toBe('0')
    expect(autoRetirementZve('33.333')).toBe('16.667')
    expect(autoRetirementZve('1.234.567')).toBe('617.284')
  })
  it('unparsable or negative salary → null (leave the field alone)', () => {
    expect(autoRetirementZve('abc')).toBeNull()
    expect(autoRetirementZve('')).toBeNull()
    expect(autoRetirementZve('-5')).toBeNull()
  })
  it('default zveRetirement is the auto value of the default zveSavingsPhase', () => {
    expect(DEFAULTS.fields.zveRetirement).toBe(autoRetirementZve(DEFAULTS.fields.zveSavingsPhase))
  })
  it('auto values are accepted by the core schema', () => {
    const v = Number(autoRetirementZve('50.000')!.replace('.', ''))
    expect(avDepot.schema.safeParse({ ...{ age: 35, retirementAge: 67, zveSavingsPhase: 50000, zveRetirement: v, savingsRate: 1800, etfReturnRate: 6, avDepotCosts: 0.2, exemptionOrder: 1000, taxSavingsMode: 'avDepot', baseRate: 3.2, oneTimePayout: 0, payoutReturnRate: 3, payoutUntilAge: 85, childBirthYears: [], currentYear: 2027 } }).success).toBe(true)
  })
})

describe('createRetirementAuto (live update, manual override, restore)', () => {
  const fields = () => ({ ...DEFAULTS.fields })

  it('starts in auto mode', () => {
    expect(createRetirementAuto().manual).toBe(false)
  })
  it('salary edit overwrites zveRetirement live while auto', () => {
    const c = createRetirementAuto()
    const f = fields()
    f.zveSavingsPhase = '80.000'
    expect(c.onSavingsEdit(f)).toBe(true)
    expect(f.zveRetirement).toBe('40.000')
    f.zveSavingsPhase = '60.000'
    c.onSavingsEdit(f)
    expect(f.zveRetirement).toBe('30.000')
  })
  it('editing zveRetirement switches to manual: later salary edits no longer overwrite it', () => {
    const c = createRetirementAuto()
    const f = fields()
    c.onRetirementEdit()
    expect(c.manual).toBe(true)
    f.zveRetirement = '12.345'
    f.zveSavingsPhase = '90.000'
    expect(c.onSavingsEdit(f)).toBe(false)
    expect(f.zveRetirement).toBe('12.345')
  })
  it('restore returns to auto mode and recomputes from the current salary', () => {
    const c = createRetirementAuto()
    const f = fields()
    c.onRetirementEdit()
    f.zveRetirement = '1'
    f.zveSavingsPhase = '70.000'
    c.restore(f)
    expect(c.manual).toBe(false)
    expect(f.zveRetirement).toBe('35.000')
    f.zveSavingsPhase = '20.000'
    c.onSavingsEdit(f)
    expect(f.zveRetirement).toBe('10.000')
  })
  it('invalid salary text while auto leaves zveRetirement unchanged', () => {
    const c = createRetirementAuto()
    const f = fields()
    f.zveSavingsPhase = 'abc'
    expect(c.onSavingsEdit(f)).toBe(false)
    expect(f.zveRetirement).toBe(DEFAULTS.fields.zveRetirement)
  })
})

describe('restore-auto control copy', () => {
  it('label is exactly 按工资自动估算, and no hint string was added', () => {
    expect(STR.retirementAutoRestore.zh).toBe('按工资自动估算')
    expect(Object.keys(STR).filter(k => /retirementAuto/i.test(k))).toEqual(['retirementAutoRestore'])
  })
  it('existing field labels are unchanged', () => {
    expect(STR.zveRetirement.zh).toBe('退休期应税收入（€）')
    expect(STR.zveSavings.zh).toBe('工作期应税收入（€）')
    expect(STR.baseRate.zh).toBe('基准利率（%）')
  })
})
