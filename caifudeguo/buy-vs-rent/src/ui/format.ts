/** German locale number formatting (PRD UI-12 / OUT-05). Display only; do not use inside the engine. */

export function roundCents(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100
}

export function formatDeNumber(x: number, digits = 2): string {
  if (!Number.isFinite(x))
    return '—'
  const n = digits === 0 ? Math.round(x) : Number(x.toFixed(digits))
  const sign = n < 0 ? '−' : ''
  const parts = Math.abs(n).toFixed(digits).split('.')
  const int = parts[0] ?? '0'
  const frac = parts[1]
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return frac === undefined ? `${sign}${grouped}` : `${sign}${grouped},${frac}`
}

export function formatEUR(x: number, digits = 2): string {
  return `${formatDeNumber(x, digits)} €`
}

export function formatPct(decimal: number, digits = 2): string {
  return `${formatDeNumber(decimal * 100, digits)} %`
}

export function formatPoints(points: number, digits = 1): string {
  return formatDeNumber(points, digits)
}

/** Accept 1.234,56 / 1234,56 / 1234.56 / 1 234,56 */
export function parseDeNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '').replace(/€/g, '')
  if (s === '')
    return null
  let t = s
  if (t.includes(',') && t.includes('.')) {
    // dots as thousands, comma as decimal
    t = t.replace(/\./g, '').replace(',', '.')
  }
  else if (t.includes(',')) {
    t = t.replace(',', '.')
  }
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function parsePercentInput(raw: string): number | null {
  const n = parseDeNumber(raw.replace('%', ''))
  return n === null ? null : n / 100
}
