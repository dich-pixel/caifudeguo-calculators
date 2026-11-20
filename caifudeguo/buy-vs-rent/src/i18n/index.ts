import type { Issue } from '../engine/types'
import type {Dict, Lang} from './messages';
import { FIELD_RANGES } from '../engine/constants'
import { formatDeNumber, formatEUR, formatPct } from '../ui/format'
import { BUNDESLAND_LABELS, de,  dicts,  zh } from './messages'

export type { Dict, Lang }
export { BUNDESLAND_LABELS, de, dicts, zh }

const PCT_FIELDS = new Set([
  'nk_total_pct', 'notary_pct', 'broker_buy_pct', 'maint_pct', 'building_share',
  'maint_growth', 'buyer_other_growth', 'house_growth', 'loan_rate', 'init_tilgung',
  'follow_rate', 'follow_tilgung', 'sondertilgung_pct', 'rent_growth', 'renter_nk_growth',
  'cash_growth', 'etf_return', 'inflation', 'borrow_rate', 'sell_cost_pct',
  'personal_tax_rate', 'mc_sigma', 'mc_sigma_house',
])

export function getDict(lang: Lang): Dict {
  return dicts[lang] ?? zh
}

export function fieldLabel(dict: Dict, field?: string): string {
  if (!field)
    return ''
  return dict.fields[field] ?? field
}

function formatBound(field: string | undefined, value: string | number): string {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return String(value)
  if (field && PCT_FIELDS.has(field))
    return formatPct(value)
  if (field === 'house_err' || field === 'etf_err')
    return formatDeNumber(value, 1)
  if (field && ['price', 'renovation', 'down_payment', 'wealth', 'buyer_other_costs', 'renter_nebenkosten', 'renter_renovation', 'cash_monthly', 'rent'].includes(field))
    return formatEUR(value, 0)
  return formatDeNumber(value, Number.isInteger(value) ? 0 : 2)
}

export function formatIssue(dict: Lang | Dict, issue: Issue): string {
  const d = typeof dict === 'string' ? getDict(dict) : dict
  const lang: Lang = d === de ? 'de' : 'zh'
  let tmpl = d.issues[issue.id] ?? issue.id
  const fieldName = fieldLabel(d, issue.field)
  const whoRaw = issue.params?.who
  const who = whoRaw === 'buyer'
    ? (lang === 'zh' ? '买房者' : 'Käuferseite')
    : whoRaw === 'renter'
      ? (lang === 'zh' ? '租房者' : 'Mietseite')
      : (lang === 'zh' ? '一方' : 'eine Seite')
  tmpl = tmpl.replaceAll('{字段}', fieldName)
  tmpl = tmpl.replaceAll('{who}', who)
  if (issue.params) {
    for (const [k, v] of Object.entries(issue.params)) {
      if (k === 'x')
        tmpl = tmpl.replaceAll('{x}', formatDeNumber(Number(v)))
      else if (k === 'rate')
        tmpl = tmpl.replaceAll('{rate}', formatPct(Number(v)))
      else if (k === 'min' || k === 'max')
        tmpl = tmpl.replaceAll(`{${k}}`, formatBound(issue.field, v))
      else
        tmpl = tmpl.replaceAll(`{${k}}`, String(v))
    }
  }
  if (issue.id === 'E-RATE' && issue.field && FIELD_RANGES[issue.field]) {
    const r = FIELD_RANGES[issue.field]!
    tmpl = tmpl.replaceAll('{min}', formatBound(issue.field, r.min))
    tmpl = tmpl.replaceAll('{max}', formatBound(issue.field, r.max))
  }
  return tmpl
}
