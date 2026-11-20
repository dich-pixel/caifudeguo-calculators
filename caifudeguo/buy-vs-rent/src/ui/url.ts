import type { Inputs } from '../engine/types'
import { DEFAULT_INPUTS } from '../engine/constants'

const ENUMS = new Set(['nk_mode', 'bundesland', 'maint_base', 'follow_mode'])
const BOOLS = new Set(['self_use_exempt'])
const INTS = new Set(['horizon_years', 'fix_years', 'mc_runs', 'mc_seed'])

export function inputsToQuery(inputs: Inputs): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(inputs) as [keyof Inputs, Inputs[keyof Inputs]][]) {
    const def = DEFAULT_INPUTS[k]
    if (v === def)
      continue
    if (v === null) {
      if (def !== null)
        p.set(k, '')
      continue
    }
    if (typeof v === 'boolean')
      p.set(k, v ? '1' : '0')
    else
      p.set(k, String(v))
  }
  return p.toString()
}

export function queryToInputs(search: string): Partial<Inputs> {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const out: Partial<Inputs> = {}
  for (const [k, raw] of p.entries()) {
    if (!(k in DEFAULT_INPUTS))
      continue
    const key = k as keyof Inputs
    if (ENUMS.has(key)) {
      (out as Record<string, string>)[key] = raw
      continue
    }
    if (BOOLS.has(key)) {
      (out as Record<string, boolean>)[key] = raw === '1' || raw === 'true' || raw === 'yes'
      continue
    }
    if (raw === '') {
      (out as Record<string, null>)[key] = null
      continue
    }
    const n = Number(raw)
    if (!Number.isFinite(n))
      continue
    if (INTS.has(key) && !Number.isInteger(n))
      continue
    (out as Record<string, number | null>)[key] = n
  }
  return out
}

export function shareUrl(inputs: Inputs): string {
  const q = inputsToQuery(inputs)
  const base = window.parent === window ? window.location.href : (document.referrer || window.location.href)
  let url: URL
  try {
    url = new URL(base)
  }
  catch {
    url = new URL(window.location.href)
  }
  // Drop previous calculator params, then add the current non-default ones.
  for (const key of Object.keys(DEFAULT_INPUTS))
    url.searchParams.delete(key)
  const next = new URLSearchParams(q)
  for (const [k, v] of next)
    url.searchParams.set(k, v)
  return url.toString()
}
