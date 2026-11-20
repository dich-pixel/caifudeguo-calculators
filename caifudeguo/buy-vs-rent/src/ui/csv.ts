import type { MonthRow, YearRow } from '../engine/types'
import { formatDeNumber } from './format'

const YEAR_KEYS: (keyof YearRow)[] = [
  'year', 'house', 'balance', 'cum_principal', 'cum_interest',
  'rent_month', 'buyer_cost_month', 'renter_cost_month', 'cash_month',
  'buyer_etf', 'buyer_basis', 'buyer_debt', 'renter_etf', 'renter_basis', 'renter_debt', 'other_capital_gross',
  'vp_buyer', 'vp_renter', 'taxes_paid_buyer', 'taxes_paid_renter', 'latent_tax_buyer', 'latent_tax_renter', 'sell_cost', 'spec_tax',
  'buyer_nonliq', 'renter_nonliq', 'diff_nonliq', 'buyer_liq', 'renter_liq', 'diff_liq',
  'buyer_nonliq_real', 'renter_nonliq_real', 'buyer_liq_real', 'renter_liq_real', 'diff_liq_real',
]

const MONTH_KEYS: (keyof MonthRow)[] = [
  'month', 'year', 'miy', 'rate', 'bal_start', 'interest', 'principal', 'sonder', 'bal_end',
  'maint', 'other_cost', 'rent', 'renter_nk', 'cash', 'buyer_cost', 'renter_cost', 'inv_b', 'inv_r',
  'house', 'buyer_etf', 'buyer_debt', 'renter_etf', 'renter_debt',
]

function cell(v: number, key: string): string {
  if (key === 'year' || key === 'month' || key === 'miy')
    return String(v)
  if (key === 'rate')
    return formatDeNumber(v * 100, 4)
  return formatDeNumber(v, 2)
}

function table(keys: string[], rows: Array<Record<string, number>>): string {
  const header = keys.join(';')
  const body = rows.map(r => keys.map(k => cell(r[k] as number, k)).join(';')).join('\r\n')
  return `${header}\r\n${body}`
}

export function yearlyCsv(rows: YearRow[]): string {
  return table(YEAR_KEYS as string[], rows as unknown as Array<Record<string, number>>)
}

export function monthlyCsv(rows: MonthRow[]): string {
  return table(MONTH_KEYS as string[], rows as unknown as Array<Record<string, number>>)
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
