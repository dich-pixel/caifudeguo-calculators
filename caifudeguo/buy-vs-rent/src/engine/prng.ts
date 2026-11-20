/**
 * PCG32 + Box–Muller, exactly as specified in PRD section 5.8.
 * 64-bit arithmetic uses BigInt modulo 2^64.
 */

const MULT = 6364136223846793005n
const MASK32 = 0xFFFF_FFFFn
const MASK64 = 0xFFFF_FFFF_FFFF_FFFFn

export class Pcg32 {
  private state = 0n
  private inc = 0n

  constructor(initstate: number | bigint = 42, initseq: number | bigint = 54) {
    this.seed(initstate, initseq)
  }

  seed(initstate: number | bigint, initseq: number | bigint): void {
    const s = BigInt(initstate) & MASK64
    const seq = BigInt(initseq) & MASK64
    this.state = 0n
    this.inc = ((seq << 1n) | 1n) & MASK64
    this.nextU32()
    this.state = (this.state + s) & MASK64
    this.nextU32()
  }

  nextU32(): number {
    const old = this.state
    this.state = (old * MULT + this.inc) & MASK64
    const xorshifted = (((old >> 18n) ^ old) >> 27n) & MASK32
    const rot = old >> 59n
    const result = ((xorshifted >> rot) | (xorshifted << ((-rot) & 31n))) & MASK32
    return Number(result)
  }

  /** Uniform in [0, 1) with 53-bit precision. */
  uniform(): number {
    const a = this.nextU32() >>> 5
    const b = this.nextU32() >>> 6
    return (a * 67108864 + b) / 9007199254740992
  }

  /** Standard normal via Box–Muller; consumes two uniforms, returns only z0. */
  normal(): number {
    const u1 = this.uniform()
    const u2 = this.uniform()
    return Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2)
  }
}
