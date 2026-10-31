// Stage 5 display items (2) link expand, (4) x-label thinning, (5) right title / 2-decimal % / 375 px spacing, 2026-10-23.
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { relText } from '../src/cmp3'
import { clearSweepCache, namedAmounts, sweep } from '../src/compare'
import { earlyExitFor } from '../src/early-exit'
import { evaluate } from '../src/model'
import { all, byTestId, installFakeDom } from './fake-dom'
import { LEGACY_DEFAULTS as DEFAULTS } from './legacy-defaults'

const TODAY = new Date(2026, 9, 17)
const form = (f = {}, mode = 'avDepot') =>
  ({ ...structuredClone(DEFAULTS), taxSavingsMode: mode, kids: [], fields: { ...DEFAULTS.fields, ...f } })
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
const est = t => [...t].reduce((n, c) => n + (/[\u3000-\uFFFF]/.test(c) ? 13 : 7), 0)
const spans = svg => all(svg, x => /^xl(?: user)?$/.test(x.attrs.class ?? '')).map(t => ({ t: t.textContent, y: t.attrs.y, l: Number(t.attrs.x), r: Number(t.attrs.x) + est(t.textContent) }))
// follow-up: ≥ 8 px between labels of the same row
const noOverlap = (s) => {
  for (const y of new Set(s.map(x => x.y))) {
    const row = s.filter(x => x.y === y).sort((a, b) => a.l - b.l)
    for (let i = 1; i < row.length; i++) expect(row[i].l, `${row[i - 1].t} / ${row[i].t}`).toBeGreaterThanOrEqual(row[i - 1].r + 8)
  }
}
// viewport widths; 288 / 343 are the real chart widths inside the 320 / 375 viewports
const W = [320, 375, 800, 1280]

let restore
beforeAll(() => { restore = installFakeDom() })
afterAll(() => restore())

describe('(2) the toggle expands the detail; #ee scrolls it to the top (0.3.2: the link down is deleted)', () => {
  it('toggle click: opens the region (chart stays outside), no scroll', async () => {
    const { createEarlyExit } = await import('../src/early-exit-view')
    const v = createEarlyExit()
    const o = evaluate(form(), TODAY)
    v.update(form(), o.ok ? o : null)
    const s = v.section
    const btn = all(s, x => x.tag === 'button')[0]
    expect(btn.attrs['aria-expanded']).toBe('false')
    expect(byTestId(v.brief, 'ee-more')).toHaveLength(0)
    btn.click()
    expect(btn.attrs['aria-expanded']).toBe('true')
    expect(byTestId(s, 'ee-table')).toHaveLength(1)
    expect(s.scrolled.n).toBe(0)
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
    if (w >= 800)
      expect(s.map(x => x.t)).toEqual(e.points.map(p => String(p.age))) // everything fits from 800 px: nothing dropped
  })
  it.each([[375, '1.800'], [1280, '1.800'], [375, '6.840'], [800, '300'], [320, '2.000']])('cmp3 chart %i px user %s', async (w, amount) => {
    const { drawChart } = await import('../src/chart')
    clearSweepCache()
    const rs = sweep(form({ savingsRate: amount }), undefined, { today: TODAY }).rows
    const s = spans(drawChart(rs, w))
    noOverlap(s)
    expect(s.length).toBeGreaterThan(1)
  })
  it('placeLabels: keeps all when they fit (shifting), else first/last/must; must-keep goes to another row', async () => {
    const { placeLabels } = await import('../src/chart')
    const o = { minL: 0, maxR: 200 }
    expect(placeLabels([{ tick: 10, w: 14 }, { tick: 32, w: 14 }], o).map(p => p.i)).toEqual([0, 1])
    const three = [{ tick: 10, w: 14 }, { tick: 20, w: 14 }, { tick: 30, w: 14 }]
    expect(placeLabels(three, o).map(p => p.i)).toEqual([0, 2])
    expect(placeLabels(three.map((x, i) => ({ ...x, must: i === 1 })), { ...o, rows: 2 })).toEqual([
      expect.objectContaining({ i: 0, row: 0 }),
      expect.objectContaining({ i: 1, row: 1 }),
      expect.objectContaining({ i: 2, row: 0 }),
    ])
  })
})

describe('follow-up: x ticks the summary names are always visible (stage 4 chart)', () => {
  const visible = async (f, w) => {
    const { drawChart } = await import('../src/chart')
    clearSweepCache()
    const s = sweep(f, undefined, { today: TODAY })
    const shown = spans(drawChart(s.rows, w, namedAmounts(s)))
    noOverlap(shown)
    return { s, shown: shown.map(x => x.t) }
  }
  it.each([...W, 288, 343])('default input @ %i px: 6.840 and every named amount shown', async (w) => {
    const { s, shown } = await visible(form(), w)
    expect(namedAmounts(s)).toContain(6840)
    for (const a of namedAmounts(s)) expect(shown).toContain(a.toLocaleString('de-DE'))
  })
  it.each([...W, 288, 343])('non-default input (zvE 20.000 €, consume) @ %i px: the brackets the sentence names are shown', async (w) => {
    const f = form({ zveSavingsPhase: '20.000' }, 'consume')
    const { s, shown } = await visible(f, w)
    const named = namedAmounts(s)
    expect(named.length).toBeGreaterThanOrEqual(2)
    expect(named).not.toEqual(namedAmounts(sweep(form(), undefined, { today: TODAY })))
    const { sensitivityText } = await import('../src/compare')
    for (const f0 of s.flips.slice(0, 3)) expect(sensitivityText(s)).toContain(f0.from.toLocaleString('de-DE'))
    for (const a of named) expect(shown).toContain(a.toLocaleString('de-DE'))
  })
  it.each([800, 1280])('%i px: all 12 tiers present', async (w) => {
    const { TIERS } = await import('../src/compare')
    const { shown } = await visible(form(), w)
    for (const a of TIERS) expect(shown).toContain(a.toLocaleString('de-DE'))
  })
})

describe('(5) right title margin, 2-decimal %, 375 px spacing', () => {
  // follow-up: ≥ 8 px from the right edge and clear of the right tick labels, both charts. Browser-calibrated
  // (Chromium, 2026-10-23): rotate(90) glyphs reach ≈ 13 px right of the baseline and ≈ 4 px left of it.
  const titleChecks = (svg, w) => {
    const title = all(svg, x => (x.attrs.class ?? '').includes('axis-title-right'))[0]
    const cx = Number(/translate\(([\d.]+) /.exec(title.attrs.transform)[1])
    expect(w - (cx + 13), `edge @ ${w}`).toBeGreaterThanOrEqual(8)
    for (const r of all(byTestId(svg, 'chart-axis-right')[0], x => x.tag === 'text'))
      expect(cx - 4 - (Number(r.attrs.x) + est(r.textContent)), `${r.textContent} @ ${w}`).toBeGreaterThanOrEqual(4)
  }
  it.each([320, 375, 800, 1280])('right title ≥ 8 px from the edge, no tick overlap, cmp3 chart %i px', async (w) => {
    const { drawChart, RIGHT_TITLE_INSET } = await import('../src/chart')
    expect(RIGHT_TITLE_INSET).toBeGreaterThanOrEqual(21)
    for (const amount of ['300', '1.800', '6.840']) {
      clearSweepCache()
      titleChecks(drawChart(sweep(form({ savingsRate: amount }), undefined, { today: TODAY }).rows, w), w)
    }
  })
  it.each([320, 375, 800, 1280])('right title ≥ 8 px from the edge, no tick overlap, early-exit chart %i px', async (w) => {
    const { drawEarlyChart } = await import('../src/early-exit-view')
    for (const mode of ['avDepot', 'consume', 'secondaryDepot'])
      titleChecks(drawEarlyChart(earlyExitFor(form({}, mode), TODAY), w), w)
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
  it('spacing between the notes and the chart title at every width (no media query); header nowrap; 999 px kept', () => {
    const top = css.replace(/@media[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '')
    const m1 = top.match(/\.ee-region > p\.help \{ margin: (\d+)px 0; \}/)
    const m2 = top.match(/\.ee > \.cmp3-figure \{ margin-top: (\d+)px; \}/)
    expect(Number(m1[1])).toBeGreaterThanOrEqual(8)
    expect(Number(m2[1])).toBeGreaterThanOrEqual(12)
    expect(top).toMatch(/\.ee-table thead th\[scope='col'\] \{ white-space: nowrap; \}/)
    expect(top).toMatch(/\.ee-table th\[scope='row'\] \{[^}]*min-width: 14em;/)
    expect(css).toMatch(/@media \(max-width: 999px\) \{\s*\.ee-table \{ display: none; \}/)
  })
})
