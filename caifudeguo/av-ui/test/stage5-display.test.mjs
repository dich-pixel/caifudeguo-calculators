// Stage 5 display items (2) link expand, (4) x-label thinning, (5) right title / 2-decimal % / 375 px spacing, 2026-10-23.
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { relText } from '../src/cmp3'
import { clearSweepCache, sweep } from '../src/compare'
import { earlyExitFor } from '../src/early-exit'
import { DEFAULTS, evaluate } from '../src/model'
import { all, byTestId, installFakeDom } from './fake-dom'

const TODAY = new Date(2026, 9, 17)
const form = (f = {}, mode = 'avDepot') =>
  ({ ...structuredClone(DEFAULTS), taxSavingsMode: mode, kids: [], fields: { ...DEFAULTS.fields, ...f } })
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
const est = t => [...t].reduce((n, c) => n + (/[\u3000-\uFFFF]/.test(c) ? 13 : 7), 0)
const spans = svg => all(svg, x => /^xl(?: user)?$/.test(x.attrs.class ?? '')).map(t => ({ t: t.textContent, l: Number(t.attrs.x), r: Number(t.attrs.x) + est(t.textContent) }))
const noOverlap = (s) => { for (let i = 1; i < s.length; i++) expect(s[i].l, `${s[i - 1].t} / ${s[i].t}`).toBeGreaterThanOrEqual(s[i - 1].r + 4) }

let restore
beforeAll(() => { restore = installFakeDom() })
afterAll(() => restore())

describe('(2) link expands the detail and scrolls it to the top', () => {
  it('click: prevents the jump, opens the region, scrollIntoView block start', async () => {
    const { createEarlyExit } = await import('../src/early-exit-view')
    const v = createEarlyExit()
    const o = evaluate(form(), TODAY)
    v.update(form(), o.ok ? o : null)
    const s = v.section
    const btn = all(s, x => x.tag === 'button')[0]
    expect(btn.attrs['aria-expanded']).toBe('false')
    byTestId(v.brief, 'ee-more')[0].click()
    expect(btn.attrs['aria-expanded']).toBe('true')
    expect(byTestId(s, 'ee-table')).toHaveLength(1)
    expect(s.scrolled).toEqual({ n: 1, opts: { block: 'start' } })
    byTestId(v.brief, 'ee-more')[0].click() // stays open on a second click
    expect(btn.attrs['aria-expanded']).toBe('true')
  })
  it('page opened with #ee expands on load; CSP-safe (no inline style in the view)', async () => {
    const g = globalThis
    const saved = { location: g.location, window: g.window, raf: g.requestAnimationFrame }
    g.location = { hash: '#ee' }
    g.window = { addEventListener: () => {} }
    g.requestAnimationFrame = undefined
    try {
      const { createEarlyExit } = await import('../src/early-exit-view')
      const v = createEarlyExit()
      const o = evaluate(form(), TODAY)
      v.update(form(), o.ok ? o : null)
      expect(all(v.section, x => x.tag === 'button')[0].attrs['aria-expanded']).toBe('true')
      expect(v.section.scrolled.n).toBe(1)
    }
    finally { Object.assign(g, { location: saved.location, window: saved.window, requestAnimationFrame: saved.raf }) }
    const src = readFileSync(new URL('../src/early-exit-view.ts', import.meta.url), 'utf8')
    expect(src).not.toMatch(/\.style\.|style=/)
  })
})

describe('(4) x labels never overlap, first and last kept', () => {
  it.each([[375, 'avDepot'], [1280, 'avDepot'], [375, 'consume'], [800, 'secondaryDepot'], [320, 'avDepot']])('early-exit chart %i px %s', async (w, mode) => {
    const { drawEarlyChart } = await import('../src/early-exit-view')
    const e = earlyExitFor(form({}, mode), TODAY)
    const s = spans(drawEarlyChart(e, w))
    noOverlap(s)
    expect(s[0].t).toBe(String(e.points[0].age))
    expect(s.at(-1).t).toBe(String(e.points.at(-1).age))
  })
  it.each([[375, '1.800'], [1280, '1.800'], [375, '6.840'], [800, '300'], [320, '2.000']])('cmp3 chart %i px user %s', async (w, amount) => {
    const { drawChart } = await import('../src/chart')
    clearSweepCache()
    const rs = sweep(form({ savingsRate: amount }), undefined, { today: TODAY }).rows
    const s = spans(drawChart(rs, w))
    noOverlap(s)
    expect(s.length).toBeGreaterThan(1)
  })
  it('thinLabels keeps first and last and drops the neighbour that collides with the last', async () => {
    const { thinLabels } = await import('../src/chart')
    expect(thinLabels([{ l: 0, r: 14 }, { l: 20, r: 34 }, { l: 36, r: 50 }, { l: 52, r: 66 }])).toEqual([0, 1, 3])
    expect(thinLabels([{ l: 0, r: 14 }, { l: 10, r: 24 }])).toEqual([0])
  })
})

describe('(5) right title margin, 2-decimal %, 375 px spacing', () => {
  it.each([800, 375, 1280])('right title stays ≥ 3 px inside at %i px', async (w) => {
    const { drawChart, RIGHT_TITLE_INSET } = await import('../src/chart')
    clearSweepCache()
    const svg = drawChart(sweep(form(), undefined, { today: TODAY }).rows, w)
    const title = all(svg, x => (x.attrs.class ?? '').includes('axis-title-right'))[0]
    const m = /translate\(([\d.]+) /.exec(title.attrs.transform)
    expect(Number(m[1]) + 11).toBeLessThanOrEqual(w - 3) // rotate(90): ascent ≈ 11 px towards the edge
    expect(RIGHT_TITLE_INSET).toBeGreaterThanOrEqual(14)
  })
  it('relText: always exactly 2 decimals, de-DE, U+2212', () => {
    expect(relText(15)).toBe('15,00 %')
    expect(relText(-1.0904)).toBe('\u22121,09 %')
    expect(relText(12.87)).toBe('12,87 %')
    expect(relText(-123.456)).toBe('\u2212123,46 %')
  })
  it('early-exit right axis: fractional ticks use 2 decimals; cards / table / summary percentages too', async () => {
    const { drawEarlyChart, cards, wideTable, summaryLines } = await import('../src/early-exit-view')
    for (const mode of ['avDepot', 'consume', 'secondaryDepot']) {
      const e = earlyExitFor(form({}, mode), TODAY)
      for (const w of [375, 1280]) {
        for (const r of all(byTestId(drawEarlyChart(e, w), 'chart-axis-right')[0], x => x.tag === 'text'))
          expect(r.textContent).toMatch(/^−?\d[\d.]*(?:,\d\d)? %$/)
      }
      const texts = [cards(e), wideTable(e), ...summaryLines(e)].flatMap(n => all(n, x => x.children.every(c => typeof c === 'string')).map(x => x.textContent))
      for (const t of texts) {
        for (const m of t.matchAll(/[-−]?\d[\d.,]* %/g)) expect(m[0], t).toMatch(/^[-−]?\d[\d.]*,\d\d %$/)
      }
    }
  })
  it('≤ 520 px: spacing rules for the ee notes and the chart title; card breakpoint 999 px kept', () => {
    const q = css.match(/@media \(max-width: 520px\) \{[^@]*?\.ee-region > p\.help \{ margin: (\d+)px 0; \}\s*\.ee-region > \.cmp3-figure \{ margin-top: (\d+)px; \}/)
    expect(q).not.toBeNull()
    expect(Number(q[1])).toBeGreaterThanOrEqual(8)
    expect(Number(q[2])).toBeGreaterThanOrEqual(12)
    expect(css).toMatch(/@media \(max-width: 999px\) \{\s*\.ee-table \{ display: none; \}/)
  })
})
