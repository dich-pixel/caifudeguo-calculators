// follow-up: CSP has no 'unsafe-eval'. Zod's JIT probe (`new Function('')`) must never run in the app:
// main.ts imports ./_zod-jitless as its FIRST value import (module evaluation order = import order), and it sets jitless.
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it('main.ts: first value import is ./_zod-jitless; it sets zod jitless', async () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')
  const first = main.split('\n').find(l => /^import (?!type)/.test(l))
  expect(first).toBe(`import { zodJitless } from './_zod-jitless'`)
  const { zodJitless } = await import('../src/_zod-jitless')
  expect(zodJitless).toBe(true)
})
