// follow-up (after 6f2863a): stage 4 chart at ≤ 375 px — annotations never collide, stacked x labels have leader lines
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULTS } from '../src/model'
import { all, installFakeDom } from './fake-dom'

const TODAY = new Date(2026, 9, 17)
const form = (f = {}, mode = 'avDepot') =>
  ({ ...structuredClone(DEFAULTS), taxSavingsMode: mode, kids: [], fields: { ...DEFAULTS.fields, ...f } })
const est = t => [...t].reduce((n, c) => n + (/[\u3000-\uFFFF]/.test(c) ? 13 : 7), 0)
const tbox = n => ({ l: Number(n.attrs.x), r: Number(n.attrs.x) + est(n.textContent), t: Number(n.attrs.y) - 11, b: Number(n.attrs.y) + 3, s: n.textContent })
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
const annotations = svg => [
  ...all(svg, n => n.tag === 'text' && n.attrs.class === 'user-label'),
  ...all(svg, n => n.tag === 'g' && (n.attrs['data-testid'] ?? '').startsWith('cmp3-marker-')).flatMap(g => all(g, n => n.tag === 'text')),
].flatMap(n => {
  const ts = all(n, c => c.tag === 'tspan')
  return ts.length ? ts.map(tbox) : [tbox(n)]
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
  it('「你的金额」 placement is fixed: always centred on its marker, above (below / inward / beside only when blocked), in fixed 7 px steps', () => {
    for (const w of WIDTHS) {
      const { svg } = chart(INPUTS[name], w)
      const u = all(svg, n => n.tag === 'circle' && n.attrs.class === 'pt user')[0]
      const lab = tbox(all(svg, n => n.attrs.class === 'user-label')[0])
      const cx = +u.attrs.cx
      const near = (a, b) => Math.abs(a - b) < 1e-6
      expect(near((lab.l + lab.r) / 2, cx) || near(lab.l, cx) || near(lab.r, cx) || near(lab.l, cx + 10) || near(lab.r, cx - 10), `${w} px x`).toBe(true)
      const up = +u.attrs.cy - 12 - (lab.b - 3)
      const down = (lab.b - 3) - (+u.attrs.cy + 21)
      expect(Math.abs((lab.b - 3) - (+u.attrs.cy + 4)) < 1e-6 || Array.from({ length: 21 }, (_, k) => 7 * k).some(d => Math.abs(up - d) < 1e-6 || Math.abs(down - d) < 1e-6), `${w} px y ${up}`).toBe(true)
    }
  })
})

it('leader lines are styled by CSS class only', async () => {
  const { readFileSync } = await import('node:fs')
  expect(readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')).toMatch(/\.cmp3-svg \.xl-leader \{[^}]*stroke:/)
})
