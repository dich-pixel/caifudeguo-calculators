import type { Inputs, Lang } from '../engine/types'
import {
  BASISZINS_YEAR,
  DEFAULT_INPUTS,
  FIELD_RANGES,
} from '../engine/constants'
import {
  parseFollowMode,
  parseMaintBase,
  parseNkMode,
} from '../engine/validate'

export interface PageSettings {
  lang?: Lang
  basiszins?: number
  basiszins_year?: number
  defaults?: Partial<Inputs>
  disclaimer_zh?: string
  disclaimer_de?: string
  testInterface?: boolean
  version?: string
}

const BOOL_KEYS = new Set<keyof Inputs>([
  'self_use_exempt',
  'use_sparer_kirchen',
])
const NULLABLE = new Set<keyof Inputs>([
  'maint_growth',
  'buyer_other_growth',
  'fix_years',
  'follow_rate',
  'follow_tilgung',
  'rent_growth',
  'renter_nk_growth',
  'cash_growth',
])
const INT_KEYS = new Set<keyof Inputs>([
  'horizon_years',
  'fix_years',
  'mc_runs',
  'mc_seed',
])
const MAX_TEXT = 20_000
const VERSION_RE = /^\d+(?:\.\d+){0,3}$/
const BASISZINS_MAX = 0.2

export function sanitizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.length > MAX_TEXT ? value.slice(0, MAX_TEXT) : value
}

export function sanitizeVersion(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const s = value.replace(/^v/i, '')
  if (!VERSION_RE.test(s) || s.length > 16) return undefined
  return s
}

export function sanitizeDefaults(raw: unknown): Partial<Inputs> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const src = raw as Record<string, unknown>
  const out: Partial<Inputs> = {}
  for (const key of Object.keys(DEFAULT_INPUTS) as (keyof Inputs)[]) {
    if (key === 'mc_sigma_house') continue
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue
    const parsed = parseDefaultValue(key, src[key])
    if (parsed !== undefined) Object.assign(out, { [key]: parsed })
  }
  return out
}

function parseDefaultValue(
  key: keyof Inputs,
  value: unknown,
): Inputs[keyof Inputs] | undefined {
  if (value === null) return NULLABLE.has(key) ? null : undefined
  if (BOOL_KEYS.has(key)) return typeof value === 'boolean' ? value : undefined
  if (key === 'nk_mode') return parseNkMode(value)
  if (key === 'follow_mode') return parseFollowMode(value)
  if (key === 'maint_base') return parseMaintBase(value)
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (INT_KEYS.has(key) && !Number.isInteger(value)) return undefined
  const range = FIELD_RANGES[key]
  if (range) {
    if (value < range.min || value > range.max) return undefined
    if (range.integer && !Number.isInteger(value)) return undefined
  } else if (key === 'kirchen_rate') {
    if (value < 0 || value > 0.2) return undefined
  }
  return value
}

/**
 * Drop unknown keys and values that are the wrong type or out of range.
 * Callers must use this on every untrusted settings object (postMessage,
 * parent DOM, official endpoint). Unsigned query `cbr_cfg` is not a source.
 */

function own(o: object, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(o, key)
    ? (o as Record<string, unknown>)[key]
    : undefined
}

export function sanitizePageSettings(raw: unknown): PageSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const out: PageSettings = {}
  const lang = own(o, 'lang')
  if (lang === 'zh' || lang === 'de') out.lang = lang
  const basiszins = own(o, 'basiszins')
  if (
    typeof basiszins === 'number' &&
    Number.isFinite(basiszins) &&
    basiszins >= 0 &&
    basiszins <= BASISZINS_MAX
  )
    out.basiszins = basiszins
  const basiszinsYear = own(o, 'basiszins_year')
  if (
    typeof basiszinsYear === 'number' &&
    Number.isInteger(basiszinsYear) &&
    basiszinsYear >= 2000 &&
    basiszinsYear <= 2100
  )
    out.basiszins_year = basiszinsYear
  const discZh = sanitizeText(own(o, 'disclaimer_zh'))
  if (discZh !== undefined) out.disclaimer_zh = discZh
  const discDe = sanitizeText(own(o, 'disclaimer_de'))
  if (discDe !== undefined) out.disclaimer_de = discDe
  const ver = sanitizeVersion(own(o, 'version'))
  if (ver) out.version = ver
  const testInterface = own(o, 'testInterface')
  if (testInterface === true) out.testInterface = true
  else if (testInterface === false) out.testInterface = false
  const defaults = sanitizeDefaults(own(o, 'defaults'))
  if (defaults && Object.keys(defaults).length > 0) out.defaults = defaults
  return out
}

export function explicitPageLang(search?: string): Lang | undefined {
  try {
    const raw =
      search ?? (typeof location !== 'undefined' ? location.search : '')
    const value = new URLSearchParams(
      raw.startsWith('?') ? raw.slice(1) : raw,
    ).get('lang')
    if (value === 'zh' || value === 'de') return value
  } catch {
    /* ignore a malformed query */
  }
  return undefined
}

function restSettingsUrl(
  origin: string,
  sitePath: string,
  lang?: string,
): string | null {
  const path = `${sitePath.replace(/\/$/, '')}/wp-json/caifu-buy-vs-rent/v1/settings`
  let url: URL
  try {
    url = new URL(path, origin)
  } catch {
    return null
  }
  if (url.origin !== origin) return null
  if (lang === 'zh' || lang === 'de') url.searchParams.set('lang', lang)
  return url.href
}

/**
 * Same-origin WP REST endpoint for official settings.
 * Prefers an explicit URL from the parent iframe (data-cbr-settings-url);
 * otherwise derives /wp-json/… from a standard plugin app path.
 */
export function officialSettingsUrl(
  href: string,
  lang?: string,
  advertised?: string | null,
): string | null {
  let here: URL
  try {
    here = new URL(href)
  } catch {
    return null
  }
  if (here.protocol !== 'http:' && here.protocol !== 'https:') return null
  if (advertised) {
    try {
      const advertisedUrl = new URL(advertised, here)
      if (
        advertisedUrl.origin === here.origin &&
        (advertisedUrl.protocol === 'http:' ||
          advertisedUrl.protocol === 'https:') &&
        /\/wp-json\/caifu-buy-vs-rent\/v1\/settings\/?$/i.test(
          advertisedUrl.pathname,
        )
      ) {
        if (lang === 'zh' || lang === 'de')
          advertisedUrl.searchParams.set('lang', lang)
        return advertisedUrl.href
      }
    } catch {
      /* ignore a malformed advertised URL */
    }
  }
  const marker = '/caifu-buy-vs-rent/app/'
  const index = here.pathname.toLowerCase().indexOf(marker)
  if (index < 0) return null
  const before = here.pathname.slice(0, index)
  const pluginsAt = before.toLowerCase().lastIndexOf('/plugins')
  if (pluginsAt < 0) return null
  let root = before.slice(0, pluginsAt)
  root = root.replace(/\/wp-content$/i, '').replace(/\/app$/i, '')
  return restSettingsUrl(here.origin, root || '/', lang)
}

export { BASISZINS_YEAR }
