/** Input and result types for the buy-vs-rent engine. Field names follow the WP PRD. */

export type NkMode = 'detailed' | 'total'
export type MaintBase = 'total' | 'building'
export type FollowMode = 'keep_payment' | 'new_tilgung'
export type Lang = 'zh' | 'de'

export interface Inputs {
  price: number
  renovation: number
  down_payment: number
  wealth: number
  nk_mode: NkMode
  nk_total_pct: number
  bundesland: string
  notary_pct: number
  broker_buy_pct: number
  maint_pct: number
  maint_base: MaintBase
  building_share: number
  /** null = inherit inflation */
  maint_growth: number | null
  buyer_other_costs: number
  buyer_other_growth: number | null
  house_growth: number
  loan_rate: number
  init_tilgung: number
  /** null = full term (no refinancing) */
  fix_years: number | null
  follow_rate: number | null
  follow_mode: FollowMode
  follow_tilgung: number | null
  sondertilgung_pct: number
  rent: number
  rent_growth: number | null
  renter_nebenkosten: number
  renter_nk_growth: number | null
  renter_renovation: number
  cash_monthly: number
  cash_growth: number | null
  etf_return: number
  inflation: number
  horizon_years: number
  /** Scenario step for house growth, in percentage points (2 means 0.02). */
  house_err: number
  /** Scenario step for ETF return, in percentage points. */
  etf_err: number
  borrow_rate: number
  sell_cost_pct: number
  self_use_exempt: boolean
  personal_tax_rate: number
  mc_runs: number
  mc_sigma: number
  mc_sigma_house: number
  mc_seed: number
}

/** Admin-configurable constants with built-in fallbacks. */
export interface EngineConfig {
  basiszins: number
  grest: Record<string, number>
  tax_rate: number
  teilfreistellung: number
  sparerpauschbetrag: number
  prng_initseq: number
  refin_fallback_tilgung: number
}

export interface ResolvedInputs extends Inputs {
  maint_growth: number
  buyer_other_growth: number
  follow_rate: number
  rent_growth: number
  renter_nk_growth: number
  cash_growth: number
  nk: number
  grest_pct: number
  cost: number
  L0: number
  surplus: number
  other: number
  A0: number
  maint0: number
}

export type IssueLevel = 'error' | 'warning' | 'info'

export interface Issue {
  level: IssueLevel
  id: string
  field?: string
  params?: Record<string, string | number>
}

export interface YearRow {
  year: number
  house: number
  balance: number
  cum_principal: number
  cum_interest: number
  rent_month: number
  buyer_cost_month: number
  renter_cost_month: number
  cash_month: number
  buyer_etf: number
  buyer_basis: number
  buyer_debt: number
  renter_etf: number
  renter_basis: number
  renter_debt: number
  other_capital_gross: number
  vp_buyer: number
  vp_renter: number
  taxes_paid_buyer: number
  taxes_paid_renter: number
  latent_tax_buyer: number
  latent_tax_renter: number
  sell_cost: number
  spec_tax: number
  buyer_nonliq: number
  renter_nonliq: number
  diff_nonliq: number
  buyer_liq: number
  renter_liq: number
  diff_liq: number
  buyer_nonliq_real: number
  renter_nonliq_real: number
  buyer_liq_real: number
  renter_liq_real: number
  diff_liq_real: number
}

export interface MonthRow {
  month: number
  year: number
  miy: number
  rate: number
  bal_start: number
  interest: number
  principal: number
  sonder: number
  bal_end: number
  maint: number
  other_cost: number
  rent: number
  renter_nk: number
  cash: number
  buyer_cost: number
  renter_cost: number
  inv_b: number
  inv_r: number
  house: number
  buyer_etf: number
  buyer_debt: number
  renter_etf: number
  renter_debt: number
}

export interface Derived {
  nk: number
  grest_pct: number
  notary_pct: number
  broker_buy_pct: number
  grest_amt: number
  notary_amt: number
  broker_amt: number
  cost: number
  L0: number
  surplus: number
  other: number
  A0: number
  maint0: number
  rent_factor: number
}

export interface Breakeven {
  year: number | null
  persistent: boolean | null
}

export interface ComputeSuccess {
  ok: true
  derived: Derived
  yearly: YearRow[]
  monthly: MonthRow[]
  start: YearRow
  end: YearRow
  breakeven_liq: Breakeven
  breakeven_nonliq: Breakeven
  first_debt_month: { buyer: number | null, renter: number | null }
  payoff_month: number | null
  warnings: Issue[]
  infos: Issue[]
  refinanced: boolean
  refi_payment: number
}

export interface ComputeFailure {
  ok: false
  errors: Issue[]
  warnings: Issue[]
  infos: Issue[]
}

export type ComputeResult = ComputeSuccess | ComputeFailure

export interface ScenarioCell {
  house_growth: number
  etf_return: number
  buyer_liq: number
  renter_liq: number
  diff_liq: number
  diff_nonliq: number
}

export interface MonteCarloStats {
  p5: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  p95: number
  mean: number
}

export interface MonteCarloResult {
  runs: number
  seed: number
  buyer_liq: MonteCarloStats
  renter_liq: MonteCarloStats
  diff_liq: MonteCarloStats
  diff_nonliq: MonteCarloStats
  p_buyer_liq_ge: number
  buyer_debt_rate: number
  renter_debt_rate: number
  first_runs: Array<{
    buyer_liq: number
    renter_liq: number
    diff_liq: number
    diff_nonliq: number
  }>
}

export interface ComputeOptions {
  /** When 'end', skip monthly rows and only keep yearly + end (used for the scenario matrix). */
  detail?: 'full' | 'end'
  /** Override the monthly ETF factor path (length M). */
  etf_factors?: number[]
  /** Override the month-end house-price path (length M). */
  house_path?: number[]
}
