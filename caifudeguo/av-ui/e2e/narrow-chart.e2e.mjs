/* eslint-disable antfu/no-top-level-await, no-console -- stand-alone Playwright script (node e2e/narrow-chart.e2e.mjs) */
// Stage 5 follow-up: real-browser checks of the comparison chart at narrow widths (Playwright bounding boxes).
// Not part of `pnpm vitest run` (CI has no browser). Run after `pnpm run av:build`:
//   PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs node caifudeguo/av-ui/e2e/narrow-chart.e2e.mjs [--shots <dir> --suffix after5]
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright')
const args = process.argv.slice(2)
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined)
const shots = opt('--shots')
const suffix = opt('--suffix') ?? 'after5'
const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
const server = createServer((q, s) => {
  try {
    const p = join(dist, decodeURIComponent(new URL(q.url, 'http://x').pathname).replace(/^\/$/, '/index.html'))
    s.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p))
  }
  catch { s.writeHead(404).end() }
}).listen(0)
const port = server.address().port

export const CASES = {
  'default': {},
  'zve20k-consume': { f: { zveSavingsPhase: '20.000' }, m: 'consume' },
  'zve15k-ret8k': { f: { zveSavingsPhase: '15.000', zveRetirement: '8.000' } },
  'zve80k-sec': { f: { zveSavingsPhase: '80.000', zveRetirement: '40.000' }, m: 'secondaryDepot' }, // same input as the validator
}
export const WIDTHS = (process.env.W ? process.env.W.split(",").map(Number) : [288, 320, 343, 375, 800, 1280])
/** max edge gap (glyph box → own marker box) of an annotation, at every width (800/1280 px measured 13–48 px) */
const MAX_GAP = 48
/** PM rule (23.10.2026): any two texts' glyph boxes ≥ 4 px apart; scope in ONE place ('all' | 'tick-xlabel') */
const GLYPH_GAP = 4
const GLYPH_GAP_SCOPE = 'all'
/** PM decision (option a): only at these screen widths may exactly these kink labels be left out (marker and tick stay) */
export const ALLOWED_UNPLACED = {
  288: { 'default': '1800', 'zve20k-consume': '360 1800', 'zve15k-ret8k': '1800', 'zve80k-sec': '360 1800' },
  320: { 'default': '1800', 'zve20k-consume': '360', 'zve15k-ret8k': '1800', 'zve80k-sec': '360' },
}

/** runs inside the page: returns a list of failures for the chart */
function check({ MAX_GAP, unplaced, GLYPH_GAP, GLYPH_GAP_SCOPE }) {
  const svg = document.querySelector('[data-testid=cmp3-chart] svg')
  if (!svg)
    return ['no chart']
  const out = []
  const R = e => e.getBoundingClientRect()
  const S = R(svg)
  const box = r => ({ l: r.left, r: r.right, t: r.top, b: r.bottom })
  const [pl, pt, pr, pb] = svg.dataset.plot.split(' ').map(Number)
  const plot = { l: S.left + pl, t: S.top + pt, r: S.left + pr, b: S.top + pb }
  // glyph box of a 12 px text: the bounding box is the full line box (ascent + descent ≈ 16 px); digits and CJK
  // glyphs sit in its middle ~11 px, so 2.5 px are trimmed at the top and bottom before testing for overlap
  const glyph = (e) => { const r = R(e); return { l: r.left, r: r.right, t: r.top + 2.5, b: r.bottom - 2.5 } }
  const markers = [...svg.querySelectorAll('circle.pt, rect.kink, circle.rel-pt')]
  const inside = (b, o, e = 0.5) => b.l >= o.l - e && b.r <= o.r + e && b.t >= o.t - e && b.b <= o.b + e
  const svgBox = { l: Math.max(S.left, 0), r: Math.min(S.right, window.innerWidth), t: S.top, b: S.bottom }
  const edge = (p, q) => Math.hypot(Math.max(0, p.l - q.r, q.l - p.r), Math.max(0, p.t - q.b, q.t - p.b))
  // markers that carry an annotation (kinks and the user point): a label must be nearer to its own than to these
  const annotated = [...svg.querySelectorAll('rect.kink, circle.pt.user')]
  const anchored = (name, text, marker, leader) => {
    const b = glyph(text)
    const m = box(R(marker))
    if (!inside(box(R(text)), svgBox))
      out.push(`${name}: outside the SVG`)
    const own = edge(b, m)
    if (own > MAX_GAP)
      out.push(`${name}: edge gap to its own marker ${own.toFixed(1)} px (> ${MAX_GAP})`)
    if (own > 12 && !leader)
      out.push(`${name}: ${own.toFixed(1)} px from its marker without a leader line`)
    for (const o of annotated) {
      const ob = box(R(o))
      // the user point drawn on the same amount as the kink is the same data point, not another marker
      if (o === marker || (Math.abs((ob.l + ob.r) - (m.l + m.r)) < 2 && Math.abs((ob.t + ob.b) - (m.t + m.b)) < 2))
        continue
      const d = edge(b, ob)
      if (d <= own)
        out.push(`${name}: nearer to another annotated marker (${d.toFixed(1)} px) than to its own (${own.toFixed(1)} px)`)
    }
    for (const o of markers) {
      const ob = box(R(o))
      const same = Math.abs((ob.l + ob.r) - (m.l + m.r)) < 2 && Math.abs((ob.t + ob.b) - (m.t + m.b)) < 2
      if (o !== marker && !same && edge(b, ob) < 0.5)
        out.push(`${name}: touches another marker`)
    }
    return b
  }
  for (const g of svg.querySelectorAll('g[data-testid^=cmp3-marker-]')) {
    const text = g.querySelector('text')
    const mk = g.querySelector('rect.kink')
    if (text && mk)
      anchored(`kink ${g.dataset.testid.slice(12)}`, text, mk, g.querySelector('line.ann-leader'))
  }
  if ((svg.dataset.unplaced ?? '').split(' ').includes('user'))
    out.push('你的金额 left out (data-unplaced contains "user")')
  // PM rule: glyph boxes (full box trimmed 2.5 px top / bottom) of any two texts (not legend / title) ≥ GLYPH_GAP px apart;
  // the scope is GLYPH_GAP_SCOPE ('all' or 'tick-xlabel' = axis numbers × x-axis labels only)
  const texts = [...svg.querySelectorAll('text')].filter(e => !e.closest('.legend') && !e.classList.contains('title'))
  const kind = e => e.matches('.xl') ? 'xlabel' : (!e.getAttribute('class') && !e.getAttribute('transform') && /^[−\d.]+(?: %)?$/.test(e.textContent) ? 'tick' : 'other')
  const scoped = (p, q) => GLYPH_GAP_SCOPE === 'all' || (p === 'tick' && q === 'xlabel') || (p === 'xlabel' && q === 'tick')
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      if (!scoped(kind(texts[i]), kind(texts[j])))
        continue
      const a = glyph(texts[i])
      const c = glyph(texts[j])
      const gap = Math.max(c.l - a.r, a.l - c.r, c.t - a.b, a.t - c.b)
      if (gap < GLYPH_GAP)
        out.push(`text gap ${gap.toFixed(1)} px (< ${GLYPH_GAP}): "${texts[i].textContent}" × "${texts[j].textContent}"`)
    }
  }
  if ((svg.dataset.unplaced ?? '') !== unplaced)
    out.push(`left out: "${svg.dataset.unplaced ?? ''}", expected exactly "${unplaced}"`)
  for (const g of svg.querySelectorAll('g[data-testid^=cmp3-marker-]')) {
    const a = g.dataset.testid.slice(12)
    if (g.querySelector('rect.kink') && !g.querySelector('text') && !unplaced.split(' ').includes(a))
      out.push(`kink ${a}: label missing`)
  }
  if (!svg.querySelector('text.user-label'))
    out.push('你的金额: label missing')
  for (const a of unplaced.split(' ').filter(Boolean)) {
    const g = svg.querySelector(`g[data-testid=cmp3-marker-${a}]`)
    if (!g?.querySelector('rect.kink'))
      out.push(`left-out label ${a}: its marker is not drawn`)
    if (g?.querySelector('text'))
      out.push(`left-out label ${a}: listed but drawn`)
  }
  const ul = svg.querySelector('text.user-label')
  if (ul) {
    anchored('你的金额', ul, ul.parentNode.querySelector('circle.pt'), ul.parentNode.querySelector('line.ann-leader'))
    const fb = box(R(ul)) // full bounding box, not the trimmed glyph box
    if (!inside(fb, plot))
      out.push(`你的金额: not fully inside the plot area (${fb.l.toFixed(0)}–${fb.r.toFixed(0)} × ${fb.t.toFixed(0)}–${fb.b.toFixed(0)} vs ${plot.l.toFixed(0)}–${plot.r.toFixed(0)} × ${plot.t.toFixed(0)}–${plot.b.toFixed(0)})`)
  }
  // amounts named in the summary sentences: their x-axis label must be visible
  const sum = document.querySelector('[data-testid=cmp3-summary]').textContent
  const tierLabels = new Map([...svg.querySelectorAll('text.xl')].map(e => [e.textContent, e]))
  const tiers = [...document.querySelectorAll('[data-testid=cmp3-region] table tbody th, #cmp3-region table tbody th')].map(e => e.textContent.replace(/[^\d.,]/g, ''))
  const named = [...new Set([...sum.matchAll(/\d{1,3}(?:\.\d{3})*(?:,\d+)?(?=\s*[€–-])/g)].map(m => m[0]))].filter(s => tiers.includes(s))
  const others = [...svg.querySelectorAll('text, circle, rect, polyline:not(.rel):not(.line)')].filter(e => !e.closest('.legend') || e.tagName === 'text')
  for (const n of named) {
    const e = tierLabels.get(n)
    if (!e) {
      out.push(`named ${n}: no x label in the DOM`)
      continue
    }
    const b = glyph(e)
    if (!inside(box(R(e)), svgBox))
      out.push(`named ${n}: clipped (outside the SVG / viewport)`)
    for (const o of others) {
      if (o === e || o.contains(e) || e.contains(o))
        continue
      const q = o.tagName === 'text' ? glyph(o) : box(R(o))
      if (q.r - q.l === 0 && q.b - q.t === 0)
        continue
      const ix = Math.min(b.r, q.r) - Math.max(b.l, q.l)
      const iy = Math.min(b.b, q.b) - Math.max(b.t, q.t)
      if (ix > 0.5 && iy > 0.5)
        out.push(`named ${n}: covered by <${o.tagName} ${o.getAttribute('class') ?? ''}> "${(o.textContent ?? '').slice(0, 12)}" (${ix.toFixed(1)} × ${iy.toFixed(1)} px)`)
    }
    const top = document.elementFromPoint((b.l + b.r) / 2, (b.t + b.b) / 2)
    if (top && top !== e && !svg.contains(top))
      out.push(`named ${n}: hidden under <${top.tagName}>`)
  }
  return { fails: out, named, svgWidth: svg.getAttribute('width') }
}

const b = await chromium.launch()
const all = []
for (const [name, v] of Object.entries(CASES)) {
  for (const w of WIDTHS) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: w < 800, hasTouch: w < 800 })
    // follow-up: record layout shifts (CLS sources) from page start
    await p.addInitScript(() => {
      window.__shifts = []
      new PerformanceObserver(l => window.__shifts.push(...l.getEntries().map(e => ({ t: e.startTime, v: e.value, input: e.hadRecentInput, src: e.sources.map(s => s.node?.className || s.node?.nodeName || '?').join(',') })))).observe({ type: 'layout-shift', buffered: true })
    })
    await p.goto(`http://localhost:${port}/index.html`)
    await p.waitForTimeout(800)
    if (v.m) {
      await p.locator(`[data-testid=radio-${v.m}]`).evaluate((e) => {
        e.checked = true
        e.dispatchEvent(new Event('input', { bubbles: true }))
        e.dispatchEvent(new Event('change', { bubbles: true }))
      })
    }
    for (const [k, val] of Object.entries(v.f ?? {})) {
      await p.locator(`[data-testid=input-${k}]`).evaluate((e, val) => {
        e.value = val
        for (const t of ['input', 'change', 'blur', 'focusout']) e.dispatchEvent(new Event(t, { bubbles: true }))
      }, val)
    }
    await p.waitForTimeout(800)
    const t = p.locator('button[aria-controls=cmp3-region]')
    if (await t.getAttribute('aria-expanded') !== 'true')
      await t.click()
    const t0 = await p.evaluate(() => performance.now())
    await p.waitForTimeout(800)
    // re-render the chart (as when the sweep finishes again) and require CLS = 0 from the open region on
    await p.locator(`[data-testid=input-zveSavingsPhase]`).evaluate((e) => {
      for (const t of ['input', 'change', 'blur', 'focusout']) e.dispatchEvent(new Event(t, { bubbles: true }))
    })
    await p.waitForTimeout(800)
    const shifts = await p.evaluate(t0 => window.__shifts.filter(e => e.t > t0 + 500 && !e.input), t0)
    const cls = shifts.reduce((n, e) => n + e.v, 0)
    const r = await p.evaluate(check, { MAX_GAP, unplaced: ALLOWED_UNPLACED[w]?.[name] ?? '', GLYPH_GAP, GLYPH_GAP_SCOPE })
    const fails = Array.isArray(r) ? r : r.fails
    if (cls > 0)
      fails.push(`CLS ${cls.toFixed(4)} after the chart region opened (sources: ${[...new Set(shifts.map(e => e.src))].join(' | ')})`)
    all.push(...fails.map(f => `${name} @ ${w}: ${f}`))
    console.log(`${fails.length ? '✗' : '✓'} ${name} @ ${w} px${r.named ? ` (chart ${r.svgWidth} px; named: ${r.named.join(', ')})` : ''}`)
    if (shots)
      await p.locator('[data-testid=cmp3-chart] svg').screenshot({ path: join(shots, `cmp3-${name}-${w}-${suffix}.png`) })
    await p.close()
  }
}
await b.close()
server.close()
for (const f of all) console.log(`  ✗ ${f}`)
console.log(all.length ? `${all.length} failure(s)` : 'all checks passed')
process.exitCode = all.length ? 1 : 0
