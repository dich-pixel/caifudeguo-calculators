/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Licensed under AGPL-3.0-only.
 *
 * Tiny DOM helpers: text nodes only, no inline styles (CSP style-src 'self').
 */
import type { StrKey } from './strings'
import { STR, t } from './strings'

export type Attrs = Record<string, string | boolean | undefined>
export type Child = Node | string | null | undefined | false

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false)
      continue
    el.setAttribute(k, v === true ? '' : v)
  }
  for (const c of children) {
    if (c !== null && c !== undefined && c !== false)
      el.append(c)
  }
  return el
}

/** Element showing STR[key] with its data-testid. */
export function txt<K extends keyof HTMLElementTagNameMap>(tag: K, key: StrKey, attrs: Attrs = {}, vars: Record<string, string | number> = {}): HTMLElementTagNameMap[K] {
  return h(tag, { 'data-testid': STR[key].id, ...attrs }, t(key, vars))
}
