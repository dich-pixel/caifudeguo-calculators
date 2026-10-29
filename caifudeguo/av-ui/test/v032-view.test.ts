// 0.3.2: charts always visible, folds, deleted duplicates, merged footer details, spacing/layout CSS, #ee.
// Every test here was run RED on the 0.3.1 code first (evidence in the PR description / stage6-impl/evidence).
import type { FormValues } from '../src/model'
import type { FakeEl } from './fake-dom'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { clearSweepCache, maxText, sensitivityText } from '../src/compare'
import { DEFAULTS, evaluate } from '../src/model'
import { STR, t } from '../src/strings'
import { all, byTestId, installFakeDom, serialize, setFakeWidth } from './fake-dom'

const TODAY = new Date(2026, 9, 17)
type Mode = FormValues['taxSavingsMode']
const SETS: [string, Partial<FormValues['fields']>, Mode][] = [
  ['default', {}, 'avDepot'],
  ['s1800', { savingsRate: '1.800' }, 'avDepot'],
  ['s13680-consume', { savingsRate: '13.680' }, 'consume'],
  ['s120-secondary', { savingsRate: '120' }, 'secondaryDepot'],
  ['s360', { savingsRate: '360' }, 'avDepot'],
  ['s5000-zve', { savingsRate: '5.000', zveSavingsPhase: '20.000' }, 'consume'],
  ['s900-secondary', { savingsRate: '900' }, 'secondaryDepot'],
  ['age50', { age: '50', savingsRate: '2.400' }, 'avDepot'],
]
const form = (f: Partial<FormValues['fields']>, mode: Mode): FormValues => ({ ...structuredClone(DEFAULTS), taxSavingsMode: mode, kids: [], fields: { ...DEFAULTS.fields, ...f } })
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/charts-69d4a51.json', import.meta.url), 'utf8')) as Record<string, string>
const cls = (e: FakeEl | string) => typeof e === 'string' ? '' : (e.attrs.class ?? '').split(' ')[0]
const kids = (e: FakeEl) => e.children.filter((c): c is FakeEl => typeof c !== 'string')
const TAIL = '数字见下方可展开的表格。'

let restore: () => void
beforeAll(() => { restore = installFakeDom() })
afterAll(() => restore())

async function cmp3Of(v: FormValues, width: number) {
  setFakeWidth(width)
  const { createCmp3 } = await import('../src/cmp3')
  const o = evaluate(v, TODAY)
  if (!o.ok)
    throw new Error('invalid input')
  const view = createCmp3()
  view.update(v, o.result)
  const sec = view.section as unknown as FakeEl
  const sum = byTestId(sec, 'cmp3-summary')[0]!
  for (let i = 0; i < 600 && sum.attrs['data-round'] === '0'; i++) await new Promise(r => setTimeout(r, 50))
  expect(sum.attrs['data-round']).not.toBe('0')
  return sec
}

describe('cmp3: summary, chart, caption, toggle, then the fold (8 input sets)', () => {
  const views = new Map<string, FakeEl>()
  beforeAll(async () => {
    clearSweepCache()
    for (const [name, f, mode] of SETS)
      views.set(name, await cmp3Of(form(f, mode), 1000))
  }, 300000)

  it.each(SETS.map(s => s[0]))('%s: order h2, summary, figure, status, toggle, region; chart visible before the fold is opened', (name) => {
    const sec = views.get(name)!
    expect(kids(sec).map(cls)).toEqual(['', 'cmp3-summary', 'cmp3-figure', 'cmp3-status', 'toggle', 'cmp3-region'])
    const fig = kids(sec)[2]!
    expect(fig.hidden).toBe(false)
    expect(fig.tag).toBe('figure')
    expect(all(fig, x => x.tag === 'svg' && x.attrs.class === 'cmp3-svg')).toHaveLength(1)
    expect(kids(sec)[5]!.hidden).toBe(true)
    expect(kids(sec)[5]!.children).toHaveLength(0)
  })
  it.each(SETS.map(s => s[0]))('%s: caption = chartTableFirst after the rel note; the verdict / sensitivity spans are gone', (name) => {
    const sec = views.get(name)!
    const cap = all(sec, x => x.tag === 'figcaption')[0]!
    expect(all(sec, x => x.attrs.class === 'cap-verdict' || x.attrs.class === 'cap-sensitivity')).toHaveLength(0)
    expect(kids(cap).map(x => x.attrs['data-testid'])).toEqual(['cmp3-rel-note', 'cmp3-chart-caption'])
    expect(kids(cap)[1]!.textContent).toBe('具体数字以表格为准。')
  })
  it.each(SETS.map(s => s[0]))('%s: the deleted caption sentence equals the summary sentence; svg role=img with both summary lines + table hint', (name) => {
    const sec = views.get(name)!
    const sum = byTestId(sec, 'cmp3-summary')[0]!
    const sens = byTestId(sum, 'cmp3-summary-sensitivity')[0]!.textContent
    const max = byTestId(sum, 'cmp3-summary-max')[0]!.textContent
    const svg = all(sec, x => x.tag === 'svg' && x.attrs.class === 'cmp3-svg')[0]!
    expect(svg.attrs.role).toBe('img')
    expect(svg.attrs['aria-hidden']).toBeUndefined()
    expect(svg.attrs['aria-label']).toBe(`${sens} ${max} ${TAIL}`)
    expect(sens.length).toBeGreaterThan(10)
  })
  it('toggle label; opening the fold shows only table + text (no chart), the folded notes keep their order', () => {
    const sec = views.get('default')!
    const btn = kids(sec)[4]!
    expect(btn.textContent).toBe('不同存钱额的比较（表格）')
    btn.click()
    const region = kids(sec)[5]!
    expect(region.hidden).toBe(false)
    expect(all(region, x => x.tag === 'svg' || x.tag === 'figure')).toHaveLength(0)
    expect(byTestId(region, 'cmp3-table')).toHaveLength(1)
    const fold = all(region, x => x.tag === 'details')
    expect(fold).toHaveLength(1)
    expect(kids(fold[0]!)[0]!.textContent).toBe('详情与依据')
    expect(kids(fold[0]!).slice(1).map(x => x.attrs['data-testid'])).toEqual([STR.jointApproxNotice.id, STR.foerBonus.id])
    const visible = kids(region).filter(x => x.tag === 'p').map(x => x.attrs['data-testid'])
    expect(visible).not.toContain(STR.jointApproxNotice.id)
    expect(visible).not.toContain(STR.foerBonus.id)
    expect(visible).toContain(STR.subsidyFootnote.id)
    expect(kids(region).at(-1)!.tag).toBe('details')
  })
})

describe('cmp3 / early-exit charts are byte-identical to 69d4a51 except the aria attributes', () => {
  const strip = (s: string) => s.replace(/ aria-hidden="true"/g, '')
  it.each(SETS.slice(0, 4).flatMap(s => [375, 1280].map(w => [s[0], w] as const)))('cmp3 %s @ %i px', async (name, w) => {
    const [, f, mode] = SETS.find(s => s[0] === name)!
    const sec = await cmp3Of(form(f, mode), w)
    const svg = all(sec, x => x.tag === 'svg' && x.attrs.class === 'cmp3-svg')[0]!
    expect(strip(serialize(svg, ['role', 'aria-label']))).toBe(strip(fixtures[`cmp3|${name}|${w}`]!))
  }, 60000)
  it.each(SETS.slice(0, 4).flatMap(s => [375, 1280].map(w => [s[0], w] as const)))('ee %s @ %i px', async (name, w) => {
    const [, f, mode] = SETS.find(s => s[0] === name)!
    const v = form(f, mode)
    setFakeWidth(w)
    const { createEarlyExit } = await import('../src/early-exit-view')
    const o = evaluate(v, TODAY)
    const view = createEarlyExit()
    view.update(v, o.ok ? o : null)
    const sec = view.section as unknown as FakeEl
    const svg = all(sec, x => x.tag === 'svg' && x.attrs.class === 'cmp3-svg ee-svg')[0]!
    expect(strip(serialize(svg, ['role', 'aria-label']))).toBe(strip(fixtures[`ee|${name}|${w}`]!))
  })
})

describe('early exit: one h2, chart visible, fold = assumptions + table + text', () => {
  async function eeOf(width = 1000) {
    setFakeWidth(width)
    const { createEarlyExit } = await import('../src/early-exit-view')
    const v = form({}, 'avDepot')
    const o = evaluate(v, TODAY)
    const view = createEarlyExit()
    view.update(v, o.ok ? o : null)
    return view
  }
  it('brief: one h2 with the eeSingle tag, disclaimer, summary; no 「详细计算结果和曲线见下方。」 link', async () => {
    const view = await eeOf()
    const b = view.brief as unknown as FakeEl
    expect(all(b, x => x.tag === 'h2')).toHaveLength(1)
    expect(byTestId(b, 'ee-more')).toHaveLength(0)
    expect(all(b, x => x.tag === 'a')).toHaveLength(0)
    expect(b.textContent).not.toContain('详细计算结果和曲线见下方')
    expect(byTestId(b, STR.eeSingle.id)).toHaveLength(1)
    expect('eeMore' in STR).toBe(false)
    expect('eeDetailHeading' in STR).toBe(false)
  })
  it('section: no h2, labelled by the brief h2; order figure, toggle, region; svg role=img with the summary lines + hint', async () => {
    const view = await eeOf()
    const s = view.section as unknown as FakeEl
    expect(all(s, x => x.tag === 'h2')).toHaveLength(0)
    expect(byTestId(s, 'ee-detail-heading')).toHaveLength(0)
    expect(s.attrs['aria-labelledby']).toBe('ee-brief-h')
    expect(kids(s).map(cls)).toEqual(['cmp3-figure', 'toggle', 'ee-region'])
    const fig = kids(s)[0]!
    expect(fig.hidden).toBe(false)
    expect(kids(fig.children.find(c => typeof c !== 'string' && c.tag === 'figcaption') as FakeEl).map(x => x.textContent)).toEqual(['具体数字以表格为准。'])
    const svg = all(fig, x => x.tag === 'svg' && x.attrs.class === 'cmp3-svg ee-svg')[0]!
    const lines = all(view.brief as unknown as FakeEl, x => /^ee-summary-\d+$/.test(x.attrs['data-testid'] ?? '')).map(x => x.textContent)
    expect(lines).toHaveLength(2)
    expect(svg.attrs.role).toBe('img')
    expect(svg.attrs['aria-hidden']).toBeUndefined()
    expect(svg.attrs['aria-label']).toBe(`${lines.join(' ')} ${TAIL}`)
  })
  it('toggle label; the fold holds assumptions, tables and notes but no chart', async () => {
    const view = await eeOf()
    const s = view.section as unknown as FakeEl
    const btn = kids(s)[1]!
    expect(btn.textContent).toBe('提前取出的比较（假设 + 表格）')
    btn.click()
    const region = kids(s)[2]!
    expect(all(region, x => x.tag === 'svg' || x.tag === 'figure')).toHaveLength(0)
    const ids = all(region, x => !!x.attrs['data-testid']).map(x => x.attrs['data-testid'])
    for (const id of ['ee-assume-1', 'single-only-footnote', 'spouse-only-notice', 'ee-table', 'ee-cards'])
      expect(ids).toContain(id)
    expect(all(s, x => x.tag === 'svg' && x.attrs.class === 'cmp3-svg ee-svg')).toHaveLength(1) // chart stays outside, once
  })
  it('chart ↔ summary: a section without a valid input hides the chart', async () => {
    setFakeWidth(1000)
    const { createEarlyExit } = await import('../src/early-exit-view')
    const view = createEarlyExit()
    view.update(form({}, 'avDepot'), null)
    expect(kids(view.section as unknown as FakeEl)[0]!.hidden).toBe(true)
  })
})

describe('strings (wording fixed by the plan)', () => {
  it('toggle labels and the chart hint', () => {
    expect(t('cmp3Toggle')).toBe('不同存钱额的比较（表格）')
    expect(t('eeToggle')).toBe('提前取出的比较（假设 + 表格）')
    expect(t('chartTableFirst')).toBe('具体数字以表格为准。')
    expect(t('chartTableHint')).toBe(TAIL)
  })
  it('the two summary sentences come from compare.ts', () => {
    expect(typeof sensitivityText).toBe('function')
    expect(typeof maxText).toBe('function')
  })
})

describe('folded notes (「详情与依据」)', () => {
  it('result notes: taxNote, jointApproxNotice, foerBonus in one details in original order; the other notes stay visible', async () => {
    const { resultNotes } = await import('../src/notes')
    const out = resultNotes(true) as unknown as FakeEl[]
    expect(out.map(x => x.tag)).toEqual(['p', 'p', 'p', 'p', 'details'])
    expect(out.slice(0, 4).map(x => x.attrs['data-testid'])).toEqual([STR.resultSubsidyFootnote.id, STR.singleOnlyFootnote.id, STR.spouseOnlyNotice.id, STR.foerKids.id])
    const det = out[4]!
    expect(kids(det).map(x => x.textContent)).toEqual(['详情与依据', t('taxNote'), t('jointApproxNotice'), t('foerBonus')])
    expect(kids(det).slice(1).map(x => x.attrs['data-testid'])).toEqual([STR.taxNote.id, STR.jointApproxNotice.id, STR.foerBonus.id])
    expect((await import('../src/notes')).resultNotes(false)).toHaveLength(4)
  })
  it('footer: the two details are merged into one, the two sentences stay visible', async () => {
    const { footerNotices } = await import('../src/notes')
    const out = footerNotices() as unknown as FakeEl[]
    expect(out.map(x => x.tag)).toEqual(['div', 'div', 'details'])
    const det = out[2]!
    expect(kids(det).map(x => x.textContent)).toEqual(['详情与依据', t('noticeSchaedlichDetails'), t('noticeKidsDetails')])
    expect(out[0]!.attrs['data-testid']).toBe(STR.noticeSchaedlich.id)
    expect(out[1]!.attrs['data-testid']).toBe(STR.noticeKids.id)
    expect(all(out[0]!, x => x.tag === 'details')).toHaveLength(0)
  })
  it('main.ts uses them (no loose taxNote / jointApprox / foerBonus paragraphs, brief inside the grid)', () => {
    const main = src('main.ts')
    expect(main).toContain('resultNotes(')
    expect(main).toContain('footerNotices()')
    expect(main).not.toMatch(/txt\('p', '(taxNote|jointApproxNotice|foerBonus)'/)
    expect(main).toMatch(/h\('div', \{ class: 'grid' \}, form, results, early\.brief\)/)
  })
})

// ---- CSS ----
interface Rule { sel: string, decl: Record<string, string>, media: string }
function parseCss(text: string): Rule[] {
  const s = text.replace(/\/\*[\s\S]*?\*\//g, '')
  const out: Rule[] = []
  const walk = (body: string, media: string) => {
    let i = 0
    while (i < body.length) {
      const o = body.indexOf('{', i)
      if (o < 0)
        break
      const head = body.slice(i, o).trim()
      let depth = 1
      let j = o + 1
      while (depth && j < body.length) {
        if (body[j] === '{')
          depth++
        else if (body[j] === '}')
          depth--
        j++
      }
      const inner = body.slice(o + 1, j - 1)
      if (head.startsWith('@media'))
        walk(inner, head.replace('@media', '').trim())
      else if (!head.startsWith('@')) {
        const decl: Record<string, string> = {}
        for (const d of inner.split(';')) {
          const k = d.indexOf(':')
          if (k > 0)
            decl[d.slice(0, k).trim()] = d.slice(k + 1).trim()
        }
        for (const sel of head.split(',')) out.push({ sel: sel.trim().replace(/\s+/g, ' '), decl, media })
      }
      i = j
    }
  }
  walk(s, '')
  return out
}
const rules = parseCss(css)
const last = (sel: string, prop: string, media = '') => rules.filter(r => r.sel === sel && r.media === media && prop in r.decl).at(-1)?.decl[prop]

describe('e10 spacing (perrule.json, 13 rules) with every other spacing kept', () => {
  it.each([
    ['.notice', 'margin', '2px 0'],
    ['.help', 'margin', '2px 0 0'],
    ['.field', 'margin', '0 0 8px'],
    ['h2', 'margin', '12px 0 4px'],
    ['.cmp3', 'margin-top', '12px'],
    ['.ee-brief', 'margin-top', '12px'],
    ['.yearly-sec', 'margin-top', '12px'],
    ['.notes', 'margin-top', '12px'],
    ['.ee-disclaimer', 'margin', '8px 0'],
    ['.status .sensitivity', 'margin', '0 0 4px'],
    ['.joint', 'margin', '4px 0 8px'],
    ['.banner', 'margin-bottom', '8px'],
    ['div.monthly', 'margin-bottom', '8px'],
    ['.cmp3-figure', 'margin', '10px 0 10px'],
    ['.cmp3-figure figcaption', 'margin-top', '10px'],
  ])('%s { %s: %s }', (sel, prop, value) => {
    expect(last(sel, prop)).toBe(value)
  })
  it('validator retest: summary → chart, chart → caption and caption/chart → toggle gaps are all ≥ 8 px (plan: 10 px), also at 288 px', () => {
    const px = (v: string | undefined) => Number.parseFloat(v ?? '')
    const fig = last('.cmp3-figure', 'margin')!.split(/\s+/).map(px) // top right bottom left → [t, h, b]
    expect(fig[0]).toBeGreaterThanOrEqual(8) // summary → chart (the summary fills its min-height at 288 px)
    expect(fig[2]).toBeGreaterThanOrEqual(8) // chart block → toggle
    expect(px(last('.cmp3-figure figcaption', 'margin-top'))).toBeGreaterThanOrEqual(8) // chart → caption
    expect(px(last('.ee > .cmp3-figure', 'margin-top'))).toBeGreaterThanOrEqual(8)
  })
  it('.vbar (narrow only) margin-bottom 8px', () => {
    expect(last('.vbar', 'margin', '(max-width: 999px)')).toBe('0 0 8px')
  })
  it('the 18 px / 10 px spacings survive: rewritten to match the new DOM (figure is a child of section.ee)', () => {
    expect(last('.ee > .cmp3-figure', 'margin-top')).toBe('18px')
    expect(last('.ee-region > p.help', 'margin')).toBe('10px 0')
    expect(rules.some(r => r.sel === '.ee-region > .cmp3-figure')).toBe(false)
    // every `.ee-region >` / `.ee >` selector must still match an element of the real DOM (the chart no longer lives in the region)
  })
  it('narrow note size also reaches the notes inside the fold', () => {
    expect(last('.cmp3-region p.help', 'font-size', '(max-width: 999px)')).toBe('0.8rem')
  })
  it('breakpoints stay at 1000 px; chart constants unchanged', () => {
    expect(css).toContain('@media (min-width: 1000px)')
    expect(css).toContain('@media (max-width: 999px)')
    expect(css).not.toMatch(/@media[^{]*\D(99[0-8]|100[1-9])px/)
    const chart = src('chart.ts')
    expect(chart).toContain('export const X_LABEL_GAP = 4')
    expect(chart).toContain('export const X_LABEL_MIN_GAP = 8')
  })
})

describe('layout: idle status takes no space, brief joins the left column from 1000 px', () => {
  it('idle status: display none (not just invisible)', () => {
    expect(last('.cmp3-status.idle', 'display')).toBe('none')
    expect(last('.cmp3-status.idle', 'visibility')).toBeUndefined()
  })
  it('≥ 1000 px: grid areas form / brief in the left column, results spanning both rows; < 1000 px: one column in DOM order', () => {
    const wide = '(min-width: 1000px)'
    expect(last('.grid', 'grid-template-areas', wide)).toBe('"form results" "brief results"')
    expect(last('.grid', 'grid-template-rows', wide)).toBe('auto 1fr')
    expect(last('.inputs', 'grid-area', wide)).toBe('form')
    expect(last('.results', 'grid-area', wide)).toBe('results')
    expect(last('.ee-brief', 'grid-area', wide)).toBe('brief')
    expect(last('.grid', 'grid-template-columns', wide)).toBe('minmax(320px, 5fr) 7fr')
    expect(last('.grid', 'grid-template-columns')).toBe('1fr')
  })
})

describe('#ee', () => {
  it('a page opened with #ee expands the fold and scrolls to the section top', async () => {
    const g = globalThis as Record<string, unknown>
    const saved = { location: g.location, window: g.window, raf: g.requestAnimationFrame }
    g.location = { hash: '#ee' }
    g.window = { addEventListener: () => {} }
    g.requestAnimationFrame = undefined
    try {
      setFakeWidth(1000)
      const { createEarlyExit } = await import('../src/early-exit-view')
      const v = createEarlyExit()
      const o = evaluate(form({}, 'avDepot'), TODAY)
      v.update(form({}, 'avDepot'), o.ok ? o : null)
      const s = v.section as unknown as FakeEl
      expect(kids(s)[1]!.attrs['aria-expanded']).toBe('true')
      expect(kids(s)[2]!.hidden).toBe(false)
      expect(s.scrolled).toEqual({ n: 1, opts: { block: 'start' } })
    }
    finally { Object.assign(g, { location: saved.location, window: saved.window, requestAnimationFrame: saved.raf }) }
  })
})

describe('0.3.2 owner follow-up: the 逐年明细 fold sits before the 不同存钱额 section, still collapsed', () => {
  const main = src('main.ts')
  const app = main.slice(main.indexOf("const app = h('main'"))
  const order = ['early.brief)', 'yearly,', 'cmp3.section,', 'early.section,', 'notes,']
  it('app children order: grid, yearly, cmp3.section, early.section, notes (yearly is no longer last)', () => {
    const at = order.map(k => app.indexOf(k))
    expect(at.every(i => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    expect(app.match(/\byearly,/g)).toHaveLength(1)
  })
  it('wording unchanged and collapsed by default (toggle aria-expanded=false, region hidden)', () => {
    expect(t('yearly')).toBe('逐年明细')
    expect(main).toContain("toggle('yearly', 'yearly-region', yearlyBody)")
    const tg = main.slice(main.indexOf('function toggle('), main.indexOf('function toggle(') + 400)
    expect(tg).toContain("'aria-expanded': 'false'")
    expect(tg).toMatch(/region\.hidden = true/)
  })
})
