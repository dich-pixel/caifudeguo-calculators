/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Licensed under AGPL-3.0-only.
 *
 * Stage 3 chart (PLAN_stage3.md c): after-tax difference D per amount, tiers evenly spaced.
 * Stage 5 B (PLAN_stage5.md B.2): the ±1 % band is gone; a dashed line shows the relative difference on a right
 * axis (%), its 0 at the same height as the left 0. Stage 5 A.3: every text label is placed so that it keeps
 * ≥ 4 px from all other texts and from the 0 line and does not cover its own point.
 * The dual-axis frame and the label placer are shared with the early-withdrawal chart (early-exit-view.ts).
 * Inline SVG via createElementNS, no library, no requests, no style attributes (CSP style-src 'self').
 * The SVG is aria-hidden; the figcaption + the table are the text version.
 */
import type { CmpRow } from './compare'
import type { StrKey } from './strings'
import { amountId } from './compare'
import { formatNumberDe } from './format'
import { ONE_CONTRACT_CAP } from './model'
import { t } from './strings'

const NS = 'http://www.w3.org/2000/svg'
/** right = tick labels (start-anchored at width − right + 6) + the rotated right axis title at width − RIGHT_TITLE_INSET */
/** min horizontal gap between an x label and the right-axis tick labels */
export const X_LABEL_GAP = 4

/** stage 5 follow-up: min horizontal gap between two x labels (tester: 65/66 at 800 px) */
export const X_LABEL_MIN_GAP = 8
/** baseline offset between x-label rows: glyph boxes (baseline −10.5 … +1.5) of stacked rows stay ≥ 4 px apart
 * (stage 5 follow-up, was 13) (only used for must-keep ticks that do not fit) */
export const X_ROW2_DY = 16

/** free space (px) on each side of a leader line */
export const LEADER_CLEAR = 2

/** `yields`: never protected (the user amount, which has its own「你的金额」label) */
export interface XLabel { tick: number, w: number, must?: boolean, yields?: boolean }
export interface XPlaced { i: number, l: number, row: number }

/** Lay out one row: each label still touches its tick (l ≤ tick ≤ l + w), inside [minL, maxR], ≥ gap apart. */
function fitRow(ls: XLabel[], idx: number[], minL: number, maxR: number, gap: number, avoid: number[] = []): number[] | null {
  const o = [...idx].sort((x, y) => ls[x]!.tick - ls[y]!.tick)
  const lo = o.map(i => Math.max(minL, ls[i]!.tick - ls[i]!.w))
  const hi = o.map(i => Math.min(maxR - ls[i]!.w, ls[i]!.tick))
  // follow-up: leader lines of deeper rows (at x ∈ avoid) pass this row; no label may cover them
  o.forEach((i, k) => {
    for (const x of avoid) {
      if (ls[i]!.tick < x)
        hi[k] = Math.min(hi[k]!, x - LEADER_CLEAR - ls[i]!.w)
      else if (ls[i]!.tick > x)
        lo[k] = Math.max(lo[k]!, x + LEADER_CLEAR)
    }
  })
  const l = o.map((i, k) => Math.min(hi[k]!, Math.max(lo[k]!, ls[i]!.tick - ls[i]!.w / 2)))
  for (let k = 1; k < o.length; k++) l[k] = Math.max(l[k]!, l[k - 1]! + ls[o[k - 1]!]!.w + gap)
  for (let k = o.length - 1; k >= 0; k--) l[k] = Math.min(l[k]!, hi[k]!, k < o.length - 1 ? l[k + 1]! - ls[o[k]!]!.w - gap : Infinity)
  for (let k = 0; k < o.length; k++) {
    if (l[k]! < lo[k]! - 1e-9 || l[k]! > hi[k]! + 1e-9 || (k > 0 && l[k]! < l[k - 1]! + ls[o[k - 1]!]!.w + gap - 1e-9))
      return null
  }
  const out: number[] = []
  o.forEach((i, k) => { out[i] = l[k]! })
  return out
}

/**
 * Stage 5 (4) + follow-up: x labels never overlap (≥ gap px). All labels are kept when they fit (shifted a little
 * if needed, never off their tick). Otherwise labels are dropped, in this order of protection: first, last, must-keep
 * (the amounts the summary sentences name), the rest left to right. A must-keep label that does not fit in row 0
 * goes to the next of up to `rows` rows (narrow screens, where adjacent named ticks are only ~15 px apart). Returns placed labels in index order.
 */
export function placeLabels(ls: XLabel[], o: { minL: number, maxR: number, gap?: number, rows?: number }): XPlaced[] {
  const gap = o.gap ?? X_LABEL_MIN_GAP
  const n = ls.length
  const all = ls.map((_, i) => i)
  const one = fitRow(ls, all, o.minL, o.maxR, gap)
  if (one)
    return all.map(i => ({ i, l: one[i]!, row: 0 }))
  // protected labels (first, last, must-keep) left to right, so stacked ones form a staircase whose leaders stay free
  // first / last = the outermost ticks among the labels that do not yield (input order may put yielding ones last)
  const keep = all.filter(i => !ls[i]!.yields).sort((x, y) => ls[x]!.tick - ls[y]!.tick)
  const first = keep[0] ?? 0
  const last = keep[keep.length - 1] ?? n - 1
  const isProt = (i: number) => !ls[i]!.yields && (i === first || i === last || !!ls[i]!.must)
  const byTick = (x: number, y: number) => ls[x]!.tick - ls[y]!.tick
  const order = [...all.filter(isProt).sort(byTick), ...all.filter(i => !isProt(i))]
  const rowsIdx: number[][] = Array.from({ length: Math.max(1, o.rows ?? 1) }, () => [])
  const fit = (rs: number[][]) => rs.map((idx, r) => fitRow(ls, idx, o.minL, o.maxR, gap, rs.slice(r + 1).flat().map(i => ls[i]!.tick)))
  const ok = (rs: number[][]) => fit(rs).every(Boolean)
  const withI = (rs: number[][], r: number, i: number) => rs.map((idx, k) => k === r ? [...idx, i] : idx)
  // protected labels: depth-first over rows (lowest rows first), so an earlier label can step down to free a leader
  const prot = order.filter(isProt)
  let budget = 20000
  const dfs = (k: number, rs: number[][]): number[][] | null => {
    if (k === prot.length)
      return rs
    for (let r = 0; r < rs.length && budget-- > 0; r++) {
      const next = withI(rs, r, prot[k]!)
      const done = ok(next) ? dfs(k + 1, next) : null
      if (done)
        return done
    }
    return null
  }
  const found = dfs(0, rowsIdx)
  for (const i of found ? order.filter(i => !isProt(i)) : order) {
    const cur = found ?? rowsIdx
    const tries = isProt(i) ? cur.map((_, r) => r) : [0]
    const r = tries.find(r => ok(withI(cur, r, i)))
    if (r !== undefined)
      cur[r]!.push(i)
  }
  if (found)
    found.forEach((idx, r) => { rowsIdx[r] = idx })
  const out: XPlaced[] = []
  const f = fit(rowsIdx)
  rowsIdx.forEach((idx, r) => {
    for (const i of idx) out.push({ i, l: f[r]![i]!, row: r })
  })
  return out.sort((x, y) => x.i - y.i)
}
/** stage 5 (5): baseline of the rotated right title; its glyphs (≈ 13 px towards the edge in the browser) end ≥ 8 px inside the SVG */
export const RIGHT_TITLE_INSET = 22
export const PAD = { left: 78, right: 84, top: 46, bottom: 44 }
/** x-axis labels below 400 px */
/** first x-label row: baseline this far below the plot bottom; its glyphs stay ≥ 4 px below the lowest axis numbers */
export const X_ROW0_DY = 21
/** min distance between two labelled axis values (glyphs 12 px + 4 px apart) */
export const MIN_TICK_DY = 16
const NARROW_TICKS = [120, 360, 1800, 6840, 13680]
/** A.3: minimum gap between texts / to the 0 line */
export const GAP = 4
/** follow-up: line distance of the two-line 6.840 label */
export const CAP_LINE_DY = 14
/** right axis: at most this many ticks below 400 px (B.2) */
export const NARROW_RIGHT_TICKS = 3

export function chartHeight(width: number): number {
  return Math.round(Math.min(320, Math.max(200, width * 0.45)))
}

export interface Axes {
  /** € → px (left) */
  y: (v: number) => number
  /** % → px (right); yR(0) === y(0) */
  yR: (v: number) => number
  ticks: number[]
  ticksR: number[]
}

export interface Geometry extends Axes {
  top: number
  width: number
  height: number
  xs: number[]
}

function niceStep(range: number, parts = 4): number {
  const raw = range / parts
  const p = 10 ** Math.floor(Math.log10(raw || 1))
  const m = raw / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}

function niceRange(vals: number[], parts: number): { lo: number, hi: number, step: number } {
  const all = vals.concat(0)
  const min = Math.min(...all)
  const max = Math.max(...all)
  const step = niceStep(max - min || 1, parts)
  return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step || step, step }
}

const ticksIn = (lo: number, hi: number, step: number) => {
  const out: number[] = []
  for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-9; k++)
    out.push(Math.abs(k * step) < 1e-9 ? 0 : k * step)
  return out
}

/**
 * Two value axes with their 0 at the same height (B.2): each axis gets nice limits, then both are widened to the
 * same share above / below 0. Right values: null = not drawn (B.3) and not used for the range.
 */
export function axes(left: number[], right: (number | null)[], top: number, bottom: number, narrow: boolean): Axes {
  const L = niceRange(left, 4)
  const rv = right.filter((v): v is number => v !== null)
  const R = niceRange(rv.length ? rv : [0], narrow ? 2 : 4)
  const minR = Math.min(0, ...rv)
  const span = (a: { lo: number, hi: number }) => a.hi - a.lo
  const maxR = narrow ? NARROW_RIGHT_TICKS : Infinity
  let stepR = R.step
  let loL = 0
  let hiL = 0
  let loR = 0
  let hiR = 0
  let ticksR: number[] = []
  // Stage 5 follow-up: when a value is below 0 the right axis needs a tick below 0 (lo ≤ −step),
  // and both axes keep their 0 at the same height.
  for (let pass = 0; pass < 12; pass++) {
    const rLo = minR < 0 ? Math.min(R.lo, -stepR * Math.ceil(-minR / stepR)) : R.lo
    const rHi = Math.max(R.hi, stepR * Math.ceil(Math.max(0, ...rv) / stepR) || stepR)
    const RR = { lo: rLo, hi: rHi }
    const up = Math.max(L.hi / span(L), RR.hi / span(RR))
    const down = Math.max(-L.lo / span(L), -RR.lo / span(RR))
    loL = -down * span(L)
    hiL = up * span(L)
    loR = -down * span(RR)
    hiR = up * span(RR)
    ticksR = ticksIn(loR, hiR, stepR)
    if (ticksR.length > maxR) {
      stepR *= 2
      continue
    }
    break
  }
  const h = bottom - top
  const y = (v: number) => top + ((hiL - v) / (hiL - loL)) * h
  const yR = (v: number) => top + ((hiR - v) / (hiR - loR)) * h
  // labelled values ≥ MIN_TICK_DY apart (glyph boxes ≥ 4 px apart): a coarser step (multiples keep the 0)
  let stepL = L.step
  while (stepL * h / (hiL - loL || 1) < MIN_TICK_DY && stepL < hiL - loL) stepL *= 2
  return { y, yR, ticks: ticksIn(loL, hiL, stepL).map(v => Math.round(v)), ticksR }
}

/** estimated text width (12 px font): 13 px per CJK character, 7 px otherwise */
export const textWidth = (text: string) => [...text].reduce((n, c) => n + (/[\u3000-\uFFFF]/.test(c) ? 13 : 7), 0)

const LEGEND: [string, StrKey][] = [['line', 'chartLegendDiff'], ['rel', 'chartLegendRel']]

/** legend items (first row baseline 31, second row 47) */
export function legendLayout(width: number): { x: number, y: number, cls: string, key: StrKey }[] {
  let x = PAD.left
  let y = 31
  return LEGEND.map(([cls, key]) => {
    const w = 20 + textWidth(t(key))
    if (x > PAD.left && x + w > width - 4) {
      x = PAD.left
      y += 16
    }
    const it = { x, y, cls, key }
    x += w + 14
    return it
  })
}

/** top of the plot area: 15 px below the last legend row */
export function plotTop(width: number): number {
  return Math.max(PAD.top, Math.max(...legendLayout(width).map(i => i.y)) + 15)
}

export function geometry(rows: CmpRow[], width: number): Geometry {
  const height = chartHeight(width)
  const n = rows.length
  const inner = width - PAD.left - PAD.right
  const xs = rows.map((_, i) => PAD.left + (n === 1 ? inner / 2 : (inner * i) / (n - 1)))
  const top = plotTop(width)
  const a = axes(rows.map(r => r.diff), rows.map(r => r.rel), top, height - PAD.bottom, width < 400)
  return { width, height, top, xs, ...a }
}

export function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, text?: string): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs))
    e.setAttribute(k, String(v))
  if (text !== undefined)
    e.textContent = text
  return e
}

// ---- text boxes and label placement (A.3) ----------------------------------------------------------------------

export interface Box { l: number, r: number, t: number, b: number }
/** Estimated text width, deliberately generous (A.3): 13 px per CJK character, 7 px otherwise (12 px font). */
/** box of a start-anchored text at baseline y */
export const textBox = (x: number, y: number, text: string): Box => ({ l: x, r: x + textWidth(text), t: y - 11, b: y + 3 })
const anchoredLeft = (x: number, anchor: string, w: number) => anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2
const apart = (a: Box, b: Box, gap: number) => a.r + gap <= b.l || b.r + gap <= a.l || a.b + gap <= b.t || b.b + gap <= a.t

export type Placed = Record<string, string | number> & { 'x': number, 'y': number, 'text-anchor': 'start' }

/** Occupied boxes of one SVG; labels are placed one after another (first fit), each then occupies its box. */
export class Placer {
  readonly boxes: Box[] = []
  readonly width: number
  readonly height: number
  readonly zeroY: number | null
  readonly plot: { l: number, r: number }
  constructor(width: number, height: number, zeroY: number | null, plot: { l: number, r: number }) {
    this.width = width
    this.height = height
    this.zeroY = zeroY
    this.plot = plot
  }

  occupy(b: Box) {
    this.boxes.push(b)
  }

  /** follow-up: curves, markers and dashed lines: labels keep 1 px clear; in the fallback a text overlap costs more */
  readonly soft: Box[] = []
  /** markers (points): no label may touch them, but 1 px clearance is enough */
  readonly marks: Box[] = []
  occupyMark(b: Box) {
    this.marks.push(b)
  }
  occupySoft(b: Box) {
    this.soft.push(b)
  }

  /** a text that is always drawn at this place (titles, ticks, legend); it still occupies its box */
  fixed(x: number, y: number, anchor: string, text: string): Placed {
    const w = textWidth(text)
    const p: Placed = { 'x': anchoredLeft(x, anchor, w), y, 'text-anchor': 'start' }
    this.occupy(textBox(p.x, p.y, text))
    return p
  }

  ok(b: Box, own: Box | null): boolean {
    if (b.t < 0 || b.b > this.height || b.l < 0 || b.r > this.width)
      return false
    if (own && !apart(b, own, 1))
      return false
    if (this.zeroY !== null && b.r > this.plot.l && b.l < this.plot.r && !(b.b + GAP <= this.zeroY || this.zeroY + GAP <= b.t))
      return false
    return this.hardOk(b, own) && this.soft.every(o => apart(b, o, 1))
  }

  /** clear of every text / tick / legend box and the own point; curves and markers may be crossed */
  hardOk(b: Box, own: Box | null, ignoreMarks?: ReadonlySet<Box>, ignoreBoxes?: ReadonlySet<Box>): boolean {
    if (b.t < 0 || b.b > this.height || b.l < 0 || b.r > this.width)
      return false
    if (own && !apart(b, own, 1))
      return false
    if (this.zeroY !== null && b.r > this.plot.l && b.l < this.plot.r && !(b.b + GAP <= this.zeroY || this.zeroY + GAP <= b.t))
      return false
    return this.marks.every(o => o === own || ignoreMarks?.has(o) || apart(b, o, 1)) && this.boxes.every(o => o === own || ignoreBoxes?.has(o) || apart(b, o, GAP)) // the own point only needs 1 px (checked above)
  }

  /** how much of the curves / markers / dashed lines a box covers */
  softCost(b: Box): number {
    const ov = (o: Box) => Math.max(0, Math.min(b.r, o.r + 1) - Math.max(b.l, o.l - 1)) * Math.max(0, Math.min(b.b, o.b + 1) - Math.max(b.t, o.t - 1))
    return this.soft.reduce((n, o) => n + ov(o), 0)
  }

  /** best candidate: first fully free; else the text-free one crossing the least curve; else the least collision */
  pick(boxes: Box[], own: Box | null): number {
    const i = boxes.findIndex(b => this.ok(b, own))
    if (i >= 0)
      return i
    const by = (f: (b: Box) => number, ix: number[]) => ix.reduce((a, j) => f(boxes[j]!) < f(boxes[a]!) ? j : a)
    const hard = boxes.map((_, j) => j).filter(j => this.hardOk(boxes[j]!, own))
    if (hard.length)
      return by(b => this.softCost(b), hard)
    return by(b => this.cost(b, own), boxes.map((_, j) => j))
  }

  /** collision cost of a box: overlap with every grown box, the zero-line strip and the own point; out of bounds = ∞ */
  cost(b: Box, own: Box | null): number {
    if (b.t < 0 || b.b > this.height || b.l < 0 || b.r > this.width)
      return Infinity
    const ov = (o: Box, g: number) => Math.max(0, Math.min(b.r, o.r + g) - Math.max(b.l, o.l - g)) * Math.max(0, Math.min(b.b, o.b + g) - Math.max(b.t, o.t - g))
    let c = this.boxes.reduce((n, o) => o === own ? n : n + ov(o, GAP) + 100 * ov(o, 0), 0) + this.marks.reduce((n, o) => o === own ? n : n + 100 * ov(o, 1), 0) + this.soft.reduce((n, o) => n + ov(o, 1), 0)
    if (own)
      c += 100 * ov(own, 1)
    if (this.zeroY !== null)
      c += ov({ l: this.plot.l, r: this.plot.r, t: this.zeroY, b: this.zeroY }, GAP)
    return c
  }

  /** candidates: [x, baseline y, anchor]; x is clamped into the SVG; falls back to the first candidate */
  place(text: string, candidates: [number, number, string][], own: Box | null): Placed {
    const w = textWidth(text)
    const fitted = candidates.map(([x, y, a]): Placed => ({ 'x': Math.max(2, Math.min(anchoredLeft(x, a, w), this.width - 2 - w)), y, 'text-anchor': 'start' }))
    // first candidate that fits; otherwise the one with the least collision (overlap area, gap included)
    const p = fitted[this.pick(fitted.map(c => textBox(c.x, c.y, text)), own)]!
    this.occupy(textBox(p.x, p.y, text))
    return p
  }
}

/** follow-up: small boxes every CURVE_STEP px along a polyline (null = gap), so labels can avoid the curve */
export const CURVE_STEP = 3
const REL_PT_R = 2.5
export function curveBoxes(pts: (readonly [number, number] | null)[]): Box[] {
  const out: Box[] = []
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    if (!a || !b)
      continue
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / CURVE_STEP))
    for (let k = 0; k <= n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n
      const y = a[1] + ((b[1] - a[1]) * k) / n
      out.push({ l: x - 1, r: x + 1, t: y - 1, b: y + 1 })
    }
  }
  return out
}

/** follow-up (b): fixed placement of「你的金额」: centred directly above its marker (moved away in 7 px steps if taken); flipped below only when above is blocked, shifted inward at the plot edge */
export function userAbove(x: number, y: number, r: number): [number, number, string][] {
  const up = Array.from({ length: 21 }, (_, k) => 7 * k).map((d): [number, number, string] => [x, y - r - 6 - d, 'middle'])
  const down = Array.from({ length: 21 }, (_, k) => 7 * k).map((d): [number, number, string] => [x, y + r + 15 + d, 'middle'])
  // near the plot edge: same rows, starting / ending at the marker's x
  const side = [...up, ...down].flatMap(([, yy]): [number, number, string][] => [[x, yy, 'start'], [x, yy, 'end'], [x + r + 4, yy, 'start'], [x - r - 4, yy, 'end']])
  // last: beside the marker, on its level
  return [...up, ...down, ...side, [x + r + 4, y + 4, 'start'], [x - r - 4, y + 4, 'end']]
}

/** follow-up: last-resort candidates for crowded narrow charts: every 4 px baseline of the plot */
export const scanYs = (top: number, bottom: number): number[] => Array.from({ length: Math.max(0, Math.floor((bottom - top) / 4) + 1) }, (_, k) => top + 4 * k)
/** ... and the same baselines with the label shifted sideways in 20 px steps, nearest first */
export const scanAround = (x: number, top: number, bottom: number): [number, number, string][] =>
  [0, 20, -20, 40, -40, 60, -60, 80, -80, 100, -100, 120, -120, 140, -140, 160, -160].flatMap(sx => scanYs(top, bottom).map((y): [number, number, string] => [x + sx, y, 'middle']))

/** Candidate positions around a point (A.3): above (3 heights), below, left, right; slope side first. */
export function around(x: number, y: number, r: number, slope: 'start' | 'end' | 'middle'): [number, number, string][] {
  const dx = slope === 'middle' ? 0 : slope === 'end' ? -8 : 8
  const out: [number, number, string][] = []
  for (const gap of [10, 24, 38]) {
    out.push([x + dx, y - gap, slope])
    out.push([x, y - gap, 'middle'])
  }
  for (const gap of [10, 24]) {
    out.push([x + dx, y + gap + 9, slope])
    out.push([x, y + gap + 9, 'middle'])
  }
  out.push([x - r - 6, y + 4, 'end'], [x + r + 6, y + 4, 'start'])
  // sideways shifted rows for crowded narrow charts
  for (const gap of [10, 24, 38, 52, 66, 80]) {
    for (const sx of [40, -40, 80, -80, 120, -120, 160, -160])
      out.push([x + sx, y - gap, 'middle'], [x + sx, y + gap + 9, 'middle'])
    out.push([x + 6, y - gap, 'start'], [x + 6, y + gap + 9, 'start'], [x - 6, y - gap, 'end'], [x - 6, y + gap + 9, 'end'])
  }
  return out
}

/** follow-up (validator, PM): an annotation stays at its own marker: edge gap label → own marker ≤ ANN_MAX_GAP px */
/** chart width at a 320 px viewport (24 px page padding): only up to here may a kink label be left out */
export const OMIT_MAX_WIDTH = 296
export const ANN_MAX_GAP = 46
/** a vertical / sideways offset larger than this gets a short leader line back to the marker */
export const ANN_LEADER_FROM = 6
export interface Ann { lines: string[], x: number, y: number, anchor: 'start' | 'middle' | 'end', box: Box, gap: number, leader: [number, number, number, number] | null }
const boxGap = (a: Box, b: Box) => Math.hypot(Math.max(0, a.l - b.r, b.l - a.r), Math.max(0, a.t - b.b, b.t - a.b))
/** the same characters on two lines (split at the first space after the CJK part, else in the middle) */
export const splitLabel = (text: string): string[] | null => {
  const i = text.indexOf(' ')
  if (i > 0)
    return [text.slice(0, i), text.slice(i + 1)]
  const h = Math.floor(text.length / 2)
  return h > 0 ? [text.slice(0, h), text.slice(h)] : null
}

/**
 * Placement next to the own marker only: above, below, left or right of it (one line, or the same text on two lines),
 * edge gap ≤ ANN_MAX_GAP, inside `region`, clear of every text / tick / marker, and always nearer to the own marker
 * than to any of `rivals` (the other annotated markers). Curves may be crossed, but the spot crossing the least wins.
 * Returns null when no such spot exists (the caller then keeps the label out rather than detaching it).
 */
export function placeAnn(pl: Placer, text: string, own: Box, region: Box, rivals: Box[], spaceIdx = true, ignoreMarks?: ReadonlySet<Box>, ignoreBoxes?: ReadonlySet<Box>): Ann | null {
  const variants = [[text], ...(spaceIdx && splitLabel(text) ? [splitLabel(text)!] : [])]
  const cx = (own.l + own.r) / 2
  const cy = (own.t + own.b) / 2
  let best: { a: Ann, score: number } | null = null
  for (const lines of variants) {
    const w = Math.max(...lines.map(textWidth))
    // ascent 11 px above the baseline, 3 px below (same box as textBox and the tests)
    const h = 14 + CAP_LINE_DY * (lines.length - 1)
    const tops: number[] = []
    const lefts: number[] = []
    for (let g = 2; g <= ANN_MAX_GAP; g += 2) {
      tops.push(own.t - g - h, own.b + g) // above / below
      lefts.push(own.l - g - w, own.r + g) // left / right
    }
    const boxes: Box[] = []
    for (const t of tops) {
      for (let d = 0; d <= w / 2 + ANN_MAX_GAP; d += 2) {
        for (const l of d ? [cx - w / 2 - d, cx - w / 2 + d] : [cx - w / 2]) boxes.push({ l, r: l + w, t, b: t + h })
      }
    }
    for (const l of lefts) {
      for (let d = 0; d <= h / 2 + ANN_MAX_GAP; d += 2) {
        for (const t of d ? [cy - h / 2 - d, cy - h / 2 + d] : [cy - h / 2]) boxes.push({ l, r: l + w, t, b: t + h })
      }
    }
    for (const b of boxes) {
      if (b.l < region.l || b.r > region.r || b.t < region.t || b.b > region.b)
        continue
      // the gap is measured to the inked part of the text (the layout box has ascent / descent / width slack)
      const gap = boxGap({ l: b.l, r: b.r, t: b.t + 3, b: b.b - 3 }, own)
      if (gap > ANN_MAX_GAP || !pl.hardOk(b, own, ignoreMarks, ignoreBoxes) || !rivals.every(o => boxGap(b, o) >= gap + 4))
        continue
      const relHits = ignoreMarks ? [...ignoreMarks].filter(o => !apart(b, o, 1)).length : 0
      const soft = pl.softCost(b)
      const score = gap + (lines.length > 1 ? 12 : 0) + 4 * soft + (b.b <= own.t ? 0 : 3) + 40 * relHits
      if (!best || score < best.score) {
        // anchored on the side facing the marker, so a narrower real text still hugs its marker
        const mid = (b.l + b.r) / 2
        const anchor = Math.abs(mid - cx) < 1 ? 'middle' : mid < cx ? 'end' : 'start'
        const x = anchor === 'middle' ? mid : anchor === 'end' ? b.r : b.l
        const y = b.t + 11
        let leader: Ann['leader'] = null
        if (gap > ANN_LEADER_FROM) { // from the marker edge to the nearest point of the label box
          const px = Math.max(b.l, Math.min(cx, b.r))
          const py = Math.max(b.t, Math.min(cy, b.b))
          const len = Math.hypot(px - cx, py - cy)
          const rad = (own.r - own.l) / 2 + 1
          leader = [cx + ((px - cx) * rad) / len, cy + ((py - cy) * rad) / len, px - ((px - cx) * 2) / len, py - ((py - cy) * 2) / len]
        }
        best = { a: { lines, x, y, anchor, box: b, gap, leader }, score }
      }
    }
  }
  if (best)
    pl.occupy(best.a.box)
  return best?.a ?? null
}

/** draws a placed annotation (one or two lines, plus its leader) into g */
export function drawAnn(g: Element, a: Ann, cls?: string): void {
  if (a.leader)
    g.append(el('line', { 'x1': a.leader[0], 'y1': a.leader[1], 'x2': a.leader[2], 'y2': a.leader[3], 'class': 'ann-leader' }))
  const tx = el('text', { 'x': a.x, 'y': a.y, 'text-anchor': a.anchor, ...(cls ? { class: cls } : {}) }, a.lines.length === 1 ? a.lines[0] : undefined)
  if (a.lines.length > 1)
    a.lines.forEach((ln, k) => tx.append(el('tspan', { x: a.x, y: a.y + k * CAP_LINE_DY }, ln)))
  g.append(tx)
}

/** axis label number in de-DE style with a real minus sign (U+2212) for negatives */
export const axisNumber = (v: number, digits = 0) => formatNumberDe(v, digits).replace(/^[-\u2212]/, '\u2212')

/** Frame shared by both charts: title, legend, grid + both tick columns, axis titles. Returns the placer. */
export function frame(svg: SVGSVGElement, a: Axes & { top: number }, o: { width: number, height: number, title: StrKey, xAxis: StrKey, extraBottom?: number }): Placer {
  const { width, height } = o
  const bottom = height - PAD.bottom - (o.extraBottom ?? 0)
  const pl = new Placer(width, height, a.y(0), { l: PAD.left, r: width - PAD.right })
  svg.append(el('text', { ...pl.fixed(0, 13, 'start', t(o.title)), class: 'title' }, t(o.title)))
  // legend: solid = € (left), dashed = % (right); may wrap to a second row on narrow screens
  const lg = el('g', { 'class': 'legend', 'data-testid': 'chart-legend' })
  for (const it of legendLayout(width)) {
    lg.append(el('line', { 'x1': it.x, 'x2': it.x + 16, 'y1': it.y - 4, 'y2': it.y - 4, 'class': `${it.cls} sample`, ...(it.cls === 'rel' ? { 'stroke-dasharray': '5 3' } : {}) }))
    lg.append(el('text', pl.fixed(it.x + 20, it.y, 'start', t(it.key)), t(it.key)))
    pl.occupy({ l: it.x, r: it.x + 16, t: it.y - 6, b: it.y - 2 })
  }
  svg.append(lg)
  for (const v of a.ticks) {
    svg.append(el('line', { x1: PAD.left, x2: width - PAD.right, y1: a.y(v), y2: a.y(v), class: v === 0 ? 'zero' : 'grid' }))
    const sl = axisNumber(v)
    // centred on its grid line (also the lowest one: the first x-label row sits X_ROW0_DY below the plot)
    svg.append(el('text', pl.fixed(PAD.left - 4, a.y(v) + 4, 'end', sl), sl))
  }
  const rg = el('g', { 'class': 'axis-right', 'data-testid': 'chart-axis-right' })
  for (const v of a.ticksR) {
    // no tick marks: a dash touching the number read as a minus sign; the grid lines give the position
    const s = `${axisNumber(v, Number.isInteger(v) ? 0 : 2)} %` // stage 5 (5): percentages with decimals use exactly 2
    rg.append(el('text', pl.fixed(width - PAD.right + 6, a.yR(v) + 4, 'start', s), s))
  }
  svg.append(rg)
  svg.append(el('text', pl.fixed(PAD.left + (width - PAD.left - PAD.right) / 2, height - 6, 'middle', t(o.xAxis)), t(o.xAxis)))
  // rotated axis titles: vertical boxes
  const mid = (a.top + bottom) / 2
  const vbox = (cx: number, text: string) => pl.occupy({ l: cx - 9, r: cx + 5, t: mid - textWidth(text) / 2, b: mid + textWidth(text) / 2 })
  svg.append(el('text', { 'x': 0, 'y': 0, 'text-anchor': 'middle', 'transform': `translate(12 ${mid}) rotate(-90)` }, t('chartYAxis')))
  vbox(12, t('chartYAxis'))
  svg.append(el('text', { 'x': 0, 'y': 0, 'text-anchor': 'middle', 'class': 'axis-title-right', 'transform': `translate(${width - RIGHT_TITLE_INSET} ${mid}) rotate(90)` }, t('chartYAxisRight')))
  vbox(width - RIGHT_TITLE_INSET, t('chartYAxisRight'))
  return pl
}

/** dashed relative line, broken at null points (B.3); hollow circles so it is not told apart by colour only */
export function relLine(svg: SVGSVGElement, xs: number[], rel: (number | null)[], yR: (v: number) => number, ids: string[]): void {
  const g = el('g', { 'class': 'rel-series', 'data-testid': 'chart-rel' })
  let seg: string[] = []
  const flush = () => {
    if (seg.length > 1)
      g.append(el('polyline', { 'points': seg.join(' '), 'class': 'rel', 'stroke-dasharray': '5 3' }))
    seg = []
  }
  rel.forEach((v, i) => {
    if (v === null)
      return flush()
    seg.push(`${xs[i]},${yR(v)}`)
    g.append(el('circle', { 'cx': xs[i]!, 'cy': yR(v), 'r': REL_PT_R, 'class': 'rel-pt', 'data-testid': `chart-rel-pt-${ids[i]}` }))
  })
  flush()
  svg.append(g)
}

export const slopeOf = (ys: number[], i: number): 'start' | 'end' | 'middle' => {
  const y = ys[i]!
  const prev = ys[i - 1] ?? y
  const next = ys[i + 1] ?? y
  if (y <= prev && y <= next)
    return 'middle'
  return next < prev ? 'end' : 'start'
}

/** x-label layout of the B chart (shared by drawChart and mainChartHeight, so the reserved height is exactly the drawn one) */
function xLayout(rows: CmpRow[], width: number, mustKeep: readonly number[]) {
  const g = geometry(rows, width)
  const narrow = width < 400
  // x labels (stage 5 (4) + follow-up): all fitting ticks stay; the amounts the summary names (mustKeep) never go
  const cand: { s: string, user: boolean, label: XLabel }[] = []
  rows.forEach((r, i) => {
    if ((!narrow || NARROW_TICKS.includes(r.amount) || mustKeep.includes(r.amount)) && (r.tier || !narrow)) {
      const s = formatNumberDe(r.amount, Number.isInteger(r.amount) ? 0 : 2)
      cand.push({ s, user: !r.tier, label: { tick: g.xs[i]!, w: textWidth(s), must: !!r.tier && mustKeep.includes(r.amount), ...(r.tier ? {} : { yields: true }) } })
    }
  })
  // the user amount (not a tier) has its own「你的金额」label, so it is the first to give way: placed after the tiers
  const tiersFirst = [...cand.filter(c => !c.user), ...cand.filter(c => c.user)]
  // stage 5 (b): end at least X_LABEL_GAP px before the right-axis label column (labels start at width − PAD.right + 6)
  const placed = placeLabels(tiersFirst.map(c => c.label), { minL: 2, maxR: width - PAD.right + 6 - X_LABEL_GAP, rows: 7 })
  const extra = Math.max(0, ...placed.map(p => p.row)) * X_ROW2_DY
  return { g, tiersFirst, placed, extra }
}

/** follow-up: reserved height when the box has no width yet (the tallest chart: chartHeight ≤ 320 px) */
export const FALLBACK_CHART_HEIGHT = 320

/**
 * follow-up: empty SVG that holds the chart box at the precomputed height until the chart replaces it.
 * Height via the SVG height attribute only (no style attribute, no CSSOM: CSP style-src 'self').
 */
export function chartPlaceholder(height: number): SVGSVGElement {
  return el('svg', { 'width': '100%', 'height': height, 'aria-hidden': 'true', 'class': 'cmp3-svg cmp3-placeholder', 'focusable': 'false' })
}

/** follow-up: SVG height of the B chart, computed before drawing (the chart box reserves exactly this) */
export function mainChartHeight(rows: CmpRow[], width: number, mustKeep: readonly number[] = []): number {
  const { g, extra } = xLayout(rows, width, mustKeep)
  return g.height + extra
}

export function drawChart(rows: CmpRow[], width: number, mustKeep: readonly number[] = []): SVGSVGElement {
  const { g, tiersFirst, placed, extra } = xLayout(rows, width, mustKeep)
  const bottom = g.height - PAD.bottom
  const height = g.height + extra
  const svg = el('svg', { 'width': g.width, 'height': height, 'viewBox': `0 0 ${g.width} ${height}`, 'aria-hidden': 'true', 'class': 'cmp3-svg', 'focusable': 'false', 'data-plot': `${PAD.left} ${g.top} ${width - PAD.right} ${bottom}` })
  const pl = frame(svg, g, { width, height, title: 'chartTitle', xAxis: 'chartXAxis', extraBottom: extra })
  const ys = rows.map(r => g.y(r.diff))
  const leaders: SVGLineElement[] = []
  const xl: SVGTextElement[] = placed.sort((p, q) => tiersFirst[p.i]!.label.tick - tiersFirst[q.i]!.label.tick).map((p) => {
    const c = tiersFirst[p.i]!
    const y = bottom + X_ROW0_DY + p.row * X_ROW2_DY
    pl.occupy(textBox(p.l, y, c.s))
    if (p.row > 0) // follow-up: stacked label → short leader from the axis down to the label, at its tick
      leaders.push(el('line', { 'x1': c.label.tick, 'x2': c.label.tick, 'y1': bottom + 2, 'y2': y - 11, 'class': 'xl-leader', 'data-tick': c.label.tick }))
    return el('text', { 'x': p.l, 'y': y, 'text-anchor': 'start', 'class': c.user ? 'xl user' : 'xl', 'data-tick': c.label.tick }, c.s)
  })
  // follow-up: annotations keep clear of both curves (sampled) and of every marker, so these are occupied first
  const isKink = (r: CmpRow) => r.tier && (r.amount === 360 || r.amount === 1800)
  const own = rows.map((r, i): Box => {
    const rad = r.user ? 6 : isKink(r) ? 5 : 3
    return { l: g.xs[i]! - rad, r: g.xs[i]! + rad, t: ys[i]! - rad, b: ys[i]! + rad }
  })
  for (const b of own) pl.occupyMark(b)
  const relPts = rows.map((r, i) => r.rel === null ? null : [g.xs[i]!, g.yR(r.rel)] as const)
  for (const b of curveBoxes(g.xs.map((x, i) => [x, ys[i]!] as const))) pl.occupySoft(b)
  for (const b of curveBoxes(relPts)) pl.occupySoft(b)
  const relMarks = new Set<Box>()
  for (const q of relPts) { // dashed-curve markers
    if (q) {
      const b = { l: q[0] - REL_PT_R, r: q[0] + REL_PT_R, t: q[1] - REL_PT_R, b: q[1] + REL_PT_R }
      relMarks.add(b)
      pl.occupyMark(b)
    }
  }
  // 6.840 € dashed line; its label goes where it fits (bottom, then top, either side)
  const i6840 = rows.findIndex(r => r.amount === ONE_CONTRACT_CAP)
  // validator follow-up: kink labels and「你的金额」 stay at their own marker (placeAnn); placed before the 6.840 label,
  // which may go anywhere along its line. The dashed 6.840 line is kept clear of annotations.
  const capLineBox = i6840 >= 0 ? { l: g.xs[i6840]! - 1, r: g.xs[i6840]! + 1, t: g.top, b: bottom } : null
  if (capLineBox)
    pl.occupy(capLineBox)
  // the cap label: anns first; when the cap label then finds no clear spot, the cap label goes first
  const placeCap = (nth?: number): { m: Element, free: boolean, hard: boolean } | null => {
    if (i6840 >= 0) {
      const x = g.xs[i6840]!
      const m = el('g', { 'data-testid': 'cmp3-marker-6840' })
      m.append(el('line', { 'x1': x, 'x2': x, 'y1': g.top, 'y2': bottom, 'stroke-dasharray': '4 3', 'class': 'cap' }))
      const capLine = capLineBox!
      const text = t('chartCap')
      const cands: [number, number, string][] = []
      for (const y of [bottom - 8, g.top + 12, bottom - 24, g.top + 28, (g.top + bottom) / 2])
        cands.push([x - 8, y, 'end'], [x + 8, y, 'start'])
      for (const d of [8, 28, 48, 68, 88, 108, 128, 148, 168, 188, 208]) {
        for (const y of scanYs(g.top + 12, bottom - 4))
          cands.push([x - d, y, 'end'], [x + d, y, 'start'])
      }
      // follow-up: one line where it fits, else the same words on two lines (narrow charts); free spots first,
      // then spots clear of every text that cross the least curve, one line before two
      const lines = [text.slice(0, Math.floor(text.length / 2)), text.slice(Math.floor(text.length / 2))]
      const w2 = Math.max(...lines.map(textWidth))
      const w1 = textWidth(text)
      const opts: { x: number, y: number, two: boolean, box: Box }[] = []
      for (const [cx, y, an] of cands) {
        const lx = Math.max(2, an === 'end' ? cx - w1 : cx)
        if (lx + w1 <= width - 2)
          opts.push({ x: lx, y, two: false, box: textBox(lx, y, text) })
      }
      const y2s = [bottom - 8 - CAP_LINE_DY, g.top + 12, bottom - 24 - CAP_LINE_DY, g.top + 28, (g.top + bottom) / 2, g.top + 44, bottom - 40 - CAP_LINE_DY]
      // two lines: 4 px steps sideways (crowded narrow charts leave only small gaps)
      for (let d = 8; d <= 228; d += 4) {
        for (const y of [...(d === 8 ? y2s : []), ...scanYs(g.top + 12, bottom - 4 - CAP_LINE_DY)]) {
          for (const lx of [x - d - w2, x + d]) {
            if (lx >= 2 && lx + w2 <= width - 2)
              opts.push({ x: lx, y, two: true, box: { l: lx, r: lx + w2, t: y - 11, b: y + CAP_LINE_DY + 3 } })
          }
        }
      }
      let p: typeof opts[number]
      if (nth === undefined) {
        const freeOne = opts.findIndex(o => !o.two && pl.ok(o.box, capLine))
        p = opts[freeOne >= 0 ? freeOne : pl.pick(opts.map(o => o.box), capLine)]!
      }
      else { // the nth spot clear of every text and marker: clear of curves first, then by the curve covered
        const hardOnes = opts.filter(o => pl.hardOk(o.box, capLine))
        const ranked = [...hardOnes.filter(o => pl.ok(o.box, capLine)), ...hardOnes.filter(o => !pl.ok(o.box, capLine)).sort((a, b) => pl.softCost(a.box) - pl.softCost(b.box))]
        if (nth >= ranked.length)
          return null
        p = ranked[nth]!
      }
      const free = pl.ok(p.box, capLine)
      const hard = pl.hardOk(p.box, capLine)
      pl.occupy(p.box)
      if (!p.two) {
        m.append(el('text', { 'x': p.x, 'y': p.y, 'text-anchor': 'start' }, text))
      }
      else {
        const tx = el('text', { 'x': p.x, 'y': p.y, 'text-anchor': 'start', 'class': 'cap-label' })
        ;lines.forEach((ln, k) => tx.append(el('tspan', { x: p.x, y: p.y + k * CAP_LINE_DY }, ln)))
        m.append(tx)
      }
      return { m, free, hard }
    }
    return null
  }

  const placeAnns = (only?: 'user' | 'kinks'): Map<string, Ann | null> => {
    const annIdx = rows.map((r, i) => (r.user || isKink(r)) ? i : -1).filter(i => i >= 0)
    const plotBox: Box = { l: PAD.left, r: width - PAD.right, t: g.top, b: bottom }
    // try the user label first, then the kinks first; the first attempt that places every label wins (else the one
    // with fewest labels left out)
    // one item per label: a user amount that sits on a kink keeps both labels (user + kink)
    const items = [...annIdx.filter(i => rows[i]!.user).map(i => ({ i, user: true })), ...annIdx.filter(i => isKink(rows[i]!)).map(i => ({ i, user: false }))]
      .filter(it => !only || it.user === (only === 'user'))
    const key = (it: { i: number, user: boolean }) => `${it.user ? 'u' : 'k'}${it.i}`
    const userFirst = [...items.filter(it => it.user), ...items.filter(it => !it.user)]
    const kinksFirst = [...items.filter(it => !it.user), ...items.filter(it => it.user)]
    const n0 = pl.boxes.length
    let anns = new Map<string, Ann | null>()
    for (const order of [userFirst, kinksFirst]) {
      pl.boxes.length = n0
      const tryAnns = new Map<string, Ann | null>()
      for (const it of order) {
        const i = it.i
        const r = rows[i]!
        const text = it.user ? t('cmp3UserTag') : t('chartKink', { a: formatNumberDe(r.amount) })
        // 「你的金额」 fully inside the plot: the rendered text box is ~1.5 px taller (top and bottom) and may be ~1 px
        // wider than the layout box, so the region is inset by that much
        const region = it.user ? { l: plotBox.l + 1, r: plotBox.r - 1, t: plotBox.t + 1.5, b: plotBox.b - 1.5 } : { l: 2, r: width - 2, t: 2, b: bottom }
        const rivals = annIdx.filter(j => j !== i && g.xs[j] !== g.xs[i]).map(j => own[j]!)
        // PM exception: 「你的金额」 may cross the dashed 6.840 line (never a text or marker) when it has no other spot
        tryAnns.set(key(it), placeAnn(pl, text, own[i]!, region, rivals, true) ?? (it.user && capLineBox ? placeAnn(pl, text, own[i]!, region, rivals, true, undefined, new Set([capLineBox])) : null))
      }
      const miss = (m: Map<string, Ann | null>) => [...m.values()].filter(a => !a).length
      if (anns.size === 0 || miss(tryAnns) < miss(anns))
        anns = tryAnns
      if (miss(tryAnns) === 0)
        break
    }
    // re-occupy the winning boxes (the loop may have ended on another attempt)
    pl.boxes.length = n0
    for (const a of anns.values()) {
      if (a)
        pl.occupy(a.box)
    }
    return anns
  }

  // four orders: labels then cap label; cap label then labels; your label / cap label / kink labels; kink labels /
  // cap label / your label. The winner never drops your label, then keeps the cap label off texts and markers, then (wider than
  // OMIT_MAX_WIDTH) every kink label, then leaves out the fewest kink labels, then keeps the cap label off
  // curves (first order wins ties)
  const nStart = pl.boxes.length
  const orders: (() => { anns: Map<string, Ann | null>, cap: ReturnType<typeof placeCap> })[] = [
    () => { const anns = placeAnns(); return { anns, cap: placeCap() } },
    () => { const cap = placeCap(); return { anns: placeAnns(), cap } },
    () => { const u = placeAnns('user'); const cap = placeCap(); return { anns: new Map([...u, ...placeAnns('kinks')]), cap } },
    () => { const k = placeAnns('kinks'); const cap = placeCap(); return { anns: new Map([...k, ...placeAnns('user')]), cap } },
  ]
  const rank = ({ anns, cap }: ReturnType<typeof orders[number]>) => {
    const miss = [...anns].filter(([, a]) => !a).map(([k]) => k)
    // PM exception:「你的金额」 across the dashed line only when nothing else works
    const crossed = capLineBox && [...anns].some(([k, a]) => k[0] === 'u' && a && !apart(a.box, capLineBox, GAP))
    return (miss.some(k => k[0] === 'u') ? 1e8 : 0) + (cap && !cap.hard ? 1e7 : 0) + (crossed ? 3e6 : 0) + (width <= OMIT_MAX_WIDTH ? 100 : 1e4) * miss.length + (cap && !cap.free ? 1 : 0)
  }
  let bestOrder = 0
  let bestRank = Infinity
  for (let k = 0; k < orders.length; k++) {
    pl.boxes.length = nStart
    const o = orders[k]!()
    const r = rank(o)
    if (r < bestRank) {
      bestRank = r
      bestOrder = k
    }
    if (r === 0)
      break
  }
  // still no clear layout: the cap label tries its next clear spots before the other labels are placed
  const nthOrders = (n: number) => [
    () => ({ cap: placeCap(n), anns: placeAnns() }),
    () => { const u = placeAnns('user'); const cap = placeCap(n); return { anns: new Map([...u, ...placeAnns('kinks')]), cap } },
    () => { const k = placeAnns('kinks'); const cap = placeCap(n); return { anns: new Map([...k, ...placeAnns('user')]), cap } },
  ]
  for (let n = 0; bestRank >= 100 && n < 80; n++) {
    let any = false
    for (const f of nthOrders(n)) {
      pl.boxes.length = nStart
      const o = f()
      if (!o.cap)
        continue
      any = true
      const r = rank(o)
      if (r < bestRank) {
        bestRank = r
        orders.push(f)
        bestOrder = orders.length - 1
      }
    }
    if (!any)
      break
  }
  pl.boxes.length = nStart
  const { anns, cap } = orders[bestOrder]!()
  const capMarker = cap?.m ?? null

  if (capMarker)
    svg.append(capMarker)
  svg.append(el('polyline', { points: g.xs.map((x, i) => `${x},${ys[i]}`).join(' '), class: 'line' }))
  relLine(svg, g.xs, rows.map(r => r.rel), g.yR, rows.map(r => amountId(r.amount)))
  rows.forEach((r, i) => {
    const x = g.xs[i]!
    const y = ys[i]!
    const id = amountId(r.amount)
    const pt = el('g', { 'data-testid': `cmp3-point-${id}` })
    pt.append(el('circle', { cx: x, cy: y, r: r.user ? 6 : 3, class: r.user ? 'pt user' : 'pt' }))
    const a = anns.get(`u${i}`)
    if (r.user && a)
      drawAnn(pt, a, 'user-label')
    svg.append(pt)
    if (isKink(r)) {
      const m = el('g', { 'data-testid': `cmp3-marker-${r.amount}` })
      m.append(el('rect', { x: x - 5, y: y - 5, width: 10, height: 10, class: 'kink' }))
      const ak = anns.get(`k${i}`)
      if (ak)
        drawAnn(m, ak)
      svg.append(m)
    }
  })
  // labels without a valid spot next to their marker are left out (and listed here for tests / reports)
  svg.setAttribute('data-unplaced', [...anns].filter(([, a]) => !a).map(([k]) => k[0] === 'u' ? 'user' : String(rows[Number(k.slice(1))]!.amount)).join(' '))
  svg.append(...leaders, ...xl)
  return svg
}
