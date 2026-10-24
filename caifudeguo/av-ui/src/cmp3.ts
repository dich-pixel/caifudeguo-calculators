/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Based on finanzfluss/calculators (AGPL-3.0). Licensed under AGPL-3.0-only.
 *
 * Stage 3 comparison block (PLAN_stage3.md b, b2, c, e): two-line summary (always), collapsible table (+ chart).
 * All numbers come from compare.ts (core outputs); this file only formats them.
 */
import type { CmpRow, SweepResult } from './compare'
import type { FormValues, Result } from './model'
import type { StrKey } from './strings'
import { chartPlaceholder, drawChart, FALLBACK_CHART_HEIGHT, mainChartHeight } from './chart'
import { amountId, flipText, kindName, maxText, namedAmounts, pendingAmounts, prefetch, sensitivityText, sweep, verdictSentence } from './compare'
import { h, txt } from './dom'
import { displayNumberDe, formatEuro } from './format'
import { ONE_CONTRACT_CAP } from './model'
import { t } from './strings'

export const DEBOUNCE_MS = 300

const num = (s: string) => h('span', { class: 'num' }, s)

/** Stage 5 B: relative difference in %, always exactly 2 decimals (PM, stage 5 (5)); null → dash (B.3) */
export function relText(rel: number | null): string {
  return rel === null ? t('dash') : t('relCell', { p: displayNumberDe(rel, 2) })
}

export interface Cmp3View {
  section: HTMLElement
  /** called after every main-result update; main = null when the form has errors */
  update: (values: FormValues, main: Result | null) => void
}

export function createCmp3(): Cmp3View {
  const summary = h('div', { 'class': 'cmp3-summary', 'data-testid': 'cmp3-summary', 'aria-live': 'polite', 'aria-busy': 'false', 'data-round': '0' })
  const region = h('div', { 'id': 'cmp3-region', 'class': 'cmp3-region', 'hidden': true, 'data-round': '0' })
  const toggle = txt('button', 'cmp3Toggle', { 'type': 'button', 'class': 'toggle', 'aria-expanded': 'false', 'aria-controls': 'cmp3-region' })
  const section = h('section', { 'class': 'cmp3', 'aria-labelledby': 'cmp3-h', 'data-testid': 'cmp3' },
    h('h2', { id: 'cmp3-h' }, txt('span', 'cmp3Heading'), ' ', txt('span', 'cmp3Single', { class: 'tag' })),
    summary,
    toggle,
    region,
  )

  let data: { values: FormValues, result: SweepResult } | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const open = () => toggle.getAttribute('aria-expanded') === 'true'
  toggle.addEventListener('click', () => {
    const o = !open()
    toggle.setAttribute('aria-expanded', String(o))
    region.hidden = !o
    if (o)
      renderRegion()
    else region.replaceChildren()
  })

  function renderSummary() {
    if (!data)
      return
    const s = data.result
    summary.replaceChildren(
      h('p', { 'data-testid': 'cmp3-summary-sensitivity' }, sensitivityText(s)),
      h('p', { 'data-testid': 'cmp3-summary-max' }, maxText(s)),
      s.marginalHigher ? txt('p', 'marginalHigher') : '',
    )
  }

  let observer: ResizeObserver | undefined
  function renderRegion() {
    observer?.disconnect()
    if (!data || !open())
      return
    const s = data.result
    const box = h('div', { class: 'cmp3-chart-box' })
    const figure = h('figure', { 'class': 'cmp3-figure', 'data-testid': 'cmp3-chart' }, box, h('figcaption', {},
      h('span', { class: 'cap-verdict' }, verdictSentence(s.userRow.avNet, s.userRow.normalNet)), ' ',
      h('span', { class: 'cap-sensitivity' }, sensitivityText(s)), ' ',
      txt('span', 'relNote'), ' ',
      txt('span', 'chartTableFirst')))
    // Draw before inserting (width of the open region = box width), so the chart never disappears for a frame.
    let lastWidth = Math.floor(region.clientWidth)
    if (lastWidth > 0) {
      box.replaceChildren(chartPlaceholder(mainChartHeight(s.rows, lastWidth, namedAmounts(s))))
      box.replaceChildren(drawChart(s.rows, lastWidth, namedAmounts(s)))
    }
    else {
      box.append(chartPlaceholder(FALLBACK_CHART_HEIGHT))
    }
    observer = new ResizeObserver(() => {
      const w = Math.floor(box.clientWidth)
      if (w > 0 && w !== lastWidth) {
        lastWidth = w
        box.replaceChildren(chartPlaceholder(mainChartHeight(s.rows, w, namedAmounts(s))))
        box.replaceChildren(drawChart(s.rows, w, namedAmounts(s)))
      }
    })
    region.replaceChildren(figure, ...table(data.values, s))
    observer.observe(box)
  }

  // Scheduling (plan e): debounce 300 ms, one core run per macrotask, newer input cancels the running round.
  let round = 0
  // Stage 4 (Q6): the status line always keeps its space (visibility via CSS class, not `hidden`), so the height does not jump.
  const status = txt('p', 'cmp3Rebusy', { class: 'cmp3-status idle' })
  section.insertBefore(status, toggle)
  let token = 0
  function setBusy(busy: boolean) {
    summary.setAttribute('aria-busy', String(busy))
    region.classList.toggle('busy', busy)
    region.setAttribute('aria-busy', String(busy))
    status.classList.toggle('idle', !busy || !data)
  }

  function update(values: FormValues, main: Result | null) {
    clearTimeout(timer)
    const my = ++token
    if (!main) {
      data = null
      setBusy(false)
      // T3-84: the invalid text is shown but not announced (field error + result status already are)
      summary.removeAttribute('aria-live')
      summary.replaceChildren(txt('p', 'cmp3Invalid'))
      region.replaceChildren(txt('p', 'cmp3Invalid'))
      return
    }
    const snapshot = structuredClone(values)
    if (!summary.hasAttribute('aria-live')) {
      summary.replaceChildren()
      summary.setAttribute('aria-live', 'polite')
    }
    timer = setTimeout(() => {
      if (my !== token)
        return
      const n = ++round
      performance.mark('cmp3-round-start')
      if (!data)
        summary.replaceChildren(txt('p', 'cmp3Busy'))
      setBusy(true)
      const queue = pendingAmounts(snapshot, { main })
      const step = () => {
        if (my !== token)
          return
        const a = queue.shift()
        if (a !== undefined) {
          prefetch(snapshot, a)
          timer = setTimeout(step, 0)
          return
        }
        const result = sweep(snapshot, undefined, { main })
        if (!result)
          return
        data = { values: snapshot, result }
        renderSummary()
        renderRegion()
        summary.setAttribute('data-round', String(n))
        region.setAttribute('data-round', String(n))
        setBusy(false)
        performance.mark('cmp3-round-end')
      }
      timer = setTimeout(step, 0)
    }, DEBOUNCE_MS)
  }

  return { section, update }
}

/** Table (cards below 1000 px via CSS) and its notes. */
export function table(values: FormValues, s: SweepResult): HTMLElement[] {
  const cols: [string, string][] = [
    ['amount', t('cmp3ColAmount')],
    ['foerderung', t('cmp3ColFoer')],
    ['av', t('cmp3ColAv')],
    ['normal', t('cmp3ColNormal')],
    ['diff', t('cmp3ColDiff')],
    ['rel', t('cmp3ColRel')],
    ['verdict', t('cmp3ColVerdict')],
    ['marginal', t('cmp3ColMarginal')],
    ['monthly', t('cmp3ColMonthly')],
    ['split', t('cmp3ColSplit')],
  ]
  const label = Object.fromEntries(cols)
  const row = (r: CmpRow) => {
    const id = amountId(r.amount)
    const cell = (f: string, ...c: (Node | string | null)[]) =>
      h('td', { 'data-testid': `cmp3-cell-${f}-${id}`, 'data-label': label[f], 'class': f }, ...c)
    const notes: (HTMLElement | null)[] = [
      r.user ? txt('span', 'cmp3UserTag', { class: 'user-tag' }) : null,
      r.amount === 360 && r.tier ? txt('span', 'cmp3Label360', { class: 'tier-label' }) : null,
      r.amount === 1800 && r.tier ? txt('span', 'cmp3Label1800', { class: 'tier-label' }) : null,
      r.amount === 1800 && r.tier && values.taxSavingsMode === 'avDepot' ? txt('span', 'cmp3Note1800Reinvest', { class: 'tier-label' }) : null,
      r.amount === 13680 && r.tier ? txt('span', 'cmp3Note13680', { class: 'tier-label' }) : null,
      r.amount > ONE_CONTRACT_CAP ? txt('span', 'twoContracts', { class: 'tier-label hint' }) : null,
    ]
    const m = r.marginal
    return h('tr', { 'data-testid': `cmp3-row-${id}`, 'class': r.user ? 'user' : undefined },
      h('th', { 'scope': 'row', 'data-testid': `cmp3-cell-amount-${id}`, 'data-label': label.amount, 'class': 'amount' }, num(formatEuro(r.amount)), ...notes),
      cell('foerderung', num(formatEuro(r.foerderung))),
      cell('av', num(formatEuro(r.avNet))),
      cell('normal', num(formatEuro(r.normalNet))),
      cell('diff', num(formatEuro(r.diff))),
      cell('rel', r.rel === null ? t('dash') : num(relText(r.rel))),
      cell('verdict', h('span', { 'data-verdict': r.kind }, kindName(r.kind)), r.flip ? h('span', { 'class': 'flip', 'data-testid': 'cmp3-flip' }, flipText(r.flip)) : null),
      cell('marginal', m
        ? num(t('cmp3MarginalCell', { a: displayNumberDe(m.av, 2), b: displayNumberDe(m.normal, 2) }))
        : t('dash')),
      cell('monthly', num(t('cmp3MonthlyCell', { a: formatEuro(r.result.monthlyNet.avDepot), b: formatEuro(r.result.monthlyNet.normalDepot) }))),
      h('td', { 'data-testid': `cmp3-split-${id}`, 'data-label': label.split, 'class': 'split' }, r.split === null ? t('dash') : num(formatEuro(r.split))),
    )
  }
  const notes: (StrKey | null)[] = [
    'subsidyFootnote',
    'singleOnlyFootnote',
    'spouseOnlyNotice',
    'jointApproxNotice',
    'cmp3DiffNote',
    'relNote',
    s.rows.some(r => r.rel === null) ? 'relOmitted' : null,
    'foerBonus',
    values.kids.length > 0 ? 'foerKids' : null,
    'cmp3SplitUnder',
    'cmp3SplitNote',
    values.taxSavingsMode === 'secondaryDepot' ? 'cmp3SplitNoteSecondary' : null,
    s.rows.some(r => r.splitNote === 'le1800') ? 'cmp3SplitLe1800' : null,
    s.rows.some(r => r.splitNote === 'lt120') ? 'cmp3SplitLt120' : null,
  ]
  return [
    txt('p', 'cmp3Intro', { class: 'help' }),
    h('table', { 'class': 'cmp3-table', 'data-testid': 'cmp3-table' },
      h('thead', {}, h('tr', {}, ...cols.map(([f, l]) => h('th', { scope: 'col', class: f }, l)))),
      h('tbody', {}, ...s.rows.map(row)),
    ),
    ...notes.filter((k): k is StrKey => k !== null).map(k => txt('p', k, { class: 'help' })),
  ]
}
