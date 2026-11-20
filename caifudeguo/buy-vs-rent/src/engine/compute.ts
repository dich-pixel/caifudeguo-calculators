import type {
  ComputeOptions,
  ComputeResult,
  ComputeSuccess,
  Derived,
  EngineConfig,
  Inputs,
  Issue,
  MonthRow,
  ResolvedInputs,
  ScenarioCell,
  YearRow,
} from './types'
import { EtfAccount } from './account'
import { mergeConfig, mergeInputs, resolveInputs, validate } from './validate'

function monthlyFactor(annual: number): number {
  return annual === 0 ? 1 : (1 + annual) ** (1 / 12)
}

function powSeries(initial: number, annual: number, tk: number): number {
  return annual === 0 ? initial : initial * (1 + annual) ** tk
}

function snapshotYear(opts: {
  year: number
  house: number
  bal: number
  cumPrincipal: number
  cumInterest: number
  rent_month: number
  buyer_cost_month: number
  renter_cost_month: number
  cash_month: number
  buyer: EtfAccount
  renter: EtfAccount
  other: number
  etf_return: number
  inflation: number
  sell_cost_pct: number
  self_use_exempt: boolean
  personal_tax_rate: number
  cost: number
  vp_buyer: number
  vp_renter: number
}): YearRow {
  const {
    year, house, bal, cumPrincipal, cumInterest,
    rent_month, buyer_cost_month, renter_cost_month, cash_month,
    buyer, renter, other, etf_return, inflation, sell_cost_pct,
    self_use_exempt, personal_tax_rate, cost, vp_buyer, vp_renter,
  } = opts
  const sale = house * (1 - sell_cost_pct)
  const spec_tax = (self_use_exempt || year >= 10) ? 0 : Math.max(0, sale - cost) * personal_tax_rate
  const net_b = buyer.V - buyer.debt
  const net_r = renter.V - renter.debt
  const buyer_nonliq = house - bal + net_b
  const renter_nonliq = net_r
  const latent_b = buyer.latentTax()
  const latent_r = renter.latentTax()
  const buyer_liq = sale - spec_tax - bal + net_b - latent_b
  const renter_liq = net_r - latent_r
  const diff_nonliq = buyer_nonliq - renter_nonliq
  const diff_liq = buyer_liq - renter_liq
  const real = (x: number) => year === 0 ? x : x / (1 + inflation) ** year
  const sell_cost = house * sell_cost_pct
  const other_capital_gross = other * (1 + etf_return) ** year
  return {
    year,
    house,
    balance: bal,
    cum_principal: cumPrincipal,
    cum_interest: cumInterest,
    rent_month,
    buyer_cost_month,
    renter_cost_month,
    cash_month,
    buyer_etf: buyer.V,
    buyer_basis: buyer.B,
    buyer_debt: buyer.debt,
    renter_etf: renter.V,
    renter_basis: renter.B,
    renter_debt: renter.debt,
    other_capital_gross,
    vp_buyer,
    vp_renter,
    taxes_paid_buyer: buyer.taxes_paid,
    taxes_paid_renter: renter.taxes_paid,
    latent_tax_buyer: latent_b,
    latent_tax_renter: latent_r,
    sell_cost,
    spec_tax,
    buyer_nonliq,
    renter_nonliq,
    diff_nonliq,
    buyer_liq,
    renter_liq,
    diff_liq,
    buyer_nonliq_real: real(buyer_nonliq),
    renter_nonliq_real: real(renter_nonliq),
    buyer_liq_real: real(buyer_liq),
    renter_liq_real: real(renter_liq),
    diff_liq_real: real(diff_liq),
  }
}

function breakeven(yearly: YearRow[], key: 'diff_liq' | 'diff_nonliq'): { year: number | null, persistent: boolean | null } {
  const first = yearly.find(r => r[key] >= 0)
  if (!first)
    return { year: null, persistent: null }
  const persistent = yearly.filter(r => r.year >= first.year).every(r => r[key] >= 0)
  return { year: first.year, persistent }
}

export function runModel(
  resolved: ResolvedInputs,
  config: EngineConfig,
  options: ComputeOptions = {},
): Omit<ComputeSuccess, 'ok' | 'warnings' | 'infos'> & { refiWarning: boolean } {
  const M = 12 * resolved.horizon_years
  const fEtfDefault = monthlyFactor(resolved.etf_return)
  const borrowFactor = monthlyFactor(resolved.borrow_rate)
  const acctCfg = {
    taxRate: config.tax_rate,
    teilfreistellung: config.teilfreistellung,
    sparerpauschbetrag: config.sparerpauschbetrag,
    borrowMonthlyFactor: borrowFactor,
  }
  const buyer = new EtfAccount(acctCfg)
  const renter = new EtfAccount(acctCfg)

  const renterOpen = resolved.down_payment - resolved.renter_renovation + resolved.other
  buyer.deposit(resolved.surplus + resolved.other, 1)
  if (renterOpen >= 0)
    renter.deposit(renterOpen, 1)
  else
    renter.addDebt(-renterOpen, 0)

  let bal = resolved.L0
  let payoff_month: number | null = resolved.L0 === 0 ? 0 : null
  let A = resolved.A0
  let cumInterest = 0
  let cumPrincipal = 0
  let refiWarning = false
  let refinanced = false
  const yearly: YearRow[] = []
  const monthly: MonthRow[] = []
  const detail = options.detail ?? 'full'
  const etfPath = options.etf_factors
  const housePath = options.house_path

  const start = snapshotYear({
    year: 0,
    house: resolved.price,
    bal,
    cumPrincipal: 0,
    cumInterest: 0,
    rent_month: resolved.rent,
    buyer_cost_month: A + resolved.maint0 + resolved.buyer_other_costs,
    renter_cost_month: resolved.rent + resolved.renter_nebenkosten,
    cash_month: resolved.cash_monthly,
    buyer,
    renter,
    other: resolved.other,
    etf_return: resolved.etf_return,
    inflation: resolved.inflation,
    sell_cost_pct: resolved.sell_cost_pct,
    self_use_exempt: resolved.self_use_exempt,
    personal_tax_rate: resolved.personal_tax_rate,
    cost: resolved.cost,
    vp_buyer: 0,
    vp_renter: 0,
  })

  const fixEndMonth = resolved.fix_years === null ? null : 12 * resolved.fix_years

  for (let k = 1; k <= M; k++) {
    const miy = (k - 1) % 12 + 1
    const tk = (k - 1) / 12

    let rate = resolved.loan_rate
    if (fixEndMonth !== null && k > fixEndMonth) {
      rate = resolved.follow_rate
      if (k === fixEndMonth + 1 && bal > 0) {
        refinanced = true
        if (resolved.follow_mode === 'new_tilgung') {
          A = bal * (rate + (resolved.follow_tilgung ?? 0)) / 12
        }
        else if (bal * rate / 12 >= A) {
          A = bal * (rate + config.refin_fallback_tilgung) / 12
          refiWarning = true
        }
      }
    }

    const bal_start = bal
    const interest = bal * rate / 12
    const principal = Math.min(Math.max(A - interest, 0), bal)
    const sonder = (resolved.sondertilgung_pct > 0 && miy === 12)
      ? Math.min(resolved.sondertilgung_pct * resolved.L0, bal - principal)
      : 0
    const pay = interest + principal + sonder

    const maint = powSeries(resolved.maint0, resolved.maint_growth, tk)
    const other_cost = powSeries(resolved.buyer_other_costs, resolved.buyer_other_growth, tk)
    const rent_k = powSeries(resolved.rent, resolved.rent_growth, tk)
    const rnk = powSeries(resolved.renter_nebenkosten, resolved.renter_nk_growth, tk)
    const cash = powSeries(resolved.cash_monthly, resolved.cash_growth, tk)
    const buyer_cost = pay + maint + other_cost
    const renter_cost = rent_k + rnk
    const inv_b = cash - buyer_cost
    const inv_r = cash - renter_cost

    if (inv_b >= 0)
      buyer.deposit(inv_b, miy)
    else
      buyer.withdraw(-inv_b, k)
    if (inv_r >= 0)
      renter.deposit(inv_r, miy)
    else
      renter.withdraw(-inv_r, k)

    bal = bal - principal - sonder
    if (payoff_month === null && bal <= 1e-9) {
      bal = 0
      payoff_month = k
    }
    cumInterest += interest
    cumPrincipal += principal + sonder

    const fEtf = etfPath?.[k - 1] ?? fEtfDefault
    buyer.grow(fEtf)
    renter.grow(fEtf)
    const house = housePath?.[k - 1] ?? resolved.price * (1 + resolved.house_growth) ** (k / 12)

    if (detail === 'full') {
      monthly.push({
        month: k,
        year: Math.ceil(k / 12),
        miy,
        rate,
        bal_start,
        interest,
        principal,
        sonder,
        bal_end: bal,
        maint,
        other_cost,
        rent: rent_k,
        renter_nk: rnk,
        cash,
        buyer_cost,
        renter_cost,
        inv_b,
        inv_r,
        house,
        buyer_etf: buyer.V,
        buyer_debt: buyer.debt,
        renter_etf: renter.V,
        renter_debt: renter.debt,
      })
    }

    if (miy === 12) {
      const y = k / 12
      const vp_b = buyer.yearEnd(k, config.basiszins)
      const vp_r = renter.yearEnd(k, config.basiszins)
      yearly.push(snapshotYear({
        year: y,
        house,
        bal,
        cumPrincipal,
        cumInterest,
        rent_month: rent_k,
        buyer_cost_month: buyer_cost,
        renter_cost_month: renter_cost,
        cash_month: cash,
        buyer,
        renter,
        other: resolved.other,
        etf_return: resolved.etf_return,
        inflation: resolved.inflation,
        sell_cost_pct: resolved.sell_cost_pct,
        self_use_exempt: resolved.self_use_exempt,
        personal_tax_rate: resolved.personal_tax_rate,
        cost: resolved.cost,
        vp_buyer: vp_b,
        vp_renter: vp_r,
      }))
    }
  }

  const end = yearly[yearly.length - 1]!
  const derived: Derived = {
    nk: resolved.nk,
    grest_pct: resolved.grest_pct,
    notary_pct: resolved.notary_pct,
    broker_buy_pct: resolved.broker_buy_pct,
    grest_amt: resolved.price * resolved.grest_pct,
    notary_amt: resolved.price * resolved.notary_pct,
    broker_amt: resolved.price * resolved.broker_buy_pct,
    cost: resolved.cost,
    L0: resolved.L0,
    surplus: resolved.surplus,
    other: resolved.other,
    A0: resolved.A0,
    maint0: resolved.maint0,
    rent_factor: resolved.rent > 0 ? resolved.price / (resolved.rent * 12) : Number.POSITIVE_INFINITY,
  }

  return {
    derived,
    yearly,
    monthly,
    start,
    end,
    breakeven_liq: breakeven(yearly, 'diff_liq'),
    breakeven_nonliq: breakeven(yearly, 'diff_nonliq'),
    first_debt_month: { buyer: buyer.first_debt_month, renter: renter.first_debt_month },
    payoff_month,
    refinanced,
    refi_payment: A,
    refiWarning,
  }
}

function postIssues(raw: Inputs, resolved: ResolvedInputs, model: ReturnType<typeof runModel>, base: { warnings: Issue[], infos: Issue[] }): { warnings: Issue[], infos: Issue[] } {
  const warnings = [...base.warnings]
  const infos = [...base.infos]
  if (model.refiWarning)
    warnings.push({ level: 'warning', id: 'W-REFI' })
  const { buyer, renter } = model.first_debt_month
  if (buyer !== null) {
    warnings.push({
      level: 'warning',
      id: 'W-DEBT',
      params: { who: 'buyer', k: buyer, y: Math.ceil(buyer / 12), rate: raw.borrow_rate },
    })
  }
  if (renter !== null) {
    warnings.push({
      level: 'warning',
      id: 'W-DEBT',
      params: { who: 'renter', k: renter, y: Math.ceil(renter / 12), rate: raw.borrow_rate },
    })
  }
  const m1Buyer = resolved.A0 + resolved.maint0 + resolved.buyer_other_costs
  const m1Renter = resolved.rent + resolved.renter_nebenkosten
  if (m1Buyer > resolved.cash_monthly)
    infos.push({ level: 'info', id: 'I-CASH', params: { who: 'buyer' } })
  if (m1Renter > resolved.cash_monthly)
    infos.push({ level: 'info', id: 'I-CASH', params: { who: 'renter' } })
  return { warnings, infos }
}

export function compute(
  partial: Partial<Inputs> | Inputs,
  configPartial?: Partial<EngineConfig>,
  options?: ComputeOptions,
): ComputeResult {
  const config = mergeConfig(configPartial)
  const raw = mergeInputs(partial)
  const { errors, warnings, infos } = validate(raw, config)
  if (errors.length)
    return { ok: false, errors, warnings, infos }
  const resolved = resolveInputs(raw, config)
  const model = runModel(resolved, config, options)
  const extra = postIssues(raw, resolved, model, { warnings, infos })
  const { refiWarning: _, ...rest } = model
  return { ok: true, ...rest, ...extra }
}

/** CALC-40: 3×3 matrix, rows = house growth low→high, columns = ETF low→high. */
export function scenarioMatrix(
  partial: Partial<Inputs> | Inputs,
  configPartial?: Partial<EngineConfig>,
): ScenarioCell[] | { ok: false, errors: Issue[] } {
  const config = mergeConfig(configPartial)
  const raw = mergeInputs(partial)
  const { errors } = validate(raw, config)
  if (errors.length)
    return { ok: false, errors }
  const resolved = resolveInputs(raw, config)
  const cells: ScenarioCell[] = []
  const e1 = resolved.house_err / 100
  const e2 = resolved.etf_err / 100
  const gSteps = [resolved.house_growth - e1, resolved.house_growth, resolved.house_growth + e1]
  const rSteps = [resolved.etf_return - e2, resolved.etf_return, resolved.etf_return + e2]
  for (const g of gSteps) {
    for (const r of rSteps) {
      const model = runModel({ ...resolved, house_growth: g, etf_return: r }, config, { detail: 'end' })
      cells.push({
        house_growth: g,
        etf_return: r,
        buyer_liq: model.end.buyer_liq,
        renter_liq: model.end.renter_liq,
        diff_liq: model.end.diff_liq,
        diff_nonliq: model.end.diff_nonliq,
      })
    }
  }
  return cells
}

export { mergeConfig, mergeInputs, resolveInputs, validate }
export type { EngineConfig, Inputs }
