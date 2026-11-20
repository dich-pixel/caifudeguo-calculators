import type { EngineConfig, FollowMode, Inputs, Issue, MaintBase, NkMode, ResolvedInputs } from './types'
import { BUNDESLAND_CODES, DEFAULT_CONFIG, DEFAULT_INPUTS, FIELD_RANGES } from './constants'

const RATE_FIELDS = [
  'nk_total_pct',
  'notary_pct',
  'broker_buy_pct',
  'maint_pct',
  'maint_growth',
  'buyer_other_growth',
  'house_growth',
  'loan_rate',
  'init_tilgung',
  'follow_rate',
  'follow_tilgung',
  'sondertilgung_pct',
  'rent_growth',
  'renter_nk_growth',
  'cash_growth',
  'etf_return',
  'inflation',
  'borrow_rate',
  'sell_cost_pct',
  'personal_tax_rate',
  'mc_sigma',
  'mc_sigma_house',
] as const

const AMOUNT_FIELDS = [
  'price',
  'renovation',
  'down_payment',
  'wealth',
  'buyer_other_costs',
  'renter_nebenkosten',
  'renter_renovation',
  'cash_monthly',
] as const

const NULLABLE = new Set([
  'maint_growth',
  'buyer_other_growth',
  'follow_rate',
  'follow_tilgung',
  'rent_growth',
  'renter_nk_growth',
  'cash_growth',
  'fix_years',
])

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function mergeConfig(partial?: Partial<EngineConfig>): EngineConfig {
  return {
    ...DEFAULT_CONFIG,
    ...partial,
    grest: { ...DEFAULT_CONFIG.grest, ...(partial?.grest ?? {}) },
  }
}

export function mergeInputs(partial?: Partial<Inputs>): Inputs {
  return { ...DEFAULT_INPUTS, ...partial }
}

export function computeNk(input: Inputs, config: EngineConfig): { nk: number, grest_pct: number } {
  const grest_pct = config.grest[input.bundesland] ?? 0
  const nk = input.nk_mode === 'total'
    ? input.nk_total_pct
    : grest_pct + input.notary_pct + input.broker_buy_pct
  return { nk, grest_pct }
}

export function validate(raw: Inputs, config: EngineConfig): { errors: Issue[], warnings: Issue[], infos: Issue[] } {
  const errors: Issue[] = []
  const warnings: Issue[] = []
  const infos: Issue[] = []

  const horizon = raw.horizon_years
  if (!isFiniteNumber(horizon) || !Number.isInteger(horizon) || horizon < 1 || horizon > 100) {
    errors.push({ level: 'error', id: 'E-HORIZON', field: 'horizon_years' })
  }

  if (raw.fix_years !== null && raw.fix_years !== undefined) {
    const f = raw.fix_years
    if (!isFiniteNumber(f) || !Number.isInteger(f) || f < 1 || f > 40)
      errors.push({ level: 'error', id: 'E-FIX', field: 'fix_years' })
  }

  if (!BUNDESLAND_CODES.includes(raw.bundesland) && raw.nk_mode === 'detailed')
    errors.push({ level: 'error', id: 'E-RATE', field: 'bundesland', params: { min: 'BW', max: 'TH' } })

  if (raw.nk_mode !== 'detailed' && raw.nk_mode !== 'total')
    errors.push({ level: 'error', id: 'E-RATE', field: 'nk_mode', params: { min: 'detailed', max: 'total' } })

  if (raw.maint_base !== 'total' && raw.maint_base !== 'building')
    errors.push({ level: 'error', id: 'E-RATE', field: 'maint_base', params: { min: 'total', max: 'building' } })

  if (raw.follow_mode !== 'keep_payment' && raw.follow_mode !== 'new_tilgung')
    errors.push({ level: 'error', id: 'E-RATE', field: 'follow_mode', params: { min: 'keep_payment', max: 'new_tilgung' } })

  for (const [field, range] of Object.entries(FIELD_RANGES)) {
    const value = (raw as unknown as Record<string, unknown>)[field]
    if (NULLABLE.has(field) && (value === null || value === undefined))
      continue
    if (!isFiniteNumber(value)) {
      if (RATE_FIELDS.includes(field as typeof RATE_FIELDS[number]))
        errors.push({ level: 'error', id: 'E-RATE', field, params: { min: range.min, max: range.max } })
      else if (AMOUNT_FIELDS.includes(field as typeof AMOUNT_FIELDS[number]))
        errors.push({ level: 'error', id: 'E-NEG', field })
      else
        errors.push({ level: 'error', id: 'E-RATE', field, params: { min: range.min, max: range.max } })
      continue
    }
    if (value <= -1 && RATE_FIELDS.includes(field as typeof RATE_FIELDS[number])) {
      errors.push({ level: 'error', id: 'E-RATE', field, params: { min: range.min, max: range.max } })
      continue
    }
    if (range.integer && !Number.isInteger(value)) {
      if (field === 'horizon_years')
        continue
      if (field === 'fix_years')
        continue
      errors.push({ level: 'error', id: 'E-RATE', field, params: { min: range.min, max: range.max } })
      continue
    }
    if (value < range.min || value > range.max) {
      if (RATE_FIELDS.includes(field as typeof RATE_FIELDS[number]) || field === 'mc_sigma' || field === 'mc_sigma_house')
        errors.push({ level: 'error', id: 'E-RATE', field, params: { min: range.min, max: range.max } })
      else if (AMOUNT_FIELDS.includes(field as typeof AMOUNT_FIELDS[number]) && value < 0)
        errors.push({ level: 'error', id: 'E-NEG', field })
      else if (field === 'horizon_years')
        continue
      else if (field === 'fix_years')
        continue
      else
        errors.push({ level: 'error', id: 'E-RATE', field, params: { min: range.min, max: range.max } })
    }
  }

  if (!isFiniteNumber(raw.price) || raw.price <= 0 || !isFiniteNumber(raw.rent) || raw.rent <= 0)
    errors.push({ level: 'error', id: 'E-PRICE', field: raw.price <= 0 ? 'price' : 'rent' })

  for (const field of AMOUNT_FIELDS) {
    const value = raw[field]
    if (isFiniteNumber(value) && value < 0)
      errors.push({ level: 'error', id: 'E-NEG', field })
  }

  if (isFiniteNumber(raw.down_payment) && isFiniteNumber(raw.wealth) && raw.down_payment > raw.wealth)
    errors.push({ level: 'error', id: 'E-DOWN-GT-WEALTH', field: 'down_payment' })

  if (raw.follow_mode === 'new_tilgung' && (raw.follow_tilgung === null || raw.follow_tilgung === undefined))
    errors.push({ level: 'error', id: 'E-REFI-INPUT', field: 'follow_tilgung' })

  if (errors.length)
    return { errors, warnings, infos }

  const { nk } = computeNk(raw, config)
  const cost = raw.price * (1 + nk) + raw.renovation
  const L0 = Math.max(0, cost - raw.down_payment)

  if (raw.down_payment > cost) {
    const surplus = raw.down_payment - cost
    infos.push({ level: 'info', id: 'I-NO-LOAN', field: 'down_payment', params: { x: surplus } })
  }

  if (L0 > 0 && raw.loan_rate === 0 && raw.init_tilgung === 0)
    errors.push({ level: 'error', id: 'E-NO-AMORT', field: 'init_tilgung' })

  if (L0 > 0 && raw.init_tilgung === 0 && raw.loan_rate > 0)
    warnings.push({ level: 'warning', id: 'W-NOTILG', field: 'init_tilgung' })

  if (!raw.self_use_exempt && raw.horizon_years < 10)
    warnings.push({ level: 'warning', id: 'W-23' })

  if (raw.etf_return > 0.1)
    warnings.push({ level: 'warning', id: 'W-RANGE', field: 'etf_return' })
  if (raw.house_growth > 0.06)
    warnings.push({ level: 'warning', id: 'W-RANGE', field: 'house_growth' })
  if (nk > 0.15)
    warnings.push({ level: 'warning', id: 'W-RANGE', field: raw.nk_mode === 'total' ? 'nk_total_pct' : 'broker_buy_pct' })

  if (raw.mc_runs > 5000)
    infos.push({ level: 'info', id: 'I-MC-SLOW', field: 'mc_runs' })

  return { errors, warnings, infos }
}

export function resolveInputs(raw: Inputs, config: EngineConfig): ResolvedInputs {
  const inflation = raw.inflation
  const { nk, grest_pct } = computeNk(raw, config)
  const cost = raw.price * (1 + nk) + raw.renovation
  const L0 = Math.max(0, cost - raw.down_payment)
  const surplus = Math.max(0, raw.down_payment - cost)
  const other = raw.wealth - raw.down_payment
  const A0 = L0 * (raw.loan_rate + raw.init_tilgung) / 12
  const share = raw.maint_base === 'building' ? raw.building_share : 1
  const maint0 = raw.price * share * raw.maint_pct / 12
  return {
    ...raw,
    maint_growth: raw.maint_growth ?? inflation,
    buyer_other_growth: raw.buyer_other_growth ?? inflation,
    follow_rate: raw.follow_rate ?? raw.loan_rate,
    rent_growth: raw.rent_growth ?? inflation,
    renter_nk_growth: raw.renter_nk_growth ?? inflation,
    cash_growth: raw.cash_growth ?? inflation,
    nk,
    grest_pct,
    cost,
    L0,
    surplus,
    other,
    A0,
    maint0,
  }
}

export function parseNkMode(v: unknown): NkMode | undefined {
  return v === 'detailed' || v === 'total' ? v : undefined
}

export function parseFollowMode(v: unknown): FollowMode | undefined {
  return v === 'keep_payment' || v === 'new_tilgung' ? v : undefined
}

export function parseMaintBase(v: unknown): MaintBase | undefined {
  return v === 'total' || v === 'building' ? v : undefined
}
