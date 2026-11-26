import { describe, expect, it } from 'vitest'
import { Pcg32 } from '../src/engine/prng'

/**
 * Test vectors are stated in PRD section 5.8 (seed = 42, initseq = 54).
 * They must match the official PCG32 minimal C demo output.
 */
describe('pCG32 + Box–Muller (PRD 5.8)', () => {
  it('emits the first six next_u32 values', () => {
    const rng = new Pcg32(42, 54)
    const got = Array.from({ length: 6 }, () => rng.nextU32())
    expect(got.map(v => `0x${v.toString(16)}`)).toEqual([
      '0xa15c02b7',
      '0x7b47f409',
      '0xba1d3330',
      '0x83d2f293',
      '0xbfa4784b',
      '0xcbed606e',
    ])
  })

  it('emits the first three uniforms from a fresh seed', () => {
    const rng = new Pcg32(42, 54)
    const got = [rng.uniform(), rng.uniform(), rng.uniform()]
    expect(got[0]).toBeCloseTo(0.6303102186438938, 15)
    expect(got[1]).toBeCloseTo(0.7270080560068604, 15)
    expect(got[2]).toBeCloseTo(0.7486033647998483, 15)
  })

  it('emits the first three normals from a fresh seed', () => {
    const rng = new Pcg32(42, 54)
    const got = [rng.normal(), rng.normal(), rng.normal()]
    expect(got[0]).toBeCloseTo(-0.20309084013510822, 15)
    expect(got[1]).toBeCloseTo(-0.009138601077208498, 15)
    expect(got[2]).toBeCloseTo(0.6786732010857986, 15)
  })

  it('is deterministic for the same seed', () => {
    const a = new Pcg32(7, 54)
    const b = new Pcg32(7, 54)
    for (let i = 0; i < 20; i++)
      expect(a.nextU32()).toBe(b.nextU32())
  })
})
