// follow-up acceptance (PM): no `.style` and no `cssText` (no CSSOM style writes) anywhere in what the WordPress zip is
// built from: the av-ui app (dist is built from it: src, index.html, public) and the whole plugin folder.
// Exactly ONE allowed exception: the iframe auto-resize in assets/embed.js. That script runs on the host WordPress page
// (not inside the calculator app, so outside the app CSP style-src 'self') and sets the height of our iframe from the
// postMessage height; the PM accepted it. Any other hit (or a second hit in embed.js) fails.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const root = fileURLToPath(new URL('../..', import.meta.url))
const walk = d => readdirSync(d).flatMap(n => statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)])
const dirs = ['av-ui/src', 'av-ui/public', 'wp-plugin/caifudeguo-av-depot'].map(d => join(root, d)).filter(existsSync)
const files = [...dirs.flatMap(walk), join(root, 'av-ui/index.html')]
export const ALLOWED = { file: 'wp-plugin/caifudeguo-av-depot/assets/embed.js', line: 'frames[i].style.height = `$' + '{Math.ceil(height)  }px`' }

it('zip sources: 0 `.style` / `cssText` except the single embed.js iframe-height line', () => {
  const hits = files.flatMap(f => readFileSync(f, 'utf8').split('\n').flatMap((l, i) =>
    (l.includes('.style') || l.includes('cssText')) ? [{ file: relative(root, f), n: i + 1, line: l.trim() }] : []))
  const allowed = hits.filter(h => h.file === ALLOWED.file && h.line === ALLOWED.line)
  expect(allowed.length, 'embed.js iframe-height exception').toBe(1)
  expect(hits.filter(h => !allowed.includes(h)).map(h => `${h.file}:${h.n}: ${h.line}`)).toEqual([])
})
