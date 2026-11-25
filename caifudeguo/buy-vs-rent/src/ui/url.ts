import type { Inputs } from '../engine/types'
import { DEFAULT_INPUTS } from '../engine/constants'

const ENUMS = new Set(['nk_mode', 'maint_base', 'follow_mode'])
const BOOLS = new Set(['self_use_exempt', 'use_sparer_kirchen'])
const IGNORED = new Set(['bundesland', 'mc_sigma_house'])
const INTS = new Set(['horizon_years', 'fix_years', 'mc_runs', 'mc_seed'])

/** Query keys that encode calculator inputs (σ_Haus is never shared). */
export const SHARE_INPUT_KEYS: (keyof Inputs)[] = (
  Object.keys(DEFAULT_INPUTS) as (keyof Inputs)[]
).filter((k) => k !== 'mc_sigma_house')

export const INSTANCE_ID_RE = /^[a-z][\w-]{0,31}$/i

export interface ShareContext {
  /** Parent WordPress (or host) page URL, including its query and hash. */
  pageUrl?: string
  /** Instance id (`id` shortcode attr, otherwise bvr1, bvr2, …). */
  instanceId?: string
  /** True when the parent page has more than one calculator embed. */
  namespaced?: boolean
}

export function isShareInputKey(key: string): key is keyof Inputs {
  return (SHARE_INPUT_KEYS as string[]).includes(key)
}

export function isInstanceId(value: string): boolean {
  return INSTANCE_ID_RE.test(value)
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Pick a share-link base: parent page URL, then document.referrer, then the iframe URL.
 */
export function resolveShareBase(
  pageUrl?: string | null,
  referrer?: string | null,
  selfHref?: string | null,
): string {
  if (pageUrl && isHttpUrl(pageUrl)) return pageUrl
  if (referrer && isHttpUrl(referrer)) return referrer
  if (selfHref && isHttpUrl(selfHref)) return selfHref
  if (typeof location !== 'undefined' && isHttpUrl(location.href))
    return location.href
  return 'http://localhost/'
}

export function inputsToQuery(
  inputs: Inputs,
  defaults: Inputs = DEFAULT_INPUTS,
): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(inputs) as [
    keyof Inputs,
    Inputs[keyof Inputs],
  ][]) {
    if (k === 'mc_sigma_house') continue
    const def = defaults[k]
    if (v === def) continue
    if (v === null) {
      if (def !== null) p.set(k, '')
      continue
    }
    if (typeof v === 'boolean') p.set(k, v ? '1' : '0')
    else p.set(k, String(v))
  }
  return p.toString()
}

export function queryToInputs(search: string): Partial<Inputs> {
  const p = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  )
  const out: Partial<Inputs> = {}
  for (const [k, raw] of p.entries()) {
    if (IGNORED.has(k) || !(k in DEFAULT_INPUTS)) continue
    const key = k as keyof Inputs
    if (ENUMS.has(key)) {
      ;(out as Record<string, string>)[key] = raw
      continue
    }
    if (BOOLS.has(key)) {
      ;(out as Record<string, boolean>)[key] =
        raw === '1' || raw === 'true' || raw === 'yes'
      continue
    }
    if (raw === '') {
      ;(out as Record<string, null>)[key] = null
      continue
    }
    const n = Number(raw)
    if (!Number.isFinite(n)) continue
    if (INTS.has(key) && !Number.isInteger(n)) continue
    ;(out as Record<string, number | null>)[key] = n
  }
  return out
}

/**
 * From a parent-page query string, pick the params that belong to one instance.
 *
 * - Prefixed keys (`bvr2.price=…`) always win for that instance.
 * - Unprefixed keys (`price=…`, the historical format) apply when the page has
 *   a single calculator, or — on a multi-instance page — only to the first
 *   embed (document order), so old links still restore the first calculator.
 * - Other instances stay at defaults when they have no prefixed keys.
 */
export function extractInstanceSearch(
  search: string,
  opts: { instanceId: string; multi: boolean; first?: boolean },
): string {
  const p = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  )
  const prefix = `${opts.instanceId}.`
  const prefixed = new URLSearchParams()
  const unprefixed = new URLSearchParams()
  for (const [k, v] of p) {
    if (k.startsWith(prefix)) {
      const key = k.slice(prefix.length)
      if (isShareInputKey(key) && !IGNORED.has(key)) prefixed.set(key, v)
    } else if (isShareInputKey(k) && !IGNORED.has(k)) {
      unprefixed.set(k, v)
    }
  }
  if ([...prefixed.keys()].length) return prefixed.toString()
  if (!opts.multi || opts.first) return unprefixed.toString()
  return ''
}

export function buildShareUrl(
  baseHref: string,
  inputs: Inputs,
  defaults: Inputs = DEFAULT_INPUTS,
  ctx: ShareContext = {},
): string {
  const q = inputsToQuery(inputs, defaults)
  let url: URL
  try {
    url = new URL(baseHref)
  } catch {
    url = new URL(resolveShareBase(null, null, null))
  }
  const usePrefix = Boolean(
    ctx.namespaced && ctx.instanceId && isInstanceId(ctx.instanceId),
  )
  const prefix = usePrefix ? `${ctx.instanceId}.` : ''
  for (const key of SHARE_INPUT_KEYS) url.searchParams.delete(`${prefix}${key}`)
  const next = new URLSearchParams(q)
  for (const [k, v] of next) url.searchParams.set(`${prefix}${k}`, v)
  return url.toString()
}

export function shareUrl(
  inputs: Inputs,
  defaults: Inputs = DEFAULT_INPUTS,
  ctx: ShareContext = {},
): string {
  const referrer = typeof document !== 'undefined' ? document.referrer : ''
  const selfHref = typeof location !== 'undefined' ? location.href : ''
  const base = resolveShareBase(ctx.pageUrl, referrer, selfHref)
  return buildShareUrl(base, inputs, defaults, ctx)
}
