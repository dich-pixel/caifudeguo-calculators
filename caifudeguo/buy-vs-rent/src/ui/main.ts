import type { Chart } from 'chart.js'
import type {ComputeResult, ComputeSuccess, EngineConfig, Inputs, MonteCarloResult, ScenarioCell} from '../engine';
import type {Dict, Lang} from '../i18n';
import type {ChartState} from './charts';
import {
  BASISZINS_YEAR,
  compute,
  DEFAULT_CONFIG,
  mergeConfig,
  mergeInputs,
  PLUGIN_VERSION,
  scenarioMatrix,
} from '../engine'
import { formatIssue, getDict } from '../i18n'
import {
  
  renderCash,
  renderComposition,
  renderLoan,
  renderMatrix,
  renderMc,
  renderMcBands,
  renderNetChart,
  renderTax
} from './charts'
import { downloadCsv, monthlyCsv, yearlyCsv } from './csv'
import { formatDeNumber, formatEUR, formatPct, parseDeNumber, parsePercentInput } from './format'
import { startHeightReporting } from './height'
import { attachTestApi, shouldEnableTestApi } from './test-api'
import { queryToInputs, shareUrl } from './url'
import '../ui/style.css'

interface PageSettings {
  lang?: Lang
  basiszins?: number
  basiszins_year?: number
  defaults?: Partial<Inputs>
  disclaimer_zh?: string
  disclaimer_de?: string
  testInterface?: boolean
  version?: string
}

const MONEY = new Set([
  'price', 'renovation', 'down_payment', 'wealth', 'buyer_other_costs',
  'renter_nebenkosten', 'renter_renovation', 'cash_monthly', 'rent',
])
const PCT = new Set([
  'nk_total_pct', 'grest_pct', 'notary_pct', 'broker_buy_pct', 'maint_pct', 'building_share',
  'maint_growth', 'buyer_other_growth', 'house_growth', 'loan_rate', 'init_tilgung',
  'follow_rate', 'follow_tilgung', 'sondertilgung_pct', 'rent_growth', 'renter_nk_growth',
  'cash_growth', 'etf_return', 'inflation', 'borrow_rate', 'sell_cost_pct',
  'personal_tax_rate', 'kirchen_rate', 'mc_sigma',
])
const POINTS = new Set(['house_err', 'etf_err'])
const INTS = new Set(['horizon_years', 'mc_runs', 'mc_seed'])
const INHERITED = new Set([
  'maint_growth', 'buyer_other_growth', 'follow_rate', 'rent_growth',
  'renter_nk_growth', 'cash_growth',
])

const BASIC: (keyof Inputs)[] = ['price', 'rent', 'wealth', 'down_payment', 'cash_monthly', 'grest_pct', 'horizon_years']
const LOAN: (keyof Inputs)[] = ['loan_rate', 'init_tilgung', 'fix_years', 'follow_rate', 'follow_mode', 'follow_tilgung', 'sondertilgung_pct']
const COSTS: (keyof Inputs)[] = [
  'renovation', 'nk_mode', 'nk_total_pct', 'notary_pct', 'broker_buy_pct',
  'maint_pct', 'maint_base', 'building_share', 'maint_growth',
  'buyer_other_costs', 'buyer_other_growth', 'renter_nebenkosten', 'renter_nk_growth', 'renter_renovation',
]
const GROWTH: (keyof Inputs)[] = ['house_growth', 'rent_growth', 'etf_return', 'inflation', 'cash_growth', 'borrow_rate']
const SELL: (keyof Inputs)[] = ['sell_cost_pct', 'self_use_exempt', 'personal_tax_rate', 'use_sparer_kirchen', 'kirchen_rate']
const RISK: (keyof Inputs)[] = ['house_err', 'etf_err', 'mc_runs', 'mc_sigma', 'mc_seed']

type Tab = 'net' | 'composition' | 'loan' | 'cash' | 'tax' | 'matrix' | 'mc'

const YEAR_SHORTCUTS = [10, 20, 30, 50]

function readSettings(): PageSettings {
  const el = document.getElementById('cbr-settings')
  if (el?.textContent) {
    try {
      return JSON.parse(el.textContent) as PageSettings
    }
    catch { /* ignore */ }
  }
  return window.__CBR_SETTINGS__ ?? {}
}

function $(sel: string, root: ParentNode = document): HTMLElement {
  return root.querySelector(sel) as HTMLElement
}

const settings = readSettings()
function withFixedProductDefaults(partial?: Partial<Inputs>): Inputs {
  return { ...mergeInputs(partial), mc_sigma_house: 0 }
}

let builtinDefaults = withFixedProductDefaults(settings.defaults ?? {})
let lang: Lang = (new URLSearchParams(location.search).get('lang') as Lang) || settings.lang || 'zh'
if (lang !== 'zh' && lang !== 'de')
  lang = 'zh'
let inputs: Inputs = withFixedProductDefaults({ ...builtinDefaults, ...queryToInputs(location.search) })
let liquidated = true
let real = false
let yearMax = inputs.horizon_years
let tab: Tab = 'net'
let result: ComputeResult = compute(inputs, engineConfig())
let matrix: ScenarioCell[] | null = null
let mc: MonteCarloResult | null = null
let debounce: number | undefined
let mcWorker: Worker | null = null
const charts: Record<string, Chart | null> = {}

function engineConfig(): EngineConfig {
  return mergeConfig({
    basiszins: settings.basiszins ?? DEFAULT_CONFIG.basiszins,
  })
}

function dict(): Dict {
  return getDict(lang)
}

function displayValue(key: keyof Inputs, value: Inputs[keyof Inputs]): string {
  if (value === null || value === undefined)
    return ''
  if (typeof value === 'boolean')
    return value ? '1' : '0'
  if (typeof value === 'string')
    return value
  if (PCT.has(key))
    return formatDeNumber(value * 100, 2)
  if (POINTS.has(key))
    return formatDeNumber(value, 1)
  if (INTS.has(key) || key === 'fix_years')
    return formatDeNumber(value, 0)
  if (MONEY.has(key))
    return formatDeNumber(value, Number.isInteger(value) ? 0 : 2)
  return String(value)
}

function parseField(key: keyof Inputs, raw: string): Inputs[keyof Inputs] | typeof Number.NaN {
  if (INHERITED.has(key) && raw.trim() === '')
    return null
  if (key === 'fix_years' && raw.trim() === '')
    return null
  if (PCT.has(key))
    return parsePercentInput(raw) ?? Number.NaN
  if (MONEY.has(key) || POINTS.has(key) || INTS.has(key) || key === 'fix_years' || key === 'follow_tilgung') {
    const n = parseDeNumber(raw)
    return n === null ? Number.NaN : n
  }
  return raw as Inputs[keyof Inputs]
}

function fieldHelp(key: string): string | undefined {
  const d = dict()
  return d.help[key]
}

function buildField(key: keyof Inputs): HTMLElement {
  const d = dict()
  const wrap = document.createElement('div')
  wrap.className = 'cbr-field'
  wrap.dataset.field = key
  const label = document.createElement('label')
  label.htmlFor = `cbr-${key}`
  label.innerHTML = `<span class="cbr-label">${d.fields[key] ?? key}</span>`
  const help = fieldHelp(key) || (key === 'nk_mode' || key === 'nk_total_pct' || key === 'notary_pct' || key === 'grest_pct' || key === 'broker_buy_pct' ? d.help.nk : undefined)
    || (key === 'loan_rate' || key === 'init_tilgung' || key === 'fix_years' || key === 'follow_rate' || key === 'follow_mode' ? d.help.loan_rate : undefined)
  if (help) {
    const info = document.createElement('button')
    info.type = 'button'
    info.className = 'cbr-info'
    info.textContent = 'ⓘ'
    info.setAttribute('aria-label', help)
    info.addEventListener('click', (ev) => {
      ev.preventDefault()
      showTip(info, help)
    })
    label.append(info)
  }
  wrap.append(label)

  if (key === 'kirchen_rate') {
    const sel = document.createElement('select')
    sel.id = `cbr-${key}`
    sel.className = 'cbr-select'
    for (const [v, lab] of [['0.08', d.kirchen_8], ['0.09', d.kirchen_9]] as const) {
      const opt = document.createElement('option')
      opt.value = v
      opt.textContent = lab
      if (String(inputs.kirchen_rate) === v)
        opt.selected = true
      sel.append(opt)
    }
    sel.addEventListener('change', () => {
      inputs = { ...inputs, kirchen_rate: Number(sel.value) }
      schedule()
    })
    wrap.append(sel)
    return wrap
  }
  if (key === 'nk_mode' || key === 'maint_base' || key === 'follow_mode') {
    const sel = document.createElement('select')
    sel.id = `cbr-${key}`
    sel.className = 'cbr-select'
    const opts = key === 'nk_mode'
      ? [['detailed', d.nk_detailed], ['total', d.nk_total]]
      : key === 'maint_base'
        ? [['total', d.maint_total], ['building', d.maint_building]]
        : [['keep_payment', d.keep_payment], ['new_tilgung', d.new_tilgung]]
    for (const pair of opts) {
      const v = pair[0] ?? ''
      const lab = pair[1] ?? ''
      const opt = document.createElement('option')
      opt.value = v
      opt.textContent = lab
      if (inputs[key] === v)
        opt.selected = true
      sel.append(opt)
    }
    sel.addEventListener('change', () => {
      (inputs as unknown as Record<string, string>)[key] = sel.value
      schedule()
      syncVisibility()
    })
    wrap.append(sel)
    return wrap
  }
  if (key === 'self_use_exempt' || key === 'use_sparer_kirchen') {
    const sel = document.createElement('select')
    sel.id = `cbr-${key}`
    sel.className = 'cbr-select'
    sel.innerHTML = `<option value="1">${d.yes}</option><option value="0">${d.no}</option>`
    const current = key === 'self_use_exempt' ? inputs.self_use_exempt : inputs.use_sparer_kirchen
    sel.value = current ? '1' : '0'
    sel.addEventListener('change', () => {
      const on = sel.value === '1'
      inputs = key === 'self_use_exempt'
        ? { ...inputs, self_use_exempt: on }
        : { ...inputs, use_sparer_kirchen: on }
      schedule()
      syncVisibility()
    })
    wrap.append(sel)
    return wrap
  }
  if (key === 'fix_years') {
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.gap = '8px'
    row.style.alignItems = 'center'
    const input = document.createElement('input')
    input.id = `cbr-${key}`
    input.className = 'cbr-input'
    input.inputMode = 'numeric'
    input.value = inputs.fix_years === null ? '' : displayValue('fix_years', inputs.fix_years)
    const box = document.createElement('label')
    box.style.fontWeight = '400'
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = inputs.fix_years === null
    box.append(cb, document.createTextNode(` ${d.full_term}`))
    const apply = () => {
      if (cb.checked) {
        inputs = { ...inputs, fix_years: null }
        input.disabled = true
        input.value = ''
      }
      else {
        input.disabled = false
        const n = parseDeNumber(input.value)
        inputs = { ...inputs, fix_years: n !== null && Number.isInteger(n) ? n : 10 }
      }
      schedule()
    }
    cb.addEventListener('change', apply)
    input.disabled = cb.checked
    input.addEventListener('input', apply)
    row.append(input, box)
    wrap.append(row)
    const err = document.createElement('div')
    err.className = 'cbr-err'
    err.id = `cbr-err-${key}`
    wrap.append(err)
    return wrap
  }

  const input = document.createElement('input')
  input.id = `cbr-${key}`
  input.className = 'cbr-input'
  input.inputMode = INTS.has(key) ? 'numeric' : 'decimal'
  input.value = displayValue(key, inputs[key])
  if (INHERITED.has(key)) {
    const ph = d.ph_inherit.replace('{v}', formatPct(inputs.inflation))
    input.placeholder = ph
    if (inputs[key] === null)
      input.classList.add('cbr-placeholder')
  }
  input.addEventListener('input', () => {
    const parsed = parseField(key, input.value)
    if (parsed === null) {
      (inputs as unknown as Record<string, null>)[key] = null
      schedule()
      return
    }
    if (typeof parsed === 'number' && Number.isNaN(parsed))
      return
    ;(inputs as unknown as Record<string, typeof parsed>)[key] = parsed
    schedule()
  })
  wrap.append(input)
  const err = document.createElement('div')
  err.className = 'cbr-err'
  err.id = `cbr-err-${key}`
  wrap.append(err)
  return wrap
}

function showTip(anchor: HTMLElement, text: string): void {
  document.querySelectorAll('.cbr-tip').forEach(n => n.remove())
  const tip = document.createElement('div')
  tip.className = 'cbr-tip'
  tip.setAttribute('role', 'tooltip')
  tip.textContent = text
  document.body.append(tip)
  const r = anchor.getBoundingClientRect()
  tip.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - tip.offsetWidth - 8))}px`
  tip.style.top = `${r.bottom + window.scrollY + 4}px`
  const close = (ev: Event) => {
    if (ev.target === anchor)
      return
    tip.remove()
    document.removeEventListener('click', close, true)
  }
  setTimeout(() => document.addEventListener('click', close, true), 0)
}

function group(title: string, keys: (keyof Inputs)[], open: boolean): HTMLElement {
  const sec = document.createElement('div')
  sec.className = 'cbr-group'
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'cbr-toggle'
  btn.textContent = title
  btn.setAttribute('aria-expanded', open ? 'true' : 'false')
  const body = document.createElement('div')
  body.className = 'cbr-group-body'
  body.hidden = !open
  for (const k of keys)
    body.append(buildField(k))
  btn.addEventListener('click', () => {
    const next = btn.getAttribute('aria-expanded') !== 'true'
    btn.setAttribute('aria-expanded', String(next))
    body.hidden = !next
  })
  sec.append(btn, body)
  return sec
}

function buildApp(): void {
  const d = dict()
  const app = document.createElement('div')
  app.className = 'cbr-app'
  app.innerHTML = `
    <div class="cbr-head">
      <h1>${d.title}</h1>
      <div class="cbr-lang" role="group">
        <button type="button" data-lang="zh" aria-pressed="${lang === 'zh'}">${d.lang_zh}</button>
        <button type="button" data-lang="de" aria-pressed="${lang === 'de'}">${d.lang_de}</button>
      </div>
    </div>
    <p class="cbr-intro">${d.intro}</p>
    <div class="cbr-layout">
      <div class="cbr-inputs cbr-panel"></div>
      <div class="cbr-results"></div>
    </div>
    <footer class="cbr-footer"></footer>
  `
  document.body.replaceChildren(app)
  const inputsEl = $('.cbr-inputs', app)
  inputsEl.append(
    group(d.groups.basic, BASIC, true),
    group(d.groups.loan, LOAN, false),
    group(d.groups.costs, COSTS, false),
    group(d.groups.growth, GROWTH, false),
    group(d.groups.sell, SELL, false),
    group(d.groups.risk, RISK, false),
  )
  const actions = document.createElement('div')
  actions.className = 'cbr-actions'
  actions.innerHTML = `
    <button type="button" class="cbr-btn" id="cbr-mc">${d.run_mc}</button>
    <button type="button" class="cbr-btn secondary" id="cbr-copy">${d.copy_link}</button>
    <button type="button" class="cbr-btn secondary" id="cbr-csv-y">${d.export_yearly}</button>
    <button type="button" class="cbr-btn secondary" id="cbr-csv-m">${d.export_monthly}</button>
    <button type="button" class="cbr-link" id="cbr-reset">${d.reset}</button>
  `
  inputsEl.append(actions)
  $('.cbr-lang', app).addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement
    const next = t.dataset.lang as Lang | undefined
    if (!next || next === lang)
      return
    lang = next
    document.documentElement.lang = next === 'zh' ? 'zh-Hans' : 'de'
    buildApp()
    recalc(true)
  })
  $('#cbr-mc').addEventListener('click', runMc)
  $('#cbr-copy').addEventListener('click', () => {
    const url = shareUrl(inputs, builtinDefaults)
    const fallback = () => {
      const box = document.createElement('input')
      box.value = url
      box.className = 'cbr-input'
      box.setAttribute('aria-label', d.copy_link)
      $('#cbr-copy').insertAdjacentElement('afterend', box)
      box.select()
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        $('#cbr-copy').textContent = d.link_copied
        setTimeout(() => { $('#cbr-copy').textContent = d.copy_link }, 1500)
      }).catch(fallback)
    }
    else {
      fallback()
    }
  })
  $('#cbr-csv-y').addEventListener('click', () => {
    if (result.ok)
      downloadCsv('buy-vs-rent-yearly.csv', yearlyCsv(result.yearly))
  })
  $('#cbr-csv-m').addEventListener('click', () => {
    if (result.ok)
      downloadCsv('buy-vs-rent-monthly.csv', monthlyCsv(result.monthly))
  })
  $('#cbr-reset').addEventListener('click', () => {
    inputs = withFixedProductDefaults(settings.defaults ?? {})
    mc = null
    buildApp()
    recalc(true)
  })
  syncVisibility()
  renderFooter()
}

function syncVisibility(): void {
  const total = inputs.nk_mode === 'total'
  toggleField('nk_total_pct', total)
  toggleField('notary_pct', !total)
  toggleField('broker_buy_pct', !total)
  toggleField('building_share', inputs.maint_base === 'building')
  toggleField('follow_tilgung', inputs.follow_mode === 'new_tilgung')
  toggleField('grest_pct', !total)
  toggleField('personal_tax_rate', !inputs.self_use_exempt)
  toggleField('kirchen_rate', inputs.use_sparer_kirchen)
}

function toggleField(key: string, show: boolean): void {
  const el = document.querySelector(`[data-field="${key}"]`) as HTMLElement | null
  if (el)
    el.hidden = !show
}

function schedule(): void {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => recalc(false), 300)
}

function recalc(immediate: boolean): void {
  result = compute(inputs, engineConfig())
  const mat = scenarioMatrix(inputs, engineConfig())
  matrix = Array.isArray(mat) ? mat : null
  yearMax = Math.min(yearMax, inputs.horizon_years)
  if (yearMax < 1)
    yearMax = inputs.horizon_years
  mc = null
  paintResult()
  void immediate
}

function paintResult(): void {
  const d = dict()
  const root = document.querySelector('.cbr-results') as HTMLElement
  if (!root)
    return
  clearFieldErrors()
  if (!result.ok) {
    root.replaceChildren()
    const box = document.createElement('div')
    box.className = 'cbr-errors'
    const h = document.createElement('p')
    h.textContent = d.errors_heading
    box.append(h)
    for (const err of result.errors) {
      const p = document.createElement('p')
      p.textContent = formatIssue(d, err)
      box.append(p)
      if (err.field) {
        const input = document.getElementById(`cbr-${err.field}`)
        input?.setAttribute('aria-invalid', 'true')
        const slot = document.getElementById(`cbr-err-${err.field}`)
        if (slot)
          slot.textContent = formatIssue(d, err)
      }
    }
    root.append(box)
    return
  }
  renderSuccess(root, result, d)
}

function clearFieldErrors(): void {
  document.querySelectorAll('[aria-invalid]').forEach(n => n.removeAttribute('aria-invalid'))
  document.querySelectorAll('.cbr-err').forEach(n => n.textContent = '')
}

function renderSuccess(root: HTMLElement, r: ComputeSuccess, d: Dict): void {
  const end = r.end
  const diff = end.diff_liq
  const diffReal = end.diff_liq_real
  const n = inputs.horizon_years
  let bannerText: string
  let bannerClass = 'cbr-banner'
  if (Math.abs(diff) < 0.005) {
    bannerText = d.banner_tie.replace('{n}', String(n)).replace('{y}', formatEUR(diffReal))
  }
  else if (diff > 0) {
    bannerText = d.banner_more.replace('{n}', String(n)).replace('{x}', formatEUR(diff)).replace('{y}', formatEUR(diffReal))
  }
  else {
    bannerText = d.banner_less.replace('{n}', String(n)).replace('{x}', formatEUR(-diff)).replace('{y}', formatEUR(-diffReal))
    bannerClass += ' less'
  }

  const issues = [...r.warnings, ...r.infos]
  const warnHtml = issues.length
    ? `<div class="cbr-warns"><p>${d.warnings_heading}</p>${issues.map(i => `<p>${escapeHtml(formatIssue(d, i))}</p>`).join('')}</div>`
    : ''

  const buyerVal = liquidated ? (real ? end.buyer_liq_real : end.buyer_liq) : (real ? end.buyer_nonliq_real : end.buyer_nonliq)
  const renterVal = liquidated ? (real ? end.renter_liq_real : end.renter_liq) : (real ? end.renter_nonliq_real : end.renter_nonliq)
  const buyerBetter = (liquidated ? end.diff_liq : end.diff_nonliq) > 0.005
  const renterBetter = (liquidated ? end.diff_liq : end.diff_nonliq) < -0.005

  const be = r.breakeven_liq
  const beText = be.year === null
    ? d.breakeven_none
    : `${be.year} ${d.years} · ${be.persistent ? d.persistent : d.reversed}`

  root.innerHTML = `
    <div class="${bannerClass}" id="cbr-banner">${escapeHtml(bannerText)}</div>
    ${warnHtml}
    <div class="cbr-switches" role="group">
      <button type="button" class="cbr-chip" data-k="liq" aria-pressed="${liquidated}">${d.toggle_liq}</button>
      <button type="button" class="cbr-chip" data-k="nonliq" aria-pressed="${!liquidated}">${d.toggle_nonliq}</button>
      <button type="button" class="cbr-chip" data-k="nom" aria-pressed="${!real}">${d.toggle_nom}</button>
      <button type="button" class="cbr-chip" data-k="real" aria-pressed="${real}">${d.toggle_real}</button>
    </div>
    <div class="cbr-cards">
      <div class="cbr-card buy">
        <div class="cbr-mlabel">${d.buyer}</div>
        <div class="cbr-mvalue">${formatEUR(buyerVal)}</div>
        <div class="cbr-verdict${buyerBetter ? ' ok' : ''}">${buyerBetter ? d.better_buy : ''}</div>
      </div>
      <div class="cbr-card rent">
        <div class="cbr-mlabel">${d.renter}</div>
        <div class="cbr-mvalue">${formatEUR(renterVal)}</div>
        <div class="cbr-verdict${renterBetter ? ' ok' : ''}">${renterBetter ? d.better_rent : ''}</div>
      </div>
    </div>
    <table class="cbr-kv">
      <tr><th>${d.breakeven}</th><td>${escapeHtml(beText)}</td></tr>
      <tr><th>${d.house_end}</th><td>${formatEUR(end.house)}</td></tr>
      <tr><th>${d.restschuld}</th><td>${formatEUR(end.balance)}</td></tr>
      <tr><th>${d.cum_interest}</th><td>${formatEUR(end.cum_interest)}</td></tr>
      <tr><th>${d.taxes_paid} · ${d.buyer}</th><td>${formatEUR(end.taxes_paid_buyer)}</td></tr>
      <tr><th>${d.taxes_paid} · ${d.renter}</th><td>${formatEUR(end.taxes_paid_renter)}</td></tr>
      <tr><th>${d.latent_tax} · ${d.buyer}</th><td>${formatEUR(end.latent_tax_buyer)}</td></tr>
      <tr><th>${d.latent_tax} · ${d.renter}</th><td>${formatEUR(end.latent_tax_renter)}</td></tr>
      <tr><th>${d.sell_cost}</th><td>${formatEUR(end.sell_cost)}</td></tr>
      <tr><th>${d.spec_tax}</th><td>${formatEUR(end.spec_tax)}</td></tr>
      <tr><th>${d.cost_total}</th><td>${formatEUR(r.derived.cost)}</td></tr>
      <tr><th>${d.loan_amount}</th><td>${formatEUR(r.derived.L0)}</td></tr>
      <tr><th>${d.payment}</th><td>${formatEUR(r.derived.A0)}</td></tr>
      <tr><th>${d.grest}</th><td>${formatEUR(r.derived.grest_amt)} (${formatPct(r.derived.grest_pct)})</td></tr>
      <tr><th>${d.notary}</th><td>${formatEUR(r.derived.notary_amt)} (${formatPct(r.derived.notary_pct)})</td></tr>
      <tr><th>${d.broker}</th><td>${formatEUR(r.derived.broker_amt)} (${formatPct(r.derived.broker_buy_pct)})</td></tr>
      <tr><th>${d.rent_factor}</th><td>${formatDeNumber(r.derived.rent_factor, 2)}</td></tr>
    </table>
    <div class="cbr-year-btns"></div>
    <div class="cbr-chart-tabs" role="tablist"></div>
    <div class="cbr-chart-box"><canvas id="cbr-chart"></canvas></div>
    <div id="cbr-matrix" hidden></div>
    <div id="cbr-mc-extra" hidden>
      <p id="cbr-mc-prob"></p>
      <div class="cbr-chart-box"><canvas id="cbr-chart-mc2"></canvas></div>
      <div class="cbr-progress" hidden><progress id="cbr-mc-prog" max="100" value="0"></progress><span id="cbr-mc-prog-lbl"></span></div>
    </div>
    <details class="cbr-group" style="margin-top:12px">
      <summary class="cbr-toggle" style="list-style:none">${d.yearly_table}</summary>
      <div class="cbr-table-wrap" id="cbr-yearly"></div>
    </details>
    <details class="cbr-group">
      <summary class="cbr-toggle" style="list-style:none">${d.monthly_table}</summary>
      <div class="cbr-table-wrap" id="cbr-monthly"></div>
    </details>
  `

  const switches = $('.cbr-switches', root)
  switches.addEventListener('click', (ev) => {
    const k = (ev.target as HTMLElement).dataset.k
    if (k === 'liq')
      liquidated = true
    else if (k === 'nonliq')
      liquidated = false
    else if (k === 'nom')
      real = false
    else if (k === 'real')
      real = true
    else
      return
    paintResult()
  })

  const ybtns = $('.cbr-year-btns', root)
  for (const y of YEAR_SHORTCUTS) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'cbr-chip'
    b.textContent = `${y} ${d.years}`
    b.disabled = y > inputs.horizon_years
    b.setAttribute('aria-pressed', String(yearMax === y || (y === inputs.horizon_years && yearMax === inputs.horizon_years && !YEAR_SHORTCUTS.includes(yearMax))))
    if (yearMax === y)
      b.setAttribute('aria-pressed', 'true')
    b.addEventListener('click', () => {
      if (b.disabled)
        return
      yearMax = y
      paintResult()
    })
    ybtns.append(b)
  }

  const tabs = $('.cbr-chart-tabs', root)
  const tabIds: Tab[] = ['net', 'composition', 'loan', 'cash', 'tax', 'matrix', 'mc']
  for (const id of tabIds) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'cbr-tab'
    b.dataset.tab = id
    b.textContent = d.charts[id] ?? id
    b.setAttribute('aria-selected', String(tab === id))
    b.addEventListener('click', () => {
      tab = id
      paintResult()
    })
    tabs.append(b)
  }

  fillYearly(r, d)
  fillMonthly(r, d)
  drawCharts(r, d)
}

function fillYearly(r: ComputeSuccess, d: Dict): void {
  const el = document.getElementById('cbr-yearly')
  if (!el)
    return
  const cols: [string, keyof typeof r.yearly[0]][] = [
    [d.table.year ?? 'year', 'year'],
    [d.table.house ?? 'house', 'house'],
    [d.table.balance ?? 'balance', 'balance'],
    [d.table.buyer_liq ?? 'buyer_liq', 'buyer_liq'],
    [d.table.renter_liq ?? 'renter_liq', 'renter_liq'],
    [d.table.diff_liq ?? 'diff_liq', 'diff_liq'],
    [d.table.diff_nonliq ?? 'diff_nonliq', 'diff_nonliq'],
  ]
  el.innerHTML = `<table class="cbr-table"><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${
    r.yearly.map((row) => `<tr>${cols.map((c) => `<td>${c[1] === 'year' ? row.year : formatEUR(row[c[1]] as number)}</td>`).join('')}</tr>`).join('')
  }</tbody></table>`
}

function fillMonthly(r: ComputeSuccess, d: Dict): void {
  const el = document.getElementById('cbr-monthly')
  if (!el)
    return
  const sample = r.monthly.filter((_, i) => i % 12 === 11 || i === 0)
  el.innerHTML = `<table class="cbr-table"><thead><tr>
    <th>${d.table.month}</th><th>${d.table.rate}</th><th>${d.table.interest}</th>
    <th>${d.table.principal}</th><th>${d.table.sonder}</th><th>${d.table.balance}</th>
  </tr></thead><tbody>${
    sample.map(m => `<tr>
      <td>${m.month}</td><td>${formatPct(m.rate)}</td><td>${formatEUR(m.interest)}</td>
      <td>${formatEUR(m.principal)}</td><td>${formatEUR(m.sonder)}</td><td>${formatEUR(m.bal_end)}</td>
    </tr>`).join('')
  }</tbody></table>
  <p class="cbr-help">${d.export_monthly}</p>`
}

function chartState(): ChartState {
  return { liquidated, real, yearMax, inflation: inputs.inflation }
}

function drawCharts(r: ComputeSuccess, d: Dict): void {
  const canvas = document.getElementById('cbr-chart') as HTMLCanvasElement | null
  const matrixEl = document.getElementById('cbr-matrix')
  const mcExtra = document.getElementById('cbr-mc-extra')
  if (!canvas || !matrixEl || !mcExtra)
    return
  const box = canvas.parentElement
  if (tab === 'matrix') {
    if (box)
      box.hidden = true
    matrixEl.hidden = false
    mcExtra.hidden = true
    if (matrix)
      renderMatrix(matrixEl, matrix, liquidated, d)
    return
  }
  if (tab === 'mc') {
    if (box)
      box.hidden = false
    matrixEl.hidden = true
    mcExtra.hidden = false
    if (mc) {
      charts.mc = renderMc(canvas, mc, d, charts.mc ?? null)
      const c2 = document.getElementById('cbr-chart-mc2') as HTMLCanvasElement
      charts.mc2 = renderMcBands(c2, mc, d, charts.mc2 ?? null)
      const prob = document.getElementById('cbr-mc-prob')
      if (prob)
        prob.textContent = `${d.p_buy}: ${formatPct(mc.p_buyer_liq_ge)}`
    }
    else {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
    return
  }
  if (box)
    box.hidden = false
  matrixEl.hidden = true
  mcExtra.hidden = true
  const st = chartState()
  if (tab === 'net')
    charts.net = renderNetChart(canvas, r, st, d, charts.net ?? null)
  else if (tab === 'composition')
    charts.comp = renderComposition(canvas, r, st, d, charts.comp ?? null)
  else if (tab === 'loan')
    charts.loan = renderLoan(canvas, r, st, d, inputs.fix_years, charts.loan ?? null)
  else if (tab === 'cash')
    charts.cash = renderCash(canvas, r, st, d, charts.cash ?? null)
  else if (tab === 'tax')
    charts.tax = renderTax(canvas, r, st, d, charts.tax ?? null)
}

function runMc(): void {
  const d = dict()
  tab = 'mc'
  paintResult()
  const progWrap = document.querySelector('.cbr-progress') as HTMLElement | null
  const prog = document.getElementById('cbr-mc-prog') as HTMLProgressElement | null
  const lbl = document.getElementById('cbr-mc-prog-lbl')
  if (progWrap)
    progWrap.hidden = false
  const btn = document.getElementById('cbr-mc') as HTMLButtonElement | null
  if (btn) {
    btn.disabled = true
    btn.textContent = d.mc_running
  }
  if (mcWorker)
    mcWorker.terminate()
  mcWorker = new Worker(new URL('../worker/mc-worker.ts', import.meta.url), { type: 'module' })
  mcWorker.onmessage = (ev: MessageEvent) => {
    if (ev.data?.type === 'progress') {
      if (prog) {
        prog.max = ev.data.total
        prog.value = ev.data.done
      }
      if (lbl)
        lbl.textContent = d.progress.replace('{done}', ev.data.done).replace('{total}', ev.data.total)
    }
    if (ev.data?.type === 'result') {
      if (ev.data.result && !('ok' in ev.data.result && ev.data.result.ok === false))
        mc = ev.data.result as MonteCarloResult
      if (btn) {
        btn.disabled = false
        btn.textContent = d.run_mc
      }
      if (progWrap)
        progWrap.hidden = true
      paintResult()
    }
  }
  mcWorker.postMessage({ type: 'run', inputs, config: engineConfig() })
}

function renderFooter(): void {
  const d = dict()
  const el = document.querySelector('.cbr-footer') as HTMLElement | null
  if (!el)
    return
  const year = settings.basiszins_year ?? BASISZINS_YEAR
  const ver = settings.version ?? PLUGIN_VERSION
  const disclaimer = lang === 'de'
    ? (settings.disclaimer_de ?? d.disclaimer)
    : (settings.disclaimer_zh ?? d.disclaimer)
  el.innerHTML = `
    <details class="cbr-assumptions">
      <summary>${d.assumptions}</summary>
      <ul>${d.assume_items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      <p>${escapeHtml((inputs.use_sparer_kirchen ? d.help.tax_note_on : d.help.tax_note) ?? '')}</p>
      <p>${escapeHtml(d.help.liq ?? '')}</p>
      <p>${escapeHtml(d.help.real ?? '')}</p>
    </details>
    <p class="cbr-disclaimer">${escapeHtml(disclaimer)}</p>
    <p>${d.version.replace('{v}', ver.replace(/^v/, '')).replace('{y}', String(year))}</p>
  `
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function applySettings(extra?: PageSettings): void {
  if (extra) {
    Object.assign(settings, extra)
    if (extra.lang === 'zh' || extra.lang === 'de')
      lang = extra.lang
    if (extra.defaults) {
      builtinDefaults = withFixedProductDefaults(extra.defaults)
      inputs = withFixedProductDefaults({ ...builtinDefaults, ...queryToInputs(location.search) })
    }
  }
}

function start(): void {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'de'
  if (shouldEnableTestApi(settings))
    attachTestApi()
  buildApp()
  recalc(true)
  startHeightReporting()
}

function boot(): void {
  if (window.parent === window) {
    start()
    return
  }
  let started = false
  const go = (extra?: PageSettings) => {
    if (started)
      return
    started = true
    applySettings(extra)
    start()
  }
  window.addEventListener('message', (event) => {
    if (event.source === window.parent && event.data && event.data.type === 'caifu-buy-vs-rent:settings')
      go(event.data.settings as PageSettings)
  })
  window.parent.postMessage({ type: 'caifu-buy-vs-rent:need-settings' }, '*')
  window.setTimeout(() => go(), 800)
}

boot()
