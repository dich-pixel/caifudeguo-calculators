import type { Inputs } from '../engine'
import {
  compute,
  DEFAULT_CONFIG,
  DEFAULT_INPUTS,
  Pcg32,
  PRNG_INITSEQ,
  runMonteCarlo,
  scenarioMatrix,
  TAX_RATE,
} from '../engine'

export interface TestApi {
  compute: typeof compute
  runMonteCarlo: typeof runMonteCarlo
  scenarioMatrix: typeof scenarioMatrix
  Pcg32: typeof Pcg32
  createPrng: (seed: number, initseq?: number) => Pcg32
  defaults: typeof DEFAULT_INPUTS
  config: typeof DEFAULT_CONFIG
  TAX_RATE: typeof TAX_RATE
  PRNG_INITSEQ: typeof PRNG_INITSEQ
  shareUrl?: () => string
  getInputs?: () => Inputs
}

export interface TestApiHooks {
  shareUrl: () => string
  getInputs: () => Inputs
}

declare global {
  interface Window {
    CaifuBuyVsRentTest?: TestApi
  }
}

export function shouldEnableTestApi(
  settings: { testInterface?: boolean } | undefined,
): boolean {
  const host = typeof location !== 'undefined' ? location.hostname : ''
  const onProd = /(?:^|\.)caifudeguo\.de$/i.test(host)
  if (onProd) return false
  if (settings?.testInterface) return true
  try {
    const params = new URLSearchParams(location.search)
    return params.get('cbr_test') === '1'
  } catch {
    return false
  }
}

export function attachTestApi(hooks?: TestApiHooks): TestApi {
  const api: TestApi = {
    compute,
    runMonteCarlo,
    scenarioMatrix,
    Pcg32,
    createPrng: (seed, initseq = PRNG_INITSEQ) => new Pcg32(seed, initseq),
    defaults: DEFAULT_INPUTS,
    config: DEFAULT_CONFIG,
    TAX_RATE,
    PRNG_INITSEQ,
    shareUrl: hooks?.shareUrl,
    getInputs: hooks?.getInputs,
  }
  window.CaifuBuyVsRentTest = api
  return api
}
