import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { generate } from '../scripts/precise-core.mjs'

it('src/generated/av-depot-precise.ts is the up-to-date transform of the unchanged core', () => {
  const current = readFileSync(new URL('../src/generated/av-depot-precise.ts', import.meta.url), 'utf8')
  expect(current).toBe(generate())
})
