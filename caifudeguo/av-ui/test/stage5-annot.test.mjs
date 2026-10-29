import { readFileSync } from 'node:fs'
// follow-up (after 6f2863a): stage 4 chart at ≤ 375 px — annotations never collide, stacked x labels have leader lines
import { beforeEach, describe, expect, it } from 'vitest'
import { earlyExitFor } from '../src/early-exit'
import { DEFAULTS } from '../src/model'
import { all, installFakeDom } from './fake-dom'

const TODAY = new Date(2026, 9, 17)
const form = (f = {}, mode = 'avDepot') =>
  ({ ...structuredClone(DEFAULTS), taxSavingsMode: mode, kids: [], fields: { ...DEFAULTS.fields, ...f } })
const est = t => [...t].reduce((n, c) => n + (/[\u3000-\uFFFF]/.test(c) ? 13 : 7), 0)
// x is the start, centre or end of the text (text-anchor; a tspan inherits it from its text)
const tbox = (n, anchor = n.attrs['text-anchor']) => {
  const w = est(n.textContent)
  const l = Number(n.attrs.x) - (anchor === 'middle' ? w / 2 : anchor === 'end' ? w : 0)
  return { l, r: l + w, t: Number(n.attrs.y) - 11, b: Number(n.attrs.y) + 3, s: n.textContent }
}
const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b
const pts = s => s.trim().split(/\s+/).map(p => p.split(',').map(Number))
const samples = (ps) => {
  const out = []
  for (let i = 1; i < ps.length; i++) {
    const [a, b] = [ps[i - 1], ps[i]]
    for (let k = 0; k <= 20; k++) out.push([a[0] + (b[0] - a[0]) * k / 20, a[1] + (b[1] - a[1]) * k / 20])
  }
  return out
}
const INPUTS = {
  'default': form(),
  'zvE 20.000 / refunds spent': form({ zveSavingsPhase: '20.000' }, 'consume'),
  'zvE 15.000 / retirement 8.000': form({ zveSavingsPhase: '15.000', zveRetirement: '8.000' }),
}
// the e2e matrix (viewport 288/320/343/375/800 px = chart 264/296/319/351/776 px)
const MATRIX = {
  ...INPUTS,
  'zvE 80.000 / secondary depot': form({ zveSavingsPhase: '80.000', zveRetirement: '40.000' }, 'secondaryDepot'), // same input as the validator / e2e
}
const VIEWPORTS = [288, 320, 343, 375, 800, 1280]
// PM decision (option a): only at these screen widths may exactly these kink labels be left out; markers stay drawn
const ALLOWED_UNPLACED = {
  288: { 'default': '1800', 'zvE 20.000 / refunds spent': '360 1800', 'zvE 15.000 / retirement 8.000': '1800', 'zvE 80.000 / secondary depot': '360 1800' },
  320: { 'default': '1800', 'zvE 20.000 / refunds spent': '360', 'zvE 15.000 / retirement 8.000': '1800', 'zvE 80.000 / secondary depot': '360' },
}
// PM-approved single-combination exceptions (23.10.2026) — nowhere else
// 「你的金额」 may cross the dashed 6.840 line only at these [viewport, input] combinations
const EXC_USER_CROSS = [[288, 'zvE 80.000 / secondary depot'], [288, 'zvE 15.000 / retirement 8.000']]
const CAP_TEXT = '一份合同每年的上限'
// PM rule (23.10.2026): glyph boxes of two texts ≥ 4 px apart. Scope in ONE place: 'all' = every pair of texts;
// 'tick-xlabel' = only axis numbers × x-axis labels (cases C / D), should the PM narrow it later
const GLYPH_GAP = 4
const GLYPH_GAP_SCOPE = 'all'
const kindOf = n => /^xl(?: user)?$/.test(n.attrs.class ?? '') ? 'xlabel' : (n.attrs.class === undefined && /^[−\d.]+(?: %)?$/.test(n.textContent) ? 'tick' : 'other')
const inGlyphScope = (a, b) => GLYPH_GAP_SCOPE === 'all' || (a === 'tick' && b === 'xlabel') || (a === 'xlabel' && b === 'tick')
const inLegend = (svg, n) => all(svg, g => g.tag === 'g' && g.attrs.class === 'legend').some(g => all(g, x => x === n).length > 0)
const WIDTHS = [288, 320, 343, 375]

let drawChart, sweep, namedAmounts, clearSweepCache
beforeEach(async () => {
  installFakeDom()
  ;({ drawChart } = await import('../src/chart'))
  ;({ sweep, namedAmounts, clearSweepCache } = await import('../src/compare'))
})
const chart = (f, w) => {
  clearSweepCache()
  const s = sweep(f, undefined, { today: TODAY })
  return { s, svg: drawChart(s.rows, w, namedAmounts(s)) }
}
const annotations = svg => [...new Set([
  ...all(svg, n => n.tag === 'text' && n.attrs.class === 'user-label'),
  ...all(svg, n => n.tag === 'g' && (n.attrs['data-testid'] ?? '').startsWith('cmp3-marker-')).flatMap(g => all(g, n => n.tag === 'text')),
])].flatMap(n => {
  const ts = all(n, c => c.tag === 'tspan')
  return ts.length ? ts.map(t => tbox(t, n.attrs['text-anchor'])) : [tbox(n)]
})

describe.each(Object.keys(INPUTS))('%s', (name) => {
  it.each(WIDTHS)('%i px: annotations clear of each other, markers, left-axis labels, curves and dashed lines', (w) => {
    const { svg } = chart(INPUTS[name], w)
    const ann = annotations(svg)
    expect(ann.length).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < ann.length; i++) for (let j = i + 1; j < ann.length; j++) expect(hit(ann[i], ann[j]), `${ann[i].s} × ${ann[j].s}`).toBe(false)
    const markers = [
      ...all(svg, n => n.tag === 'circle').map(c => ({ l: +c.attrs.cx - +c.attrs.r, r: +c.attrs.cx + +c.attrs.r, t: +c.attrs.cy - +c.attrs.r, b: +c.attrs.cy + +c.attrs.r })),
      ...all(svg, n => n.tag === 'rect' && n.attrs.class === 'kink').map(r => ({ l: +r.attrs.x, r: +r.attrs.x + 10, t: +r.attrs.y, b: +r.attrs.y + 10 })),
    ]
    const left = all(svg, n => n.tag === 'text' && n.attrs.class === undefined && !n.attrs.transform && Number(n.attrs.x) < 78 && /\d/.test(n.textContent) && Number(n.attrs.y) > 46).map(tbox)
    expect(left.length).toBeGreaterThanOrEqual(2)
    const curves = all(svg, n => n.tag === 'polyline').flatMap(p => samples(pts(p.attrs.points)))
    const dashed = all(svg, n => n.tag === 'line' && n.attrs.class === 'cap').flatMap(l => samples([[+l.attrs.x1, +l.attrs.y1], [+l.attrs.x2, +l.attrs.y2]]))
    for (const a of ann) {
      for (const m of markers) expect(hit(a, m), `${a.s} × marker`).toBe(false)
      for (const l of left) expect(hit(a, l), `${a.s} × ${l.s}`).toBe(false)
      for (const [x, y] of [...curves, ...dashed]) expect(hit(a, { l: x, r: x, t: y, b: y }) && x > a.l && x < a.r && y > a.t && y < a.b, `${a.s} × line @${x},${y}`).toBe(false)
    }
  })
  it.each(WIDTHS)('%i px: every stacked x label has a leader line ending at its tick x, not crossing other labels', (w) => {
    const { svg, s } = chart(INPUTS[name], w)
    const xl = all(svg, n => n.tag === 'text' && /^xl(?: user)?$/.test(n.attrs.class ?? ''))
    const y0 = Math.min(...xl.map(n => +n.attrs.y))
    const leaders = all(svg, n => n.tag === 'line' && n.attrs.class === 'xl-leader')
    for (const a of namedAmounts(s)) expect(xl.map(n => n.textContent)).toContain(a.toLocaleString('de-DE'))
    for (const n of xl.filter(n => +n.attrs.y > y0)) {
      const tick = +n.attrs['data-tick']
      const ld = leaders.find(l => +l.attrs.x1 === tick)
      expect(ld, `leader for ${n.textContent}`).toBeTruthy()
      expect(+ld.attrs.x2).toBe(tick)
      expect(+ld.attrs.y2).toBeCloseTo(+n.attrs.y - 11, 5)
      const b = tbox(n)
      expect(tick).toBeGreaterThanOrEqual(b.l)
      expect(tick).toBeLessThanOrEqual(b.r)
      for (const o of xl.filter(o => +o.attrs.y < +n.attrs.y).map(tbox)) expect(tick > o.l && tick < o.r, `${n.textContent} leader × ${o.s}`).toBe(false)
    }
  })
  it.each([...WIDTHS, 800])('%i px: every annotation within 48 px of its own marker (leader when offset), 「你的金额」 inside the plot', (w) => {
    const { svg } = chart(INPUTS[name], w)
    const plot = svg.attrs['data-plot'] ? svg.attrs['data-plot'].split(' ').map(Number) : null
    const u = all(svg, n => n.tag === 'circle' && n.attrs.class === 'pt user')[0]
    const ul = all(svg, n => n.attrs.class === 'user-label')[0]
    expect(ul, 'user label drawn').toBeTruthy()
    const groups = [[ul, { l: +u.attrs.cx - 6, r: +u.attrs.cx + 6, t: +u.attrs.cy - 6, b: +u.attrs.cy + 6 }, all(svg, n => n.tag === 'g' && n.attrs['data-testid']?.startsWith('cmp3-point-') && n.children.includes(ul))[0]]]
    for (const g of all(svg, n => n.tag === 'g' && /^cmp3-marker-(?:360|1800)$/.test(n.attrs['data-testid'] ?? ''))) {
      const r = all(g, n => n.tag === 'rect')[0]
      const tx = all(g, n => n.tag === 'text')[0]
      if (tx)
        groups.push([tx, { l: +r.attrs.x, r: +r.attrs.x + 10, t: +r.attrs.y, b: +r.attrs.y + 10 }, g])
      else
        expect(svg.attrs['data-unplaced'] ?? '', 'missing kink label must be reported').toContain(g.attrs['data-testid'].slice(12))
    }
    for (const [tx, m, g] of groups) {
      const ts = all(tx, c => c.tag === 'tspan')
      const bs = ts.length ? ts.map(t => tbox(t, tx.attrs['text-anchor'])) : [tbox(tx)]
      const box = { l: Math.min(...bs.map(b => b.l)), r: Math.max(...bs.map(b => b.r)), t: Math.min(...bs.map(b => b.t)) + 3, b: Math.max(...bs.map(b => b.b)) - 3 }
      const gap = Math.max(0, box.l - m.r, m.l - box.r, box.t - m.b, m.t - box.b)
      expect(gap, `${tx.textContent} gap`).toBeLessThanOrEqual(48)
      if (gap > 12)
        expect(all(g, n => n.tag === 'line' && n.attrs.class === 'ann-leader').length, `${tx.textContent} leader`).toBe(1)
    }
    if (plot) {
      const [l, t, r, b] = plot
      const bs = (all(ul, c => c.tag === 'tspan').length ? all(ul, c => c.tag === 'tspan').map(x => tbox(x, ul.attrs['text-anchor'])) : [tbox(ul)])
      for (const x of bs) expect(x.l >= l && x.r <= r && x.t + 3 >= t && x.b - 1 <= b, `user label inside plot @${w}`).toBe(true)
    }
  })
})

describe.each(Object.keys(MATRIX))('%s', (name) => {
  it.each(VIEWPORTS)('%i px viewport: labels left out only where allowed (exact list), markers still drawn', (w) => {
    const { svg } = chart(MATRIX[name], w - 24)
    const want = ALLOWED_UNPLACED[w]?.[name] ?? ''
    expect((svg.attrs['data-unplaced'] ?? '').split(' '), '「你的金额」 is never left out').not.toContain('user')
    expect(svg.attrs['data-unplaced'] ?? '').toBe(want)
    const marks = all(svg, n => n.tag === 'g' && /^cmp3-marker-(?:360|1800)$/.test(n.attrs['data-testid'] ?? ''))
    expect(marks.length).toBe(2)
    for (const g of marks) {
      expect(all(g, n => n.tag === 'rect' && n.attrs.class === 'kink').length, g.attrs['data-testid']).toBe(1)
      expect(all(g, n => n.tag === 'text').length, g.attrs['data-testid']).toBe(want.split(' ').includes(g.attrs['data-testid'].slice(12)) ? 0 : 1)
    }
    expect(all(svg, n => n.attrs.class === 'user-label').length).toBe(1)
  })
  it.each(VIEWPORTS)('%i px viewport: 「你的金额」 fully inside the plot (rendered box: 1.5 px above / below the layout box)', (w) => {
    const { svg } = chart(MATRIX[name], w - 24)
    const [l, t, r, b] = svg.attrs['data-plot'].split(' ').map(Number)
    const ul = all(svg, n => n.attrs.class === 'user-label')[0]
    expect(ul, 'user label drawn').toBeTruthy()
    const ts = all(ul, c => c.tag === 'tspan')
    for (const x of ts.length ? ts.map(c => tbox(c, ul.attrs['text-anchor'])) : [tbox(ul)])
      expect(x.l >= l && x.r <= r && x.t - 1.5 >= t && x.b + 1.5 <= b, `user label ${JSON.stringify(x)} inside plot ${[l, t, r, b]}`).toBe(true)
  })
  it.each(VIEWPORTS)('%i px viewport: glyph boxes of any two texts ≥ 4 px apart (scope: GLYPH_GAP_SCOPE)', (w) => {
    const { svg } = chart(MATRIX[name], w - 24)
    // glyph box of a 12 px text: baseline −10.5 … +1.5 (the full line box trimmed 2.5 px top and bottom, as in the e2e)
    // one box per <text> (a multi-line label is one text: the union of its lines, like getBoundingClientRect)
    const glyphs = (n) => {
      const bs = all(n, c => c.tag === 'tspan').length ? all(n, c => c.tag === 'tspan').map(c => tbox(c, n.attrs['text-anchor'])) : [tbox(n)]
      return [{ l: Math.min(...bs.map(b => b.l)), r: Math.max(...bs.map(b => b.r)), t: Math.min(...bs.map(b => b.t)) + 0.5, b: Math.max(...bs.map(b => b.b)) - 1.5, s: n.textContent, kind: kindOf(n) }]
    }
    const texts = all(svg, n => n.tag === 'text' && !n.attrs.transform && n.attrs.class !== 'title' && !inLegend(svg, n)).flatMap(glyphs)
    expect(texts.filter(x => x.kind === 'tick').length).toBeGreaterThanOrEqual(4)
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const [a, b] = [texts[i], texts[j]]
        if (!inGlyphScope(a.kind, b.kind))
          continue
        const gap = Math.max(b.l - a.r, a.l - b.r, b.t - a.b, a.t - b.b)
        expect(gap, `"${a.s}" (${a.kind}) × "${b.s}" (${b.kind})`).toBeGreaterThanOrEqual(GLYPH_GAP)
      }
    }
  })
  it.each(VIEWPORTS)('%i px viewport: cap label and annotations clear of every axis tick text (left and right)', (w) => {
    const { svg } = chart(MATRIX[name], w - 24)
    const [l, , r] = svg.attrs['data-plot'].split(' ').map(Number)
    const ticks = all(svg, n => n.tag === 'text' && !n.attrs.transform && n.attrs.class === undefined && /^[−\d.]+(?: %)?$/.test(n.textContent) && (Number(n.attrs.x) < l || Number(n.attrs.x) >= r)).map(n => tbox(n))
    expect(ticks.length).toBeGreaterThanOrEqual(4)
    const cap = all(svg, n => n.tag === 'g' && n.attrs['data-testid'] === 'cmp3-marker-6840').flatMap(g => all(g, n => n.tag === 'text')).flatMap(n => all(n, c => c.tag === 'tspan').length ? all(n, c => c.tag === 'tspan').map(c => tbox(c, n.attrs['text-anchor'])) : [tbox(n)])
    for (const a of [...cap, ...annotations(svg)]) for (const k of ticks) expect(hit(a, k), `${a.s} × ${k.s}`).toBe(false)
  })
  it.each(VIEWPORTS)('%i px viewport: PM exception only at its approved combinations; cap label clear of text, curves, markers; 「你的金额」 not below the zero line; kink labels nearest their own marker', (w) => {
    const { svg } = chart(MATRIX[name], w - 24)
    const boxes = n => (all(n, c => c.tag === 'tspan').length ? all(n, c => c.tag === 'tspan').map(c => tbox(c, n.attrs['text-anchor'])) : [tbox(n)])
    const capG = all(svg, n => n.tag === 'g' && n.attrs['data-testid'] === 'cmp3-marker-6840')[0]
    const capT = all(capG, n => n.tag === 'text')[0]
    const capLine = all(capG, n => n.tag === 'line' && n.attrs.class === 'cap')[0]
    const capX = +capLine.attrs.x1
    // the cap label is never on more than two lines, same characters
    expect(all(capT, c => c.tag === 'tspan').length).toBeLessThanOrEqual(2)
    expect(capT.textContent.replace(/\s/g, '')).toBe(CAP_TEXT)
    // 「你的金额」 across the 6.840 line: only the PM-approved combinations
    const ul = all(svg, n => n.attrs.class === 'user-label')[0]
    const ub = boxes(ul)
    if (ub.some(b => b.l < capX && b.r > capX)) expect(EXC_USER_CROSS.some(([x, n]) => x === w && n === name), '「你的金额」 crosses the 6.840 line outside its exception').toBe(true)
    // cap label clear of all other text, curves, markers, ticks
    const cb = boxes(capT)
    const others = all(svg, n => n.tag === 'text' && n !== capT && !n.attrs.transform && !all(capT, () => true).includes(n)).flatMap(boxes)
    const markers = [
      ...all(svg, n => n.tag === 'circle').map(c => ({ l: +c.attrs.cx - +c.attrs.r, r: +c.attrs.cx + +c.attrs.r, t: +c.attrs.cy - +c.attrs.r, b: +c.attrs.cy + +c.attrs.r })),
      ...all(svg, n => n.tag === 'rect' && n.attrs.class === 'kink').map(r => ({ l: +r.attrs.x, r: +r.attrs.x + 10, t: +r.attrs.y, b: +r.attrs.y + 10 })),
    ]
    const curves = all(svg, n => n.tag === 'polyline').flatMap(p => samples(pts(p.attrs.points)))
    for (const a of cb) {
      for (const o of others) expect(hit(a, o), `cap ${a.s} × ${o.s}`).toBe(false)
      for (const m of markers) expect(hit(a, m), `cap ${a.s} × marker`).toBe(false)
      for (const [x, y] of curves) expect(x > a.l && x < a.r && y > a.t && y < a.b, `cap ${a.s} × curve @${x},${y}`).toBe(false)
    }
    // 「你的金额」 not below the zero line
    const zero = all(svg, n => n.tag === 'line' && n.attrs.class === 'zero')[0]
    if (zero) for (const b of ub) expect(b.b, '「你的金额」 below zero line').toBeLessThanOrEqual(+zero.attrs.y1)
    // each kink label nearer its own marker than any other annotated marker (a user dot on the kink excluded)
    const u = all(svg, n => n.tag === 'circle' && n.attrs.class === 'pt user')[0]
    const kinks = all(svg, n => n.tag === 'g' && /^cmp3-marker-(?:360|1800)$/.test(n.attrs['data-testid'] ?? ''))
    const ctr = g => { const r = all(g, n => n.tag === 'rect')[0]; return [+r.attrs.x + 5, +r.attrs.y + 5] }
    for (const g of kinks) {
      const tx = all(g, n => n.tag === 'text')[0]
      if (!tx) continue
      const bs = boxes(tx)
      const bb = { l: Math.min(...bs.map(b => b.l)), r: Math.max(...bs.map(b => b.r)), t: Math.min(...bs.map(b => b.t)), b: Math.max(...bs.map(b => b.b)) }
      const d = ([x, y]) => Math.hypot(Math.max(0, bb.l - x, x - bb.r), Math.max(0, bb.t - y, y - bb.b))
      const own = ctr(g)
      const rivals = kinks.filter(o => o !== g).map(ctr)
      if (u && Math.hypot(+u.attrs.cx - own[0], +u.attrs.cy - own[1]) > 6) rivals.push([+u.attrs.cx, +u.attrs.cy])
      for (const p of rivals) expect(d(own), `${tx.textContent} nearer to marker @${p}`).toBeLessThan(d(p))
    }
  })
})

// regression (78cbb19 follow-up): a user amount exactly on a kink keeps both labels
describe.each([360, 1800])('user amount on the %i kink', (k) => {
  it.each([320, 343, 375, 800])('%i px: 「你的金额」 and 「拐点」 both drawn', (w) => {
    const { svg } = chart(form({ savingsRate: k.toLocaleString('de-DE') }), w)
    expect(svg.attrs['data-unplaced'] ?? '').toBe('')
    const tx = n => n.textContent
    expect(all(svg, n => n.attrs.class === 'user-label').length).toBe(1)
    expect(all(svg, n => n.attrs.class === 'user-label')[0].textContent).toBe('你的金额')
    const m = all(svg, n => n.tag === 'g' && n.attrs['data-testid'] === `cmp3-marker-${k}`)[0]
    expect(all(m, n => n.tag === 'text').map(t => all(t, c => c.tag === 'tspan').length ? all(t, c => c.tag === 'tspan').map(tx).join(' ') : tx(t)).join('')).toBe(`拐点 ${k.toLocaleString('de-DE')} €`)
  })
})

it('leader lines are styled by CSS class only', async () => {
  const { readFileSync } = await import('node:fs')
  expect(readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')).toMatch(/\.cmp3-svg \.xl-leader \{[^}]*stroke:/)
})

// stage 5 follow-up: checks that so far only the e2e made
const R_GLYPH = (n) => { // glyph box of a text, also when rotated (translate(tx ty) rotate(±90))
  const bs = all(n, c => c.tag === 'tspan').length ? all(n, c => c.tag === 'tspan').map(c => tbox(c, n.attrs['text-anchor'])) : [tbox(n)]
  const g = { l: Math.min(...bs.map(b => b.l)), r: Math.max(...bs.map(b => b.r)), t: Math.min(...bs.map(b => b.t)) + 0.5, b: Math.max(...bs.map(b => b.b)) - 1.5 }
  const m = /^translate\(([-\d.]+)[ ,]+([-\d.]+)\) rotate\((-?90)\)$/.exec(n.attrs.transform ?? '')
  if (!n.attrs.transform)
    return g
  if (!m)
    throw new Error(`unsupported transform ${n.attrs.transform}`)
  const [tx, ty, a] = m.slice(1).map(Number)
  const pts = [[g.l, g.t], [g.r, g.b]].map(([x, y]) => (a === 90 ? [-y, x] : [y, -x])).map(([x, y]) => [x + tx, y + ty])
  return { l: Math.min(pts[0][0], pts[1][0]), r: Math.max(pts[0][0], pts[1][0]), t: Math.min(pts[0][1], pts[1][1]), b: Math.max(pts[0][1], pts[1][1]) }
}
const markerBox = n => n.tag === 'circle'
  ? { l: Number(n.attrs.cx) - Number(n.attrs.r), r: Number(n.attrs.cx) + Number(n.attrs.r), t: Number(n.attrs.cy) - Number(n.attrs.r), b: Number(n.attrs.cy) + Number(n.attrs.r) }
  : { l: Number(n.attrs.x), r: Number(n.attrs.x) + Number(n.attrs.width), t: Number(n.attrs.y), b: Number(n.attrs.y) + Number(n.attrs.height) }
const isMarker = n => (n.tag === 'circle' && /^(?:pt(?: user)?|rel-pt)$/.test(n.attrs.class ?? '')) || (n.tag === 'rect' && n.attrs.class === 'kink')
const MAX_USER_GAP = 48
const LEADER_FROM = 12
describe.each(Object.keys(MATRIX))('%s (follow-up)', (name) => {
  it.each(VIEWPORTS)('%i px viewport: rotated texts (axis titles) glyph boxes ≥ GLYPH_GAP from every other text', (w) => {
    const { svg } = chart(MATRIX[name], w - 24)
    const rot = all(svg, n => n.tag === 'text' && !!n.attrs.transform)
    expect(rot.length, 'both axis titles are rotated texts').toBe(2)
    const others = all(svg, n => n.tag === 'text' && n.attrs.class !== 'title' && !inLegend(svg, n))
    for (const a of rot) {
      const ga = R_GLYPH(a)
      for (const b of others) {
        if (b === a)
          continue
        const gb = R_GLYPH(b)
        const gap = Math.max(gb.l - ga.r, ga.l - gb.r, gb.t - ga.b, ga.t - gb.b)
        expect(gap, `"${a.textContent}" (rotated) × "${b.textContent}"`).toBeGreaterThanOrEqual(GLYPH_GAP)
      }
    }
  })
  it.each(VIEWPORTS)('%i px viewport: 「你的金额」 ≤ 48 px from its dot, and its glyph box overlaps no marker (own dot excepted)', (w) => {
    const { svg } = chart(MATRIX[name], w - 24)
    const ul = all(svg, n => n.attrs.class === 'user-label')[0]
    const own = all(svg, n => n.tag === 'circle' && n.attrs.class === 'pt user')[0]
    expect(ul && own).toBeTruthy()
    const g = R_GLYPH(ul)
    const m = markerBox(own)
    const d = Math.hypot(Math.max(0, g.l - m.r, m.l - g.r), Math.max(0, g.t - m.b, m.t - g.b))
    expect(d, 'glyph box → own dot').toBeLessThanOrEqual(MAX_USER_GAP)
    // tester: a leader line whenever the label is more than LEADER_FROM px from its dot
    const grp = all(svg, n => n.tag === 'g' && n.children.includes(ul))[0]
    const leaders = grp ? all(grp, n => n.tag === 'line' && n.attrs.class === 'ann-leader') : []
    if (d > LEADER_FROM)
      expect(leaders.length, `「你的金额」 ${d.toFixed(1)} px from its dot: leader line drawn`).toBe(1)
    for (const k of all(svg, isMarker).filter(n => n !== own))
      expect(hit(g, markerBox(k)), `「你的金额」 (glyph box) × ${k.tag}.${k.attrs.class} @ ${JSON.stringify(markerBox(k))}`).toBe(false)
  })
})

// follow-up (PM scope change): the views reserve the exact SVG height before drawing (CSSOM min-height);
// acceptance for every input × width: reserved ≥ SVG height and blank below ≤ MAX_BLANK px
const MAX_BLANK = 24
const EE_INPUTS = {
  'default': form(),
  'E3': form({ savingsRate: '3.600' }, 'consume'),
  'E4': form({}, 'secondaryDepot'),
  'E5': form({ savingsRate: '13.500' }),
  'c120': form({ age: '65', savingsRate: '120' }, 'consume'),
}
const viewSrc = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
it('views reserve the computed height before every draw (main + early-exit): placeholder SVG height attribute, no CSSOM', () => {
  const main = viewSrc('cmp3.ts')
  const ee = viewSrc('early-exit-view.ts')
  expect(main.match(/box\.replaceChildren\(chartPlaceholder\(mainChartHeight\(s\.rows, (\w+), namedAmounts\(s\)\)\)\)\n\s+box\.replaceChildren\(labelChart\(drawChart\(s\.rows, \1, namedAmounts\(s\)\), /g)?.length).toBe(1) // 0.3.2: one draw() helper (labelChart adds role=img)
  expect(ee.match(/box\.replaceChildren\(chartPlaceholder\(eeReservedHeight\(e, (\w+)\)\)\)\n\s+box\.replaceChildren\(labelChart\(drawEarlyChart\(e, \1\), /g)?.length).toBe(1)
  for (const f of ['cmp3.ts', 'early-exit-view.ts', 'dom.ts', 'chart.ts']) {
    expect(viewSrc(f), f).not.toMatch(/\.style\b|cssText|setAttribute\(\s*'style'|'style':/)
  }
})
it('placeholder SVG: height attribute only (no style attribute)', async () => {
  const { chartPlaceholder, FALLBACK_CHART_HEIGHT } = await import('../src/chart')
  const ph = chartPlaceholder(232)
  expect(ph.attrs.height).toBe('232')
  expect(ph.attrs.style).toBeUndefined()
  expect(FALLBACK_CHART_HEIGHT).toBe(320)
})
it('main chart: reserved (mainChartHeight) ≥ SVG height and blank ≤ MAX_BLANK, all inputs × widths', async () => {
  const { mainChartHeight } = await import('../src/chart')
  for (const name of Object.keys(MATRIX)) {
    for (const w of VIEWPORTS) {
      const { s, svg } = chart(MATRIX[name], w - 24)
      const h = Number(svg.attrs.height)
      const r = mainChartHeight(s.rows, w - 24, namedAmounts(s))
      expect(r, `${name} @ ${w}: reserved ≥ svg`).toBeGreaterThanOrEqual(h)
      expect(r - h, `${name} @ ${w}: blank below`).toBeLessThanOrEqual(MAX_BLANK)
    }
  }
}, 120_000)
it('early-exit chart: reserved (eeReservedHeight) ≥ SVG height and blank ≤ MAX_BLANK, all early-exit inputs × widths', async () => {
  const { drawEarlyChart, eeReservedHeight } = await import('../src/early-exit-view')
  for (const [name, f] of Object.entries(EE_INPUTS)) {
    const e = earlyExitFor(f, TODAY)
    expect(e.points.length, name).toBeGreaterThan(0)
    for (const w of VIEWPORTS) {
      const h = Number(drawEarlyChart(e, w - 24).attrs.height)
      const r = eeReservedHeight(e, w - 24)
      expect(r, `${name} @ ${w}: reserved ≥ svg`).toBeGreaterThanOrEqual(h)
      expect(r - h, `${name} @ ${w}: blank below`).toBeLessThanOrEqual(MAX_BLANK)
    }
  }
}, 120_000)
it('chart box has no CSS min-height (the SVG / placeholder holds the height, so no blank space)', () => {
  expect(viewSrc('style.css')).not.toMatch(/\.cmp3-chart-box\s*\{[^}]*min-height/)
})
