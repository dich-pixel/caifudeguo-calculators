import type { EngineConfig, Inputs } from './types'

/** Effective Abgeltungsteuer + Soli, church tax k = 0. rate(k) = 0.25/(1+0.25*k)*(1+0.055+k). */
export const TAX_RATE = 0.25 / (1 + 0.25 * 0) * (1 + 0.055 + 0)

export const TEILFREISTELLUNG = 0.3

export const SPARERPAUSCHBETRAG = 0

/** 2026 BMF value; overridable from the WP admin settings. */
export const DEFAULT_BASISZINS = 0.032

export const PRNG_INITSEQ = 54

export const REFI_FALLBACK_TILGUNG = 0.01

/** Appendix A, as of 2026-10, fallback if the admin table is missing a state. */
export const DEFAULT_GREST: Record<string, number> = {
  BW: 0.05,
  BY: 0.035,
  BE: 0.06,
  BB: 0.065,
  HB: 0.055,
  HH: 0.055,
  HE: 0.06,
  MV: 0.06,
  NI: 0.05,
  NW: 0.065,
  RP: 0.05,
  SL: 0.065,
  SN: 0.055,
  ST: 0.05,
  SH: 0.065,
  TH: 0.05,
}

export const BUNDESLAND_CODES = Object.keys(DEFAULT_GREST)

export const DEFAULT_CONFIG: EngineConfig = {
  basiszins: DEFAULT_BASISZINS,
  grest: { ...DEFAULT_GREST },
  tax_rate: TAX_RATE,
  teilfreistellung: TEILFREISTELLUNG,
  sparerpauschbetrag: SPARERPAUSCHBETRAG,
  prng_initseq: PRNG_INITSEQ,
  refin_fallback_tilgung: REFI_FALLBACK_TILGUNG,
}

export const DEFAULT_INPUTS: Inputs = {
  price: 400_000,
  renovation: 20_000,
  down_payment: 400_000,
  wealth: 500_000,
  nk_mode: 'detailed',
  nk_total_pct: 0.1,
  bundesland: 'NW',
  notary_pct: 0.02,
  broker_buy_pct: 0.0357,
  maint_pct: 0.012,
  maint_base: 'total',
  building_share: 1,
  maint_growth: null,
  buyer_other_costs: 0,
  buyer_other_growth: null,
  house_growth: 0.02,
  loan_rate: 0.035,
  init_tilgung: 0.0185,
  fix_years: 10,
  follow_rate: null,
  follow_mode: 'keep_payment',
  follow_tilgung: null,
  sondertilgung_pct: 0,
  rent: 1850,
  rent_growth: null,
  renter_nebenkosten: 0,
  renter_nk_growth: null,
  renter_renovation: 0,
  cash_monthly: 2500,
  cash_growth: null,
  etf_return: 0.052,
  inflation: 0.02,
  horizon_years: 30,
  house_err: 2,
  etf_err: 4,
  borrow_rate: 0.06,
  sell_cost_pct: 0,
  self_use_exempt: true,
  personal_tax_rate: 0.42,
  mc_runs: 1000,
  mc_sigma: 0.15,
  mc_sigma_house: 0,
  mc_seed: 42,
}

export interface FieldRange {
  min: number
  max: number
  integer?: boolean
}

/** Allowed ranges from PRD chapter 4. Percentages are stored as decimals. house_err / etf_err are percentage points. */
export const FIELD_RANGES: Record<string, FieldRange> = {
  price: { min: 10_000, max: 10_000_000 },
  renovation: { min: 0, max: 1_000_000 },
  down_payment: { min: 0, max: Number.POSITIVE_INFINITY },
  wealth: { min: 0, max: Number.POSITIVE_INFINITY },
  nk_total_pct: { min: 0, max: 0.2 },
  notary_pct: { min: 0, max: 0.05 },
  broker_buy_pct: { min: 0, max: 0.0714 },
  maint_pct: { min: 0, max: 0.05 },
  building_share: { min: 0, max: 1 },
  maint_growth: { min: -0.05, max: 0.1 },
  buyer_other_costs: { min: 0, max: 5000 },
  buyer_other_growth: { min: -0.05, max: 0.1 },
  house_growth: { min: -0.1, max: 0.15 },
  loan_rate: { min: 0, max: 0.15 },
  init_tilgung: { min: 0, max: 0.2 },
  fix_years: { min: 1, max: 40, integer: true },
  follow_rate: { min: 0, max: 0.15 },
  follow_tilgung: { min: 0.005, max: 0.2 },
  sondertilgung_pct: { min: 0, max: 0.1 },
  rent: { min: 0, max: 20_000 },
  rent_growth: { min: -0.05, max: 0.1 },
  renter_nebenkosten: { min: 0, max: 5000 },
  renter_nk_growth: { min: -0.05, max: 0.1 },
  renter_renovation: { min: 0, max: 1_000_000 },
  cash_monthly: { min: 0, max: 100_000 },
  cash_growth: { min: -0.05, max: 0.1 },
  etf_return: { min: -0.05, max: 0.15 },
  inflation: { min: -0.02, max: 0.1 },
  horizon_years: { min: 1, max: 100, integer: true },
  house_err: { min: 0, max: 10 },
  etf_err: { min: 0, max: 10 },
  borrow_rate: { min: 0, max: 0.2 },
  sell_cost_pct: { min: 0, max: 0.1 },
  personal_tax_rate: { min: 0, max: 0.45 },
  mc_runs: { min: 100, max: 20_000, integer: true },
  mc_sigma: { min: 0, max: 0.4 },
  mc_sigma_house: { min: 0, max: 0.2 },
  mc_seed: { min: 0, max: 0xFFFF_FFFF, integer: true },
}

export const PLUGIN_VERSION = '1.0.0'

export const BASISZINS_YEAR = 2026
