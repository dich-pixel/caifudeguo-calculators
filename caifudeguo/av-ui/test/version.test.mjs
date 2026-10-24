// Version 0.3.1 in the plugin header, the constant and the readme stable tag (Stage 5 E.6); the 0.3.0 changelog entry stays.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const f = p => readFileSync(new URL(`../../wp-plugin/caifudeguo-av-depot/${p}`, import.meta.url), 'utf8')

describe('version 0.3.1', () => {
  it('three places + changelog', () => {
    expect(f('caifudeguo-av-depot.php')).toMatch(/\* Version: +0\.3\.1\n/)
    expect(f('caifudeguo-av-depot.php')).toContain('define(\'CAIFUDEGUO_AV_DEPOT_VERSION\', \'0.3.1\');')
    expect(f('readme.txt')).toMatch(/^Stable tag: 0\.3\.1$/m)
    expect(f('readme.txt')).toContain('= 0.3.0 =')
  })
})
