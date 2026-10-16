/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Licensed under AGPL-3.0-only.
 *
 * German input parsing (plan §8.4). Parsing only converts text to numbers;
 * all ranges are checked by the core zod schema afterwards.
 */

export type ParseError = 'empty' | 'amount' | 'percent' | 'int'
export type ParseResult = { ok: true, value: number } | { ok: false, error: ParseError }

function clean(raw: string): string {
  return raw.replace(/\s/g, '').replace(/€$/, '').replace(/%$/, '')
}

/**
 * Amount fields (€): comma is the decimal separator; a dot is a thousands
 * separator only when followed by exactly 3 digits ("50.000" = 50000,
 * "1.800,50" = 1800.5). "6.5", "6.50", "1.80", "50.0000" are errors.
 */
export function parseAmount(raw: string): ParseResult {
  const v = clean(raw)
  if (v === '')
    return { ok: false, error: 'empty' }
  if (!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(v))
    return { ok: false, error: 'amount' }
  return { ok: true, value: Number(v.replace(/\./g, '').replace(',', '.')) }
}

/** Percent fields: "6,5" and "6.5" both mean 6.5 %. */
export function parsePercent(raw: string): ParseResult {
  const v = clean(raw)
  if (v === '')
    return { ok: false, error: 'empty' }
  if (!/^-?\d+(?:[.,]\d+)?$/.test(v))
    return { ok: false, error: 'percent' }
  return { ok: true, value: Number(v.replace(',', '.')) }
}

/** Integer fields (ages, years). */
export function parseInteger(raw: string): ParseResult {
  const v = clean(raw)
  if (v === '')
    return { ok: false, error: 'empty' }
  if (!/^-?\d+$/.test(v))
    return { ok: false, error: 'int' }
  return { ok: true, value: Number(v) }
}
