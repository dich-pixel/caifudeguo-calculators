// Stage 5 validator table fix + tester findings (a)–(c), 2026-10-23.
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { earlyExitFor } from '../src/early-exit'
import { formatEuro } from '../src/format'
import { DEFAULTS } from '../src/model'
import { t as tr } from '../src/strings'
import { all, byTestId, installFakeDom } from './fake-dom'

const TODAY = new Date(2026, 9, 17)
const form = (f = {}, mode = 'avDepot') =>
  ({ ...structuredClone(DEFAULTS), taxSavingsMode: mode, kids: [], fields: { ...DEFAULTS.fields, ...f } })
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
const est = t => [...t].reduce((n, c) => n + (/[\u3000-\uFFFF]/.test(c) ? 13 : 7), 0)
const cases = [['E4', form({}, 'secondaryDepot')], ['E5', form({ savingsRate: '13.500' })]]

describe('ee table: side account split into three rows', () => {
  let restore
  beforeAll(() => { restore = installFakeDom() })
  afterAll(() => restore())

  it.each(cases)('%s: group row + 税前 / 税 / 税后 rows, one value per cell, existing labels only', async (_n, v) => {
    const { cards, wideTable } = await import('../src/early-exit-view')
    const e = earlyExitFor(v, TODAY)
    const p = e.points.find(x => x.year === 10)
    const tbl = wideTable(e)
    const rows = all(tbl, x => x.tag === 'tr')
    const i = rows.findIndex(r => r.attrs.class === 'sec')
    expect(i).toBeGreaterThan(0)
    expect(rows.slice(i, i + 4).map(r => r.attrs.class)).toEqual(['sec', 'sec-gross sub', 'sec-tax sub', 'sec-net sub'])
    const th = r => all(r, x => x.tag === 'th')[0].textContent
    expect(rows.slice(i, i + 4).map(th)).toEqual([tr('eeSecLabel'), tr('gross'), tr('tax'), tr('net')])
    expect(tr('eeSecLabel')).toBe('其中普通副账户：税前 / 税 / 税后') // Rich-approved wording
    expect(tr('eeSecLabel')).toBe(`其中普通副账户：${tr('gross')} / ${tr('tax')} / ${tr('net')}`)
    expect(byTestId(tbl, 'ee-sec-10')[0].textContent).toBe('')
    const eur = formatEuro
    expect(byTestId(tbl, 'ee-sec-gross-10')[0].textContent).toBe(eur(p.secBalance))
    expect(byTestId(tbl, 'ee-sec-net-10')[0].textContent).toBe(eur(p.secBalance - p.secTax))
    for (const k of ['gross', 'tax', 'net']) {
      for (const q of e.points) expect(byTestId(tbl, `ee-sec-${k}-${q.year}`)[0].textContent).not.toContain('/')
    }
    const c = cards(e)
    for (const k of ['gross', 'tax', 'net']) expect(byTestId(c, `ee-card-sec-${k}-10`)).toHaveLength(1)
  })
  it('label column min-width ≥ 12em, wide enough that no label breaks per character', async () => {
    const m = /\.ee-table th\[scope='row'\]\s*\{[^}]*min-width:\s*([\d.]+)em/.exec(css)
    expect(m).not.toBeNull()
    const em = Number(m[1])
    expect(em).toBeGreaterThanOrEqual(12)
    // 0.8rem labels: em × 12.8 px; ≥ 10 CJK characters per line, and the longest bracketed German term fits on one line
    const px = em * 12.8
    expect(px / 12.8).toBeGreaterThanOrEqual(10)
    const { wideTable } = await import('../src/early-exit-view')
    for (const [, v] of cases) {
      const tbl = wideTable(earlyExitFor(v, TODAY))
      for (const r of all(tbl, x => x.tag === 'th' && x.attrs.scope === 'row')) {
        for (const w of r.textContent.match(/[A-Za-zäöüß§.\d ]{3,}/g) ?? []) expect(est(w.trim()) * 0.8, w).toBeLessThan(px)
      }
    }
    // the cards breakpoint is unchanged (awaiting PM): table hidden below 1000 px
    expect(css).toMatch(/@media \(max-width: 999px\) \{\s*\.ee-table \{ display: none; \}/)
  })
})

describe('(a) U+2212 in tables, cards and summary', () => {
  let restore
  beforeAll(() => { restore = installFakeDom() })
  afterAll(() => restore())
  it('negative values never use an ASCII hyphen', async () => {
    const { cards, summaryLines, wideTable } = await import('../src/early-exit-view')
    const { relText } = await import('../src/cmp3')
    const { formatEuro2, formatPercentDe, formatNumberDe } = await import('../src/format')
    expect(formatEuro(-5400)).toBe('\u22125.400\u00A0€')
    expect(formatEuro2(-1.5)).toBe('\u22121,50\u00A0€')
    expect(formatPercentDe(-3.79, 2)).toBe('\u22123,79\u00A0%')
    expect(relText(-3.79)).toContain('\u22123,79')
    expect(formatNumberDe(-1)).toBe('-1') // input round-trips stay ASCII
    for (const v of [form({}, 'consume'), form({ savingsRate: '13.500' }), form({}, 'secondaryDepot')]) {
      const e = earlyExitFor(v, TODAY)
      const text = [(wideTable(e)).textContent, (cards(e)).textContent, ...summaryLines(e).map(n => n.textContent)].join('\n')
      expect(text).toContain('\u2212')
      expect(text).not.toMatch(/-\s?\d/)
    }
  })
})

describe('(b) x labels keep clear of the right-axis labels', () => {
  let restore
  beforeAll(() => { restore = installFakeDom() })
  afterAll(() => restore())
  it.each([375, 414, 800, 1280])('%i px: last x label ends ≥ 4 px before the right-axis column', async (width) => {
    const { drawEarlyChart } = await import('../src/early-exit-view')
    const { PAD } = await import('../src/chart')
    for (const v of [form(), form({ age: '50' }), form({}, 'consume'), form({ savingsRate: '13.500' })]) {
      const svg = drawEarlyChart(earlyExitFor(v, TODAY), width)
      const rightL = width - PAD.right + 6
      for (const r of all(byTestId(svg, 'chart-axis-right')[0], x => x.tag === 'text')) expect(Number(r.attrs.x)).toBeGreaterThanOrEqual(rightL)
      for (const t of all(svg, x => x.attrs.class === 'xl')) expect(Number(t.attrs.x) + est(t.textContent)).toBeLessThanOrEqual(rightL - 4)
    }
  })
})

describe('(c) no late layout shift above #ee', () => {
  it('the sweep summary reserves its final height before the debounced run finishes', () => {
    const mh = block => Number(/\.cmp3-summary \{ min-height: ([\d.]+)em; \}/.exec(block)[1])
    const base = mh(css)
    const mid = mh(css.split('@media (max-width: 999px) { .cmp3-summary')[1].replace(/^/, '.cmp3-summary'))
    const narrow = mh(css.split('@media (max-width: 520px) { .cmp3-summary')[1].replace(/^/, '.cmp3-summary'))
    // largest final summary measured in headless Chrome (3 modes × 7 amounts): 84 px (≥ 1000), 108 px (521–999), 180 px (320–520)
    expect(base * 16).toBeGreaterThanOrEqual(84)
    expect(mid * 16).toBeGreaterThanOrEqual(108)
    expect(narrow * 16).toBeGreaterThanOrEqual(180)
  })
})
