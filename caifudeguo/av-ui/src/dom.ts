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

/** Element showing STR[key] with its data-testid. `data-i18n` lets a language switch rewrite the text. */
export function txt<K extends keyof HTMLElementTagNameMap>(tag: K, key: StrKey, attrs: Attrs = {}, vars: Record<string, string | number> = {}): HTMLElementTagNameMap[K] {
  const marked: Attrs = { 'data-testid': STR[key].id, ...attrs, 'data-i18n': key }
  if (Object.keys(vars).length > 0)
    marked['data-i18n-vars'] = JSON.stringify(vars)
  return h(tag, marked, t(key, vars))
}

/** Rewrite every `data-i18n` node under `root` from the current language. Text-only nodes. */
export function refreshI18n(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')
    if (!key || !(key in STR))
      return
    const raw = el.getAttribute('data-i18n-vars')
    const vars = raw ? JSON.parse(raw) as Record<string, string | number> : {}
    el.textContent = t(key as StrKey, vars)
  })
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria')
    if (key && key in STR)
      el.setAttribute('aria-label', t(key as StrKey))
  })
}
