/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Licensed under AGPL-3.0-only.
 *
 * Display-only rounding and German number formatting (plan §3).
 */

/**
 * Commercial rounding: .5 rounds up (away from zero for negatives, e.g. -2,5 → -3).
 * The tiny epsilon absorbs binary representation errors such as 1.005 * 100 = 100.49999…
 */
export function roundHalfUp(value: number, decimals = 0): number {
  const f = 10 ** decimals
  const r = Math.floor(Math.abs(value) * f + 0.5 + 1e-9) / f
  return r === 0 ? 0 : Math.sign(value) * r
}

const nf = (d: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: true })

/** German number, e.g. 1800 → "1.800", 6 (1 decimal) → "6,0". Always groups, also 4-digit numbers. */
export function formatNumberDe(value: number, decimals = 0): string {
  const r = roundHalfUp(value, decimals)
  // de-DE omits the separator for 4-digit numbers in some ICU versions ("1800"); add it manually.
  const [int, frac] = nf(decimals).format(Math.abs(r)).replace(/\./g, '').split(',')
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${r < 0 ? '-' : ''}${grouped}${frac !== undefined ? `,${frac}` : ''}`
}

/** Stage 5 (a): displayed negatives use the minus sign U+2212, as on the chart axes; formatNumberDe stays ASCII for input round-trips. */
export function displayNumberDe(value: number, decimals = 0): string {
  return formatNumberDe(value, decimals).replace(/^-/, '\u2212')
}

/** Summary amounts: whole euros, e.g. "228.547 €". */
export function formatEuro(value: number): string {
  return `${displayNumberDe(value, 0)}\u00A0€`
}

/** Yearly table amounts: 2 decimals, e.g. "1.800,00 €". */
export function formatEuro2(value: number): string {
  return `${displayNumberDe(value, 2)}\u00A0€`
}

/** Percent, e.g. "6,0 %". */
export function formatPercentDe(value: number, decimals = 1): string {
  return `${displayNumberDe(value, decimals)}\u00A0%`
}
