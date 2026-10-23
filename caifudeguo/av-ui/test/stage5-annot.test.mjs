// follow-up (after 6f2863a): stage 4 chart at ≤ 375 px — annotations never collide, stacked x labels have leader lines
import { beforeEach, describe, expect, it } from 'vitest'
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
  'zvE 80.000 / secondary depot': form({ zveSavingsPhase: '80.000' }, 'secondaryDepot'),
}
const VIEWPORTS = [288, 320, 343, 375, 800]
// PM decision (option a): only at these screen widths may exactly these kink labels be left out; markers stay drawn
const ALLOWED_UNPLACED = {
  288: { 'default': '1800', 'zvE 20.000 / refunds spent': '360 1800', 'zvE 15.000 / retirement 8.000': '1800', 'zvE 80.000 / secondary depot': '360 1800' },
  320: { 'default': '1800', 'zvE 20.000 / refunds spent': '360', 'zvE 15.000 / retirement 8.000': '1800' },
}
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
    expect(svg.attrs['data-unplaced'] ?? '').toBe(want)
    const marks = all(svg, n => n.tag === 'g' && /^cmp3-marker-(?:360|1800)$/.test(n.attrs['data-testid'] ?? ''))
    expect(marks.length).toBe(2)
    for (const g of marks) {
      expect(all(g, n => n.tag === 'rect' && n.attrs.class === 'kink').length, g.attrs['data-testid']).toBe(1)
      expect(all(g, n => n.tag === 'text').length, g.attrs['data-testid']).toBe(want.split(' ').includes(g.attrs['data-testid'].slice(12)) ? 0 : 1)
    }
    expect(all(svg, n => n.attrs.class === 'user-label').length).toBe(1)
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
