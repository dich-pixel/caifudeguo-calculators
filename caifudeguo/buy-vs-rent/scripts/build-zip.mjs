// Builds caifu-buy-vs-rent-<version>-<shortsha>.zip (WordPress plugin).
// Usage: node caifudeguo/buy-vs-rent/scripts/build-zip.mjs [--out <dir>] [--allow-dirty] [--allow-node-mismatch]
import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, relative } from 'node:path'
import process from 'node:process'
import { crc32, deflateRawSync } from 'node:zlib'

const root = new URL('../../../', import.meta.url).pathname
const args = process.argv.slice(2)
const outIdx = args.indexOf('--out')
const outDir =
  outIdx >= 0
    ? args[outIdx + 1]
    : join(root, '..', 'engineer-handoff', 'buy-vs-rent')
const EXPECTED_NODE = 'v22.14.0'
const nodeMismatch = process.version !== EXPECTED_NODE
if (nodeMismatch && !args.includes('--allow-node-mismatch')) {
  console.error(
    `Node ${process.version} is running, but the release zip should be built with ${EXPECTED_NODE}.\nOverride: --allow-node-mismatch`,
  )
  process.exit(1)
}
const git = (...a) =>
  execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim()

const dirty = git('status', '--porcelain')
if (dirty && !args.includes('--allow-dirty')) {
  console.error(`working tree not clean, commit first:\n${dirty}`)
  process.exit(1)
}
const sha = git('rev-parse', 'HEAD')
const short = sha.slice(0, 7)
const php = readFileSync(
  join(root, 'caifudeguo/buy-vs-rent/plugin/caifu-buy-vs-rent.php'),
  'utf8',
)
const version = /^ \* Version:\s+(\S+)/m.exec(php)[1]

const childPath = `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`
execFileSync(
  'npx',
  ['vite', 'build', '--config', 'caifudeguo/buy-vs-rent/vite.config.mjs'],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PATH: childPath, CFD_BUILD_SHA: sha },
  },
)

const stage = mkdtempSync(join(tmpdir(), 'cbr-wp-'))
const plugin = join(stage, 'caifu-buy-vs-rent')
cpSync(join(root, 'caifudeguo/buy-vs-rent/plugin'), plugin, { recursive: true })
cpSync(join(root, 'caifudeguo/buy-vs-rent/dist'), join(plugin, 'app'), {
  recursive: true,
})
// Local Playwright hosts / copies must not ship in the plugin zip.
for (const name of [
  'host-wp-column.html',
  'rocket-host.html',
  'rocket-host-cfg.html',
  'embed.js',
]) {
  try {
    rmSync(join(plugin, 'app', name))
  } catch {
    // absent in a non-preview build
  }
}
cpSync(join(root, 'LICENSE'), join(plugin, 'LICENSE'))
mkdirSync(join(plugin, 'source'))
const srcName = `caifudeguo-calculators-${sha}.tar.gz`
execFileSync(
  'git',
  [
    'archive',
    '--format=tar.gz',
    `--prefix=caifudeguo-calculators-${short}/`,
    '-o',
    join(plugin, 'source', srcName),
    sha,
  ],
  { cwd: root },
)
writeFileSync(
  join(plugin, 'SOURCE.txt'),
  [
    'caifu-buy-vs-rent plugin — corresponding source (AGPL-3.0, section 6)',
    '',
    `Built from: https://github.com/dich-pixel/caifudeguo-calculators/tree/${sha}`,
    `Commit:     ${sha}`,
    `Archive:    source/${srcName} (git archive of that commit)`,
    'Build:      pnpm install --frozen-lockfile && node caifudeguo/buy-vs-rent/scripts/build-zip.mjs (Node 22.14.0)',
    `Node:       ${process.version}`,
    ...(nodeMismatch
      ? [`Node version mismatch: expected ${EXPECTED_NODE}`]
      : []),
    '',
  ].join('\n'),
)

function walk(dir) {
  return readdirSync(dir)
    .sort()
    .flatMap((n) => {
      const p = join(dir, n)
      return statSync(p).isDirectory() ? [`${p}/`, ...walk(p)] : [p]
    })
}
const entries = [`${plugin}/`, ...walk(plugin)]
const chunks = []
const central = []
let offset = 0
const dosTime = 0
const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1
for (const p of entries) {
  const isDir = p.endsWith('/')
  const name = Buffer.from(
    isDir ? `${relative(stage, p.slice(0, -1))}/` : relative(stage, p),
  )
  const data = isDir ? Buffer.alloc(0) : readFileSync(p)
  const comp = isDir ? data : deflateRawSync(data, { level: 9 })
  const method = isDir ? 0 : 8
  const crc = isDir ? 0 : crc32(data)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034B50, 0)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(0x0800, 6)
  local.writeUInt16LE(method, 8)
  local.writeUInt16LE(dosTime, 10)
  local.writeUInt16LE(dosDate, 12)
  local.writeUInt32LE(crc, 14)
  local.writeUInt32LE(comp.length, 18)
  local.writeUInt32LE(data.length, 22)
  local.writeUInt16LE(name.length, 26)
  chunks.push(local, name, comp)
  const c = Buffer.alloc(46)
  c.writeUInt32LE(0x02014B50, 0)
  c.writeUInt16LE(0x031E, 4)
  c.writeUInt16LE(20, 6)
  c.writeUInt16LE(0x0800, 8)
  c.writeUInt16LE(method, 10)
  c.writeUInt16LE(dosTime, 12)
  c.writeUInt16LE(dosDate, 14)
  c.writeUInt32LE(crc, 16)
  c.writeUInt32LE(comp.length, 20)
  c.writeUInt32LE(data.length, 24)
  c.writeUInt16LE(name.length, 28)
  c.writeUInt32LE(((isDir ? 0o40755 : 0o100644) << 16) >>> 0, 38)
  c.writeUInt32LE(offset, 42)
  central.push(c, name)
  offset += local.length + name.length + comp.length
}
const cd = Buffer.concat(central)
const end = Buffer.alloc(22)
end.writeUInt32LE(0x06054B50, 0)
end.writeUInt16LE(entries.length, 8)
end.writeUInt16LE(entries.length, 10)
end.writeUInt32LE(cd.length, 12)
end.writeUInt32LE(offset, 16)
const zip = Buffer.concat([...chunks, cd, end])

mkdirSync(outDir, { recursive: true })
const out = join(outDir, `caifu-buy-vs-rent-${version}-${short}.zip`)
writeFileSync(out, zip)
rmSync(stage, { recursive: true, force: true })
console.warn(`${out}\nsha256 ${createHash('sha256').update(zip).digest('hex')}`)
