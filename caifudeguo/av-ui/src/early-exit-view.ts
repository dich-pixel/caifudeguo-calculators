/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Based on finanzfluss/calculators (AGPL-3.0). Licensed under AGPL-3.0-only.
 *
 * Stage 5 C view (PLAN_stage5.md C.4, C.5): heading, disclaimer (always), two summary lines, a collapsible region
 * with the assumptions, the single-only notices, a dual-axis chart (x = age), a wide table (≥ 1000 px) and cards
 * (< 1000 px; 4 values, the rest in a <details>「明细」). All numbers come from early-exit.ts; no inline styles.
 */
import type { EarlyExit, ExitPoint } from './early-exit'
import type { FormValues, Result } from './model'
import type { StrKey } from './strings'
import { avDepot } from '../../../src/calculators/av-depot'
import { axes, el, frame, PAD, plotTop, relLine, textBox, textWidth, X_LABEL_GAP } from './chart'
import { relText } from './cmp3'
import { h, txt } from './dom'
import { earlyExit } from './early-exit'
import { formatEuro } from './format'
import { t } from './strings'

const num = (s: string) => h('span', { class: 'num' }, s)
const eur = (v: number) => num(formatEuro(v))
const signed = (v: number) => `${v > 0 ? '+' : ''}${formatEuro(v)}`

export function eeChartHeight(width: number): number {
  return Math.round(Math.min(300, Math.max(200, width * 0.4)))
}

/** Dual-axis chart: x = age at withdrawal (proportional), solid = diff (€), dashed = rel (%). */
export function drawEarlyChart(e: EarlyExit, width: number): SVGSVGElement {
  const height = eeChartHeight(width)
  const narrow = width < 400
  const pts = e.points
  const t0 = plotTop(width) // same legend rows as the B chart
  const bottom = height - PAD.bottom
  const a = { ...axes(pts.map(p => p.diff), pts.map(p => p.rel), t0, bottom, narrow), top: t0 }
  const svg = el('svg', { 'width': width, 'height': height, 'viewBox': `0 0 ${width} ${height}`, 'aria-hidden': 'true', 'class': 'cmp3-svg ee-svg', 'focusable': 'false' })
  const pl = frame(svg, a, { width, height, title: 'eeChartTitle', xAxis: 'eeChartXAxis' })
  const inner = width - PAD.left - PAD.right
  const a0 = pts[0]!.age
  const a1 = pts[pts.length - 1]!.age
  const xs = pts.map(p => PAD.left + (a1 === a0 ? inner / 2 : ((p.age - a0) / (a1 - a0)) * inner))
  // x labels = ages; a label that would come closer than 4 px to the previous one is skipped
  let lastR = -Infinity
  const xl: SVGTextElement[] = []
  pts.forEach((p, i) => {
    const s = String(p.age)
    const w = textWidth(s)
    const x = Math.max(2, Math.min(xs[i]! - w / 2, width - PAD.right + 6 - X_LABEL_GAP - w)) // stage 5 (b): clear of the right-axis labels
    if (x < lastR + 4 && i !== pts.length - 1)
      return
    if (x < lastR + 4)
      xl.pop()
    pl.occupy(textBox(x, bottom + 14, s))
    xl.push(el('text', { 'x': x, 'y': bottom + 14, 'text-anchor': 'start', 'class': 'xl', 'data-testid': `ee-xl-${p.year}` }, s))
    lastR = x + w
  })
  svg.append(el('polyline', { points: xs.map((x, i) => `${x},${a.y(pts[i]!.diff)}`).join(' '), class: 'line' }))
  pts.forEach((p, i) => svg.append(el('circle', { 'cx': xs[i]!, 'cy': a.y(p.diff), 'r': 3, 'class': 'pt', 'data-testid': `ee-point-${p.year}` })))
  relLine(svg, xs, pts.map(p => p.rel), a.yR, pts.map(p => String(p.year)))
  svg.append(...xl)
  return svg
}

const when = (p: ExitPoint) => t('eeWhenCell', { n: p.year, age: p.age })

/** detail lines of one point: [label key, value, extra small print] */
function details(e: EarlyExit, p: ExitPoint): [StrKey, string, StrKey | null][] {
  const out: [StrKey, string, StrKey | null][] = [
    ['eeAvBalance', formatEuro(p.avBalance), null],
    ['eeZulagen', formatEuro(-p.zulagen), null],
    ['eeTaxSaving', formatEuro(-p.taxSaving), null],
  ]
  if (e.mode === 'consume')
    out.push(['eeReceived', formatEuro(p.received), null])
  out.push([p.half ? 'eeAvTaxableHalf' : 'eeAvTaxable', formatEuro(p.taxableGain), null])
  out.push(['eeAvTax', formatEuro(-p.avTax), 'eeNoFuenftel'])
  out.push(['eeNormalBalance', formatEuro(p.normalBalance), null])
  out.push(['eeNormalVorab', formatEuro(p.normalVorab), null])
  out.push(['eeNormalTaxable', formatEuro(p.normalTaxable), null])
  out.push(['eeNormalTax', formatEuro(-p.normalTax), null])
  return out
}
const hasSec = (e: EarlyExit) => e.points.some(p => p.secBalance > 0)
/** stage 5 table fix: the side account as a group row (eeSecLabel) + three rows reusing the result-table labels gross/tax/net */
const SEC_PARTS: [StrKey, string, (p: ExitPoint) => number][] = [
  ['gross', 'gross', p => p.secBalance],
  ['tax', 'tax', p => -p.secTax],
  ['net', 'net', p => p.secBalance - p.secTax],
]

/** wide table (≥ 1000 px): one column per point */
export function wideTable(e: EarlyExit): HTMLElement {
  const head = h('tr', {}, h('th', { scope: 'col' }, t('eeColWhen')), ...e.points.map(p => h('th', { 'scope': 'col', 'data-testid': `ee-col-${p.year}` }, when(p))))
  const line = (label: Node | string, cls: string, cells: (p: ExitPoint) => Node | string, extra = '') =>
    h('tr', { class: extra ? `${cls} ${extra}` : cls }, h('th', { scope: 'row' }, label), ...e.points.map(p => h('td', { 'data-testid': `ee-${cls}-${p.year}` }, cells(p))))
  const rows: HTMLElement[] = []
  const d0 = e.points.length ? details(e, e.points[0]!) : []
  d0.forEach(([key, , small], k) => {
    const label = small ? h('span', {}, t(key), txt('span', small, { class: 'small' })) : t(key)
    rows.push(line(label, `d${k}`, p => num(details(e, p)[k]![1])))
  })
  if (hasSec(e))
    rows.splice(e.mode === 'consume' ? 6 : 5, 0, line(t('eeSecLabel'), 'sec', () => ''), ...SEC_PARTS.map(([key, cls, v]) => line(t(key), `sec-${cls}`, p => num(formatEuro(v(p))), 'sub')))
  rows.push(line(t('eeColAvNet'), 'av', p => eur(p.avNet)))
  rows.push(line(t('eeColNormalNet'), 'normal', p => eur(p.normalNet)))
  rows.push(line(t('eeColDiff'), 'diff', p => num(signed(p.diff))))
  rows.push(line(t('eeColRel'), 'rel', p => p.rel === null ? t('dash') : num(relText(p.rel))))
  return h('table', { 'class': 'ee-table', 'data-testid': 'ee-table' }, h('thead', {}, head), h('tbody', {}, ...rows))
}

/** cards (< 1000 px): 4 values visible, everything else in「明细」 */
export function cards(e: EarlyExit): HTMLElement {
  const card = (p: ExitPoint) => {
    const item = (key: StrKey, cls: string, v: Node | string) => h('div', { 'class': `ee-item ${cls}`, 'data-testid': `ee-card-${cls}-${p.year}` }, h('dt', {}, t(key)), h('dd', {}, v))
    const extra = details(e, p).map(([key, v, small]) => h('div', { class: 'ee-item' }, h('dt', {}, t(key), small ? txt('span', small, { class: 'small' }) : null), h('dd', {}, num(v))))
    if (hasSec(e))
      extra.push(h('div', { class: 'ee-item sec' }, h('dt', {}, t('eeSecLabel'))), ...SEC_PARTS.map(([key, cls, v]) => h('div', { 'class': 'ee-item sub', 'data-testid': `ee-card-sec-${cls}-${p.year}` }, h('dt', {}, t(key)), h('dd', {}, num(formatEuro(v(p)))))))
    return h('li', { 'class': 'ee-card', 'data-testid': `ee-card-${p.year}` },
      h('h3', {}, when(p)),
      h('dl', { class: 'ee-main' },
        item('eeColAvNet', 'av', eur(p.avNet)),
        item('eeColNormalNet', 'normal', eur(p.normalNet)),
        item('eeColDiff', 'diff', num(signed(p.diff))),
        item('eeColRel', 'rel', p.rel === null ? t('dash') : num(relText(p.rel)))),
      h('details', { 'class': 'ee-details', 'data-testid': `ee-details-${p.year}` }, txt('summary', 'eeDetails'), h('dl', {}, ...extra)),
    )
  }
  return h('ul', { 'class': 'ee-cards', 'data-testid': 'ee-cards' }, ...e.points.map(card))
}

const ASSUME: StrKey[] = ['eeAssume1', 'eeAssume2', 'eeAssume3', 'eeAssume4', 'eeAssume5', 'eeAssume6']

/** region content (without the chart box) */
export function regionContent(e: EarlyExit): HTMLElement[] {
  const notes: (StrKey | null)[] = [
    e.points.some(p => p.rel === null) ? 'relOmittedEarly' : null,
    e.mode === 'consume' ? 'consumeRefundNote' : null,
  ]
  return [
    wideTable(e),
    cards(e),
    ...notes.filter((k): k is StrKey => k !== null).map(k => txt('p', k, { class: 'help' })),
  ]
}

export function summaryLines(e: EarlyExit): HTMLElement[] {
  if (!e.points.length)
    return [txt('p', 'eeNoPoints')]
  const pts = [e.points[0]!, e.points[e.points.length - 1]!].filter((p, i, a) => a.indexOf(p) === i)
  return pts.map(p => txt('p', 'eeSummary', { 'data-testid': `ee-summary-${p.year}` }, { n: p.year, age: p.age, av: formatEuro(p.avNet), normal: formatEuro(p.normalNet), d: signed(p.diff), rel: relText(p.rel) }))
}

export interface EarlyExitView {
  section: HTMLElement
  /** short summary placed directly below the overall result footnotes (heading, disclaimer, one line per age, link down) */
  brief: HTMLElement
  update: (values: FormValues, main: { result: Result, coreInput: Record<string, unknown> } | null) => void
}

export function createEarlyExit(): EarlyExitView {
  const summary = h('div', { 'class': 'ee-summary', 'data-testid': 'ee-summary', 'aria-live': 'polite' })
  const region = h('div', { 'id': 'ee-region', 'class': 'ee-region', 'hidden': true })
  const toggle = txt('button', 'eeToggle', { 'type': 'button', 'class': 'toggle', 'aria-expanded': 'false', 'aria-controls': 'ee-region' })
  const brief = h('div', { 'class': 'ee-brief', 'role': 'group', 'aria-labelledby': 'ee-brief-h', 'data-testid': 'ee-brief' },
    h('h2', { id: 'ee-brief-h' }, txt('span', 'eeHeading'), ' ', txt('span', 'eeSingle', { class: 'tag' })),
    txt('p', 'eeDisclaimer', { class: 'ee-disclaimer' }),
    summary,
    h('p', { class: 'ee-more' }, txt('a', 'eeMore', { 'href': '#ee', 'data-testid': 'ee-more' })),
  )
  const section = h('section', { 'id': 'ee', 'class': 'cmp3 ee', 'aria-labelledby': 'ee-h', 'data-testid': 'ee' },
    h('h2', { id: 'ee-h' }, txt('span', 'eeDetailHeading'), ' ', txt('span', 'eeSingle', { class: 'tag' })),
    toggle,
    region,
  )
  let data: EarlyExit | null = null
  let observer: ResizeObserver | undefined
  const open = () => toggle.getAttribute('aria-expanded') === 'true'
  toggle.addEventListener('click', () => {
    const o = !open()
    toggle.setAttribute('aria-expanded', String(o))
    region.hidden = !o
    if (o)
      render()
    else region.replaceChildren()
  })

  function render() {
    observer?.disconnect()
    if (!open())
      return
    const fixed: HTMLElement[] = [
      h('div', { class: 'ee-assumptions' }, txt('p', 'eeAssumptionsHead'), h('ol', {}, ...ASSUME.map(k => txt('li', k)))),
      txt('p', 'singleOnlyFootnote', { class: 'help' }),
      txt('p', 'spouseOnlyNotice', { class: 'help' }),
    ]
    if (!data) {
      region.replaceChildren(...fixed, txt('p', 'eeInvalid'))
      return
    }
    if (!data.points.length) {
      region.replaceChildren(...fixed, txt('p', 'eeNoPoints'))
      return
    }
    const e = data
    const box = h('div', { class: 'cmp3-chart-box' })
    let lastWidth = Math.floor(region.clientWidth)
    if (lastWidth > 0)
      box.append(drawEarlyChart(e, lastWidth))
    observer = new ResizeObserver(() => {
      const w = Math.floor(box.clientWidth)
      if (w > 0 && w !== lastWidth) {
        lastWidth = w
        box.replaceChildren(drawEarlyChart(e, w))
      }
    })
    const figure = h('figure', { 'class': 'cmp3-figure', 'data-testid': 'ee-chart' }, box, h('figcaption', {}, txt('span', 'chartTableFirst')))
    region.replaceChildren(...fixed, figure, ...regionContent(e))
    observer.observe(box)
  }

  function update(_values: FormValues, main: { result: Result, coreInput: Record<string, unknown> } | null) {
    data = main ? earlyExit(avDepot.schema.parse(main.coreInput), main.result) : null
    summary.replaceChildren(...(data ? summaryLines(data) : [txt('p', 'eeInvalid')]))
    render()
  }
  return { brief, section, update }
}
