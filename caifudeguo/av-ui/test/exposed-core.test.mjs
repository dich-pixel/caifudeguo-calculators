// Stage 5 (PLAN_stage5.md C.1, E): the exposed copy = precise copy + exactly one export line.
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { EXPORT_LINE, generate } from '../scripts/exposed-core.mjs'

const read = f => readFileSync(new URL(`../src/generated/${f}`, import.meta.url), 'utf8')

it('src/generated/av-depot-exposed.ts is the up-to-date transform of the unchanged core', () => {
  expect(read('av-depot-exposed.ts')).toBe(generate())
})
it('differs from the precise copy only by the header comment and the export line', () => {
  const precise = read('av-depot-precise.ts').split('\n').slice(2).join('\n')
  const exposed = read('av-depot-exposed.ts').split('\n').slice(2).join('\n')
  expect(exposed).toBe(precise + EXPORT_LINE)
  expect(EXPORT_LINE.trim().split('\n')).toHaveLength(1)
})
