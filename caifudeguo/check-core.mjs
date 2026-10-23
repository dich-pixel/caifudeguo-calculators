// Checks that the AV-Depot calculation core is byte-identical to upstream
// finanzfluss/calculators commit dcc29a69bdd8a3943d092e4c86ad42bff2767e1a,
// except for files listed in `allowedChanges` in core-manifest.json.
// Usage: node caifudeguo/check-core.mjs          (check)
//        node caifudeguo/check-core.mjs --write  (regenerate manifest; only for a deliberate, reviewed change)
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import process from 'node:process'
import { generate as generateExposed } from './av-ui/scripts/exposed-core.mjs'
import { generate } from './av-ui/scripts/precise-core.mjs'

const root = new URL('..', import.meta.url).pathname
const manifestPath = join(root, 'caifudeguo/core-manifest.json')
const coreRoots = [
  'src/calculators/av-depot.ts',
  'src/calculators/income-tax.ts',
  'src/constants/av-depot.ts',
  'src/utils',
]

function listFiles(p) {
  const abs = join(root, p)
  if (statSync(abs).isFile()) return [p]
  return readdirSync(abs).flatMap((name) => listFiles(join(p, name)))
}

const files = coreRoots.flatMap(listFiles).sort()
const hashes = Object.fromEntries(
  files.map((f) => [
    f,
    createHash('sha256')
      .update(readFileSync(join(root, f)))
      .digest('hex'),
  ]),
)

if (process.argv.includes('--write')) {
  const old = JSON.parse(readFileSync(manifestPath, 'utf8'))
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ ...old, files: hashes }, null, 2)}\n`,
  )
  console.warn(`core manifest written: ${files.length} files`)
  process.exit(0)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const allowed = new Set(Object.keys(manifest.allowedChanges ?? {}))
const problems = []
for (const [f, h] of Object.entries(manifest.files)) {
  if (!(f in hashes)) problems.push(`missing: ${f}`)
  else if (hashes[f] !== h && !allowed.has(f)) problems.push(`changed: ${f}`)
}
for (const f of files)
  if (!(f in manifest.files))
    problems.push(`new file in core: ${relative(root, join(root, f))}`)

// The AV page runs a mechanically generated copy of av-depot.ts (only depotPair returns raw numbers).
// It must equal the transform of the (unchanged) core above.
const precisePath = 'caifudeguo/av-ui/src/generated/av-depot-precise.ts'
if (readFileSync(join(root, precisePath), 'utf8') !== generate())
  problems.push(`stale generated copy: ${precisePath} (run node caifudeguo/av-ui/scripts/precise-core.mjs)`)
// Stage 5: the early-withdrawal layer uses the same copy plus one export line (scripts/exposed-core.mjs).
const exposedPath = 'caifudeguo/av-ui/src/generated/av-depot-exposed.ts'
if (readFileSync(join(root, exposedPath), 'utf8') !== generateExposed())
  problems.push(`stale generated copy: ${exposedPath} (run node caifudeguo/av-ui/scripts/exposed-core.mjs)`)

if (problems.length) {
  console.error(
    `core check FAILED (upstream ${manifest.upstreamCommit}):\n  ${problems.join('\n  ')}`,
  )
  console.error(
    'Only files listed in allowedChanges (with a reason) may differ from upstream.',
  )
  process.exit(1)
}
const changed = files.filter((f) => hashes[f] !== manifest.files[f])
console.warn(
  `core check ok: ${files.length} files + generated precise and exposed copies up to date, ${changed.length} allowed change(s)${changed.length ? `: ${changed.join(', ')}` : ''}`,
)
