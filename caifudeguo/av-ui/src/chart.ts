/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Licensed under AGPL-3.0-only.
 *
 * Stage 3 chart (PLAN_stage3.md c): one line = after-tax difference D per amount, tiers evenly spaced.
 * Inline SVG via createElementNS, no library, no requests, no style attributes (CSP style-src 'self').
 * The SVG is aria-hidden; the figcaption + the table are the text version.
 */
import type { CmpRow } from './compare'
import { amountId } from './compare'
import { formatNumberDe } from './format'
import { ONE_CONTRACT_CAP } from './model'
import { t } from './strings'

const NS = 'http://www.w3.org/2000/svg'
const PAD = { left: 78, right: 20, top: 44, bottom: 44 }
/** x-axis labels below 400 px */
const NARROW_TICKS = [120, 360, 1800, 6840, 13680]

export function chartHeight(width: number): number {
  return Math.round(Math.min(320, Math.max(200, width * 0.45)))
}

export interface Geometry {
  width: number
  height: number
  xs: number[]
  y: (v: number) => number
  /** band half-width per point: 1 % × larger net total (same rule as verdict()) */
  band: number[]
  ticks: number[]
}

function niceStep(range: number): number {
  const raw = range / 4
  const p = 10 ** Math.floor(Math.log10(raw || 1))
  const m = raw / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}

export function geometry(rows: CmpRow[], width: number): Geometry {
  const height = chartHeight(width)
  const n = rows.length
  const inner = width - PAD.left - PAD.right
  const xs = rows.map((_, i) => PAD.left + (n === 1 ? inner / 2 : (inner * i) / (n - 1)))
  const band = rows.map(r => 0.01 * Math.max(Math.abs(r.avNet), Math.abs(r.normalNet)))
  const vals = rows.flatMap((r, i) => [r.diff, band[i]!, -band[i]!]).concat(0)
  const step = niceStep(Math.max(...vals) - Math.min(...vals))
  const lo = Math.floor(Math.min(...vals) / step) * step
  const hi = Math.ceil(Math.max(...vals) / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step)
    ticks.push(Math.round(v))
  const y = (v: number) => PAD.top + ((hi - v) / (hi - lo || 1)) * (height - PAD.top - PAD.bottom)
  return { width, height, xs, y, band, ticks }
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, text?: string): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs))
    e.setAttribute(k, String(v))
  if (text !== undefined)
    e.textContent = text
  return e
}

export function drawChart(rows: CmpRow[], width: number): SVGSVGElement {
  const g = geometry(rows, width)
  const svg = el('svg', { 'width': g.width, 'height': g.height, 'viewBox': `0 0 ${g.width} ${g.height}`, 'aria-hidden': 'true', 'class': 'cmp3-svg', 'focusable': 'false' })
  const bottom = g.height - PAD.bottom
  svg.append(el('text', { x: 0, y: 13, class: 'title' }, t('chartTitle')))
  // y grid + labels
  for (const v of g.ticks) {
    svg.append(el('line', { x1: PAD.left, x2: g.width - PAD.right, y1: g.y(v), y2: g.y(v), class: v === 0 ? 'zero' : 'grid' }))
    svg.append(el('text', { 'x': PAD.left - 4, 'y': g.y(v) + 4, 'text-anchor': 'end' }, formatNumberDe(v)))
  }
  // "两者基本相同" band (hatched via CSS class + legend)
  const upper = g.xs.map((x, i) => `${x},${g.y(g.band[i]!)}`)
  const lower = g.xs.map((x, i) => `${x},${g.y(-g.band[i]!)}`).reverse()
  svg.append(el('polygon', { points: [...upper, ...lower].join(' '), class: 'band' }))
  // 6.840 € dashed line (between points if it is not a row)
  const i6840 = rows.findIndex(r => r.amount === ONE_CONTRACT_CAP)
  if (i6840 >= 0) {
    const x = g.xs[i6840]!
    const m = el('g', { 'data-testid': 'cmp3-marker-6840' })
    m.append(el('line', { 'x1': x, 'x2': x, 'y1': PAD.top, 'y2': bottom, 'stroke-dasharray': '4 3', 'class': 'cap' }))
    m.append(el('text', { 'x': x - 8, 'y': bottom - 6, 'text-anchor': 'end' }, t('chartCap')))
    svg.append(m)
  }
  // data line (solid)
  svg.append(el('polyline', { points: g.xs.map((x, i) => `${x},${g.y(rows[i]!.diff)}`).join(' '), class: 'line' }))
  // points, markers, x labels
  const narrow = width < 400
  // Label placement away from the line: centred above a peak; on a slope shifted to the open side.
  const ys = rows.map(r => g.y(r.diff))
  const label = (i: number, above: boolean, gap: number) => {
    const y = ys[i]!
    const prev = ys[i - 1] ?? y
    const next = ys[i + 1] ?? y
    const rising = next < prev
    const peak = y <= prev && y <= next
    const anchor = peak ? 'middle' : (above === rising ? 'end' : 'start')
    const dx = anchor === 'middle' ? 0 : anchor === 'end' ? -8 : 8
    return { 'x': g.xs[i]! + dx, 'y': above ? y - gap : y + gap + 9, 'text-anchor': anchor }
  }
  rows.forEach((r, i) => {
    const x = g.xs[i]!
    const y = g.y(r.diff)
    const id = amountId(r.amount)
    const pt = el('g', { 'data-testid': `cmp3-point-${id}` })
    pt.append(el('circle', { cx: x, cy: y, r: r.user ? 6 : 3, class: r.user ? 'pt user' : 'pt' }))
    const kink = r.tier && (r.amount === 360 || r.amount === 1800)
    // labels above the point (on a slope shifted to the open side); a user label on a kink is stacked above it
    if (r.user)
      pt.append(el('text', { ...label(i, true, kink ? 24 : 10), class: 'user-label' }, t('cmp3UserTag')))
    svg.append(pt)
    if (kink) {
      const m = el('g', { 'data-testid': `cmp3-marker-${r.amount}` })
      m.append(el('rect', { x: x - 5, y: y - 5, width: 10, height: 10, class: 'kink' }))
      m.append(el('text', label(i, true, 10), t('chartKink', { a: formatNumberDe(r.amount) })))
      svg.append(m)
    }
    if ((!narrow || NARROW_TICKS.includes(r.amount)) && (r.tier || !narrow))
      svg.append(el('text', { 'x': x, 'y': bottom + 14, 'text-anchor': i === rows.length - 1 ? 'end' : 'middle', 'class': r.tier ? 'xl' : 'xl user' }, formatNumberDe(r.amount, Number.isInteger(r.amount) ? 0 : 2)))
  })
  svg.append(el('text', { 'x': PAD.left + (g.width - PAD.left - PAD.right) / 2, 'y': g.height - 6, 'text-anchor': 'middle' }, t('chartXAxis')))
  svg.append(el('text', { 'x': 0, 'y': 0, 'text-anchor': 'middle', 'transform': `translate(12 ${(PAD.top + bottom) / 2}) rotate(-90)` }, t('chartYAxis')))
  // legend
  svg.append(el('rect', { x: PAD.left, y: 20, width: 14, height: 10, class: 'band' }))
  svg.append(el('text', { x: PAD.left + 18, y: 29 }, t('chartBand')))
  return svg
}
