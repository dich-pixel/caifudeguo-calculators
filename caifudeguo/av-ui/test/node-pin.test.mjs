// Stage 3 g1: Node 22.14.0 pin (.nvmrc, engines hint, CI, build-zip check).
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

const root = new URL('../../../', import.meta.url).pathname
const read = p => readFileSync(root + p, 'utf8')

describe('node pin', () => {
  it('.nvmrc, engines and build-zip agree on 22.14.0', () => {
    expect(read('.nvmrc').trim()).toBe('22.14.0')
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.engines).toEqual({ node: '22.14.0' })
    expect(pkg.packageManager).toBe('pnpm@10.30.3')
    expect(read('caifudeguo/wp-plugin/build-zip.mjs')).toContain('const EXPECTED_NODE = \'v22.14.0\'')
  })
  it('engines is only a hint (no engine-strict)', () => {
    let npmrc = ''
    try { npmrc = read('.npmrc') }
    catch {}
    expect(npmrc).not.toMatch(/engine-strict\s*=\s*true/)
  })
  it('cI reads the version from .nvmrc', () => {
    const yml = read('.github/workflows/caifudeguo.yml')
    expect(yml).toContain('node-version-file: .nvmrc')
    expect(yml).not.toMatch(/node-version: 22\b/)
  })
  it.skipIf(process.version === 'v22.14.0')('build-zip stops on another Node version', () => {
    const r = spawnSync(process.execPath, [`${root}caifudeguo/wp-plugin/build-zip.mjs`, '--allow-dirty', '--out', '/tmp/cfd-nozip'], { encoding: 'utf8' })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('v22.14.0')
  })
})
