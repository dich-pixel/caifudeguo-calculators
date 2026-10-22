/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Based on finanzfluss/calculators (AGPL-3.0). Licensed under AGPL-3.0-only.
 * Source: https://github.com/dich-pixel/caifudeguo-calculators
 */
import type { FieldError, FieldName, FormValues, Money, PayoutMoney, Result, TaxSavingsMode } from './model'
import type { StrKey } from './strings'
import { createCmp3 } from './cmp3'
import { foerderung, foerderungKey, verdictSentence } from './compare'
import { h, txt } from './dom'
import { createEarlyExit } from './early-exit-view'
import { formatEuro, formatEuro2, formatNumberDe, roundHalfUp } from './format'
import { DEFAULTS, evaluate, FIELDS, ONE_CONTRACT_CAP, placeCrossField, QUICK_AMOUNTS, remapKidErrors, verdict, withTouchedKids } from './model'
import { CORE_COMMIT_SHORT, CORE_COMMIT_URL, forkCommit, forkSourceUrl, HEIGHT_MESSAGE_TYPE, PARAMS_CHECK_DATE } from './params'
import { parseAmount } from './parse'
import { STR, t } from './strings'
import './style.css'

const state: FormValues = structuredClone(DEFAULTS)
const inputs = new Map<string, HTMLInputElement>()
const errorEls = new Map<string, HTMLElement>()
let lastChanged = ''
const cmp3 = createCmp3()
const early = createEarlyExit()
/** Kid rows touched (typed into or blurred); untouched rows are not calculated (plan f4). */
const kidTouched: boolean[] = []


// ---------- inputs ----------

function field(name: FieldName, labelKey: StrKey, helpKey?: StrKey, extra?: Node): HTMLElement {
  const id = `in-${name}`
  const describedBy = [helpKey ? `help-${name}` : '', `err-${name}`].filter(Boolean).join(' ')
  const input = h('input', {
    'id': id,
    'name': name,
    'type': 'text',
    'inputmode': FIELDS[name] === 'int' ? 'numeric' : 'decimal',
    'autocomplete': 'off',
    'spellcheck': 'false',
    'aria-describedby': describedBy,
    'data-testid': `input-${name}`,
  })
  input.value = state.fields[name]
  input.addEventListener('input', () => {
    state.fields[name] = input.value
    lastChanged = name
    update()
  })
  inputs.set(name, input)
  const err = h('p', { 'id': `err-${name}`, 'class': 'err', 'data-testid': `error-${name}`, 'aria-live': 'polite' })
  errorEls.set(name, err)
  return h('div', { class: 'field' }, txt('label', labelKey, { for: id }), input, err, extra ?? null, helpKey ? txt('p', helpKey, { id: `help-${name}`, class: 'help' }) : null)
}

function savingsQuick(): HTMLElement {
  const wrap = h('div', { 'class': 'quick', 'role': 'group', 'aria-label': t('quickPrefix') + t('savingsRate') }, txt('span', 'quickPrefix', { 'aria-hidden': 'true' }))
  for (const amount of QUICK_AMOUNTS) {
    const b = h('button', { 'type': 'button', 'class': 'chip', 'data-testid': `quick-${amount}` }, formatNumberDe(amount))
    b.addEventListener('click', () => {
      state.fields.savingsRate = formatNumberDe(amount)
      lastChanged = 'savingsRate'
      inputs.get('savingsRate')!.value = state.fields.savingsRate
      update()
    })
    wrap.append(b)
  }
  return wrap
}

const twoContracts = txt('p', 'twoContracts', { class: 'hint', hidden: true })

const kidsList = h('div', { class: 'kids-list' })
const kidAddBtn = txt('button', 'kidAdd', { type: 'button', class: 'linkbtn' })

function renderKids(focusIndex?: number) {
  for (const key of [...inputs.keys()].filter(k => k.startsWith('kid-'))) {
    inputs.delete(key)
    errorEls.delete(key)
  }
  kidsList.replaceChildren()
  state.kids.forEach((value, i) => {
    const key = `kid-${i}`
    const input = h('input', { 'id': `in-${key}`, 'type': 'text', 'inputmode': 'numeric', 'autocomplete': 'off', 'aria-describedby': `err-${key}`, 'data-testid': `input-${key}` })
    input.value = value
    input.addEventListener('blur', () => {
      if (!kidTouched[i]) {
        kidTouched[i] = true
        update()
      }
    })
    input.addEventListener('input', () => {
      state.kids[i] = input.value
      kidTouched[i] = true
      update()
    })
    const remove = h('button', { 'type': 'button', 'class': 'linkbtn', 'data-testid': `kid-remove-${i}`, 'aria-label': `${t('kidRemove')}：${t('kidLabel', { x: i + 1 })}` }, t('kidRemove'))
    remove.addEventListener('click', () => {
      state.kids.splice(i, 1)
      kidTouched.splice(i, 1)
      renderKids()
      kidAddBtn.focus()
      update()
    })
    const err = h('p', { 'id': `err-${key}`, 'class': 'err', 'data-testid': `error-${key}`, 'aria-live': 'polite' })
    inputs.set(key, input)
    errorEls.set(key, err)
    kidsList.append(h('div', { class: 'kid-row' }, h('label', { 'for': `in-${key}`, 'data-testid': STR.kidLabel.id }, t('kidLabel', { x: i + 1 })), h('div', { class: 'kid-controls' }, input, remove), err))
  })
  if (focusIndex !== undefined)
    inputs.get(`kid-${focusIndex}`)?.focus()
}
kidAddBtn.addEventListener('click', () => {
  state.kids.push('')
  kidTouched.push(false)
  renderKids(state.kids.length - 1)
  update()
})

function toggle(labelKey: StrKey, regionId: string, region: HTMLElement): HTMLButtonElement {
  region.id = regionId
  region.hidden = true
  const btn = h('button', { 'type': 'button', 'class': 'toggle', 'aria-expanded': 'false', 'aria-controls': regionId, 'data-testid': STR[labelKey].id }, t(labelKey))
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true'
    btn.setAttribute('aria-expanded', String(open))
    region.hidden = !open
  })
  return btn
}

function modeRadios(): HTMLElement {
  const modes: [TaxSavingsMode, StrKey][] = [['avDepot', 'modeAv'], ['secondaryDepot', 'modeSecondary'], ['consume', 'modeConsume']]
  const fs = h('fieldset', { 'class': 'field radios', 'data-testid': 'input-taxSavingsMode' }, txt('legend', 'taxSavingsMode'))
  for (const [mode, key] of modes) {
    const r = h('input', { 'type': 'radio', 'name': 'taxSavingsMode', 'value': mode, 'id': `mode-${mode}`, 'data-testid': `radio-${mode}` })
    r.checked = state.taxSavingsMode === mode
    r.addEventListener('change', () => {
      if (r.checked) {
        state.taxSavingsMode = mode
        update()
      }
    })
    fs.append(h('div', { class: 'radio' }, r, txt('label', key, { for: `mode-${mode}` })))
  }
  return fs
}

// ---------- narrow-screen error banner (plan f3; hidden ≥ 1000 px by CSS) ----------

const errJump = txt('button', 'errJump', { type: 'button', class: 'chip' })
const errBanner = h('div', { class: 'err-banner', hidden: true }, txt('p', 'errBanner'), errJump)
errJump.addEventListener('click', () => {
  const target = document.querySelector<HTMLInputElement>('input[aria-invalid="true"]')
  if (!target)
    return
  const region = target.closest<HTMLElement>('[hidden]')
  if (region) {
    const btn = document.querySelector<HTMLButtonElement>(`[aria-controls="${region.id}"]`)
    btn?.click()
  }
  target.focus()
  target.scrollIntoView({ block: 'center' })
})

// ---------- results ----------

// Short live result under the savings input (single-column only). aria-hidden: the results status region announces.
const inlineResult = h('p', { 'class': 'inline-result', 'data-testid': STR.inlineAv.id, 'aria-hidden': 'true' })
const bar = h('div', { 'class': 'vbar', 'data-testid': 'verdict-bar', 'aria-hidden': 'true' })
const status = h('div', { 'class': 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'data-testid': 'result-status' })
const monthlyBox = h('div', { class: 'monthly' })
const compare = h('div', { class: 'compare' })
const yearlyBody = h('div', { class: 'yearly-body' })

function cell(v: number, testid: string): HTMLElement {
  return h('td', { 'data-testid': testid }, formatEuro(v))
}

function compareRows(rowKey: StrKey, m: Money, id: string): HTMLElement {
  return h('tr', {}, txt('th', rowKey, { scope: 'row' }), cell(m.avDepot, `cell-${id}-av`), cell(m.normalDepot, `cell-${id}-normal`))
}

function payoutRows(rowKey: StrKey, p: PayoutMoney, id: string): HTMLElement[] {
  const head = h('tr', { class: 'group' }, h('th', { 'scope': 'rowgroup', 'colspan': '3', 'data-testid': STR[rowKey].id }, t(rowKey)))
  const parts: [StrKey, Money, string][] = [['gross', p.gross, 'gross'], ['tax', p.tax, 'tax'], ['net', p.net, 'net']]
  return [head, ...parts.map(([k, m, s]) => h('tr', { class: `sub ${s}` }, h('th', { scope: 'row' }, t(k)), cell(m.avDepot, `cell-${id}-${s}-av`), cell(m.normalDepot, `cell-${id}-${s}-normal`)))]
}

/** Notes under the Förderung row/column (plan b, f5). Kids note only when the calculation includes a child. */
function foerderungNotes(): HTMLElement[] {
  return [
    txt('p', 'resultSubsidyFootnote', { class: 'help' }),
    txt('p', 'singleOnlyFootnote', { class: 'help' }),
    txt('p', 'spouseOnlyNotice', { class: 'help' }),
    txt('p', 'jointApproxNotice', { class: 'help' }),
    txt('p', 'foerBonus', { class: 'help' }),
    countedKids().length > 0 ? txt('p', 'foerKids', { class: 'help' }) : null,
  ].filter((n): n is HTMLParagraphElement => n !== null)
}

/** Kid rows that go into the calculation. */
function countedKids(): string[] {
  return withTouchedKids(state, kidTouched).values.kids
}

function renderResult(r: Result) {
  const v = verdict(r.payoutTotal.net.avDepot, r.payoutTotal.net.normalDepot)
  const x = formatEuro(Math.abs(v.diff))
  const rounded0 = roundHalfUp(Math.abs(v.diff)) === 0
  const sameKey = (av: StrKey, normal: StrKey, equal: StrKey): StrKey => rounded0 ? equal : v.diff > 0 ? av : normal
  const barKey: StrKey = v.kind === 'av' ? 'barAv' : v.kind === 'normal' ? 'barNormal' : sameKey('barSame', 'barSameNormal', 'barEqual')
  const inlineKey: StrKey = v.kind === 'av' ? 'inlineAv' : v.kind === 'normal' ? 'inlineNormal' : sameKey('inlineSameAv', 'inlineSameNormal', 'inlineEqual')
  inlineResult.textContent = t(inlineKey, { x })
  bar.replaceChildren(
    txt('span', barKey, { class: 'bar-verdict' }, { x }),
    txt('span', 'barMonthly', { class: 'bar-monthly' }, { a: formatEuro(r.monthlyNet.avDepot), b: formatEuro(r.monthlyNet.normalDepot) }),
  )
  status.replaceChildren(...[
    h('p', { 'class': 'verdict', 'data-verdict': v.kind, 'data-testid': STR.verdictAv.id }, verdictSentence(r.payoutTotal.net.avDepot, r.payoutTotal.net.normalDepot)),
    txt('p', 'verdictBasis', { class: 'basis' }),
    txt('p', 'diffNote', { class: 'basis small' }),
    txt('p', 'sensitivity', { class: 'sensitivity' }),
    r.bonusApplied ? txt('p', 'bonusNote', { class: 'note' }) : null,
  ].filter((n): n is HTMLParagraphElement => n !== null))
  monthlyBox.replaceChildren(
    h('div', { class: 'mbox av' }, txt('div', 'colAv', { class: 'mlabel' }), txt('div', 'monthly', { class: 'msub' }), h('div', { 'class': 'mvalue', 'data-testid': 'result-monthly-av' }, formatEuro(r.monthlyNet.avDepot))),
    h('div', { class: 'mbox normal' }, txt('div', 'colNormal', { class: 'mlabel' }), txt('div', 'monthly', { class: 'msub' }), h('div', { 'class': 'mvalue', 'data-testid': 'result-monthly-normal' }, formatEuro(r.monthlyNet.normalDepot))),
  )
  compare.replaceChildren(h('table', { 'class': 'cmp', 'data-testid': 'result-table' },
    h('thead', {}, h('tr', {}, h('td', {}), txt('th', 'colAv', { scope: 'col' }), txt('th', 'colNormal', { scope: 'col' }))),
    h('tbody', {},
      compareRows('rowContrib', r.totalContributions, 'totalContributions'),
      h('tr', { 'class': 'foerderung', 'data-testid': 'row-foerderung' }, h('th', { scope: 'row' }, t(foerderungKey(state.taxSavingsMode))), cell(foerderung(r), 'cell-foerderung-av'), h('td', { 'data-testid': 'cell-foerderung-normal' }, t('dash'))),
      compareRows('rowFinal', r.finalCapital, 'finalCapital'),
      ...payoutRows('rowFirst', r.firstPayoutYear, 'firstPayoutYear'),
      ...payoutRows('rowRegular', r.regularPayoutYear, 'regularPayoutYear'),
      ...payoutRows('rowTotal', r.payoutTotal, 'payoutTotal'),
    ),
  ), txt('p', 'taxNote', { class: 'help' }), ...foerderungNotes())

  const cols: [StrKey, string][] = [['colContribution', 'contribution'], ['colReturn', 'grossReturn'], ['colVorab', 'vorabpauschale'], ['colVorabTax', 'vorabpauschaleTax'], ['colEnd', 'capitalEnd']]
  const label = (k: StrKey) => STR[k].de ? `${t(k)}（${STR[k].de}）` : t(k)
  const head = h('tr', {}, txt('th', 'colYear', { scope: 'col' }), txt('th', 'colAge', { scope: 'col' }),
    ...cols.map(([k]) => h('th', { scope: 'col', class: 'av' }, `AV · ${label(k)}`)),
    ...cols.map(([k]) => h('th', { scope: 'col', class: 'normal' }, `${t('colNormal').split('（')[0]} · ${label(k)}`)))
  const rows = r.years.map(y => h('tr', { 'data-testid': 'yearly-row' },
    h('th', { 'scope': 'row', 'data-label': t('colYear') }, String(y.calendarYear)),
    h('td', { 'data-label': t('colAge') }, String(y.age)),
    ...cols.map(([k, f]) => h('td', { 'class': 'av', 'data-label': `AV · ${label(k)}` }, formatEuro2((y[f as keyof typeof y] as Money).avDepot))),
    ...cols.map(([k, f]) => h('td', { 'class': 'normal', 'data-label': `${t('colNormal').split('（')[0]} · ${label(k)}` }, formatEuro2((y[f as keyof typeof y] as Money).normalDepot))),
  ))
  yearlyBody.replaceChildren(txt('p', 'yearlyNote', { class: 'help' }), txt('p', 'yearlyContribNote', { class: 'help' }), h('table', { 'class': 'yearly', 'data-testid': 'yearly-table' }, h('thead', {}, head), h('tbody', {}, ...rows)))
}

function showError(key: string, e: FieldError | undefined) {
  const el = errorEls.get(key)
  const input = inputs.get(key)
  if (el)
    el.textContent = e ? t(e.key, e.vars) : ''
  if (input)
    input.setAttribute('aria-invalid', e ? 'true' : 'false')
}

function update() {
  const amount = parseAmount(state.fields.savingsRate)
  twoContracts.hidden = !(amount.ok && amount.value > ONE_CONTRACT_CAP)
  const counted = withTouchedKids(state, kidTouched)
  const outcome = evaluate(counted.values)
  const errors = outcome.ok ? {} : placeCrossField(remapKidErrors(outcome.errors, counted.rowOf), lastChanged)
  for (const key of errorEls.keys())
    showError(key, errors[key])
  document.body.classList.toggle('invalid', !outcome.ok)
  errBanner.hidden = outcome.ok
  if (outcome.ok) {
    renderResult(outcome.result)
  }
  else {
    bar.replaceChildren(txt('span', 'barInvalid', { class: 'bar-verdict' }))
    inlineResult.textContent = t('inlineInvalid')
    status.replaceChildren(txt('p', 'noResult', { class: 'verdict invalid' }), txt('p', 'sensitivity', { class: 'sensitivity' }))
    monthlyBox.replaceChildren()
    compare.replaceChildren()
    yearlyBody.replaceChildren()
    const formErr = outcome.errors.form
    if (formErr)
      status.append(h('p', { 'class': 'err', 'data-testid': 'error-form' }, t(formErr.key, formErr.vars)))
  }
  cmp3.update(counted.values, outcome.ok ? outcome.result : null)
  early.update(counted.values, outcome.ok ? outcome : null)
}

// ---------- page ----------

/** Notice: one sentence visible, details + legal basis in a collapsible <details>. */
function notice(key: StrKey, detailsKey?: StrKey, tag: 'div' | 'p' = 'div'): HTMLElement {
  if (!detailsKey)
    return txt(tag, key, { class: 'notice' })
  return h('div', { 'class': 'notice', 'data-testid': STR[key].id },
    h('p', {}, t(key)),
    h('details', {}, txt('summary', 'noticeDetailsSummary'), txt('p', detailsKey)))
}

function link(href: string, text: string, testid?: string): HTMLAnchorElement {
  return h('a', { href, 'target': '_blank', 'rel': 'noopener noreferrer', 'data-testid': testid }, text)
}

function build() {
  const more = h('div', { class: 'more' },
    field('zveRetirement', 'zveRetirement'),
    field('etfReturnRate', 'etfReturnRate'),
    field('avDepotCosts', 'avDepotCosts'),
    field('exemptionOrder', 'exemptionOrder', 'exemptionHelp'),
    modeRadios(),
    field('baseRate', 'baseRate', 'baseRateHelp'),
    field('oneTimePayout', 'oneTimePayout'),
    field('payoutReturnRate', 'payoutReturnRate'),
    field('payoutUntilAge', 'payoutUntilAge'),
    txt('p', 'moreHelp', { class: 'help' }),
  )
  const kids = h('div', { 'class': 'field', 'role': 'group', 'aria-labelledby': 'kids-label', 'aria-describedby': 'help-kids' },
    txt('span', 'kids', { id: 'kids-label', class: 'label' }), kidsList, kidAddBtn, txt('p', 'kidsHelp', { id: 'help-kids', class: 'help' }))

  const form = h('form', { 'class': 'inputs', 'novalidate': true, 'aria-label': t('title') },
    errBanner,
    h('div', { class: 'row2' }, field('age', 'age'), field('retirementAge', 'retirementAge')),
    field('savingsRate', 'savingsRate', 'savingsHelp', h('div', {}, savingsQuick(), twoContracts, inlineResult)),
    field('zveSavingsPhase', 'zveSavings', 'zveHelp'),
    kids,
    h('div', { class: 'joint' }, txt('p', 'noticeSingle', { class: 'notice' })),
    toggle('more', 'more-region', more),
    more,
  )
  form.addEventListener('submit', e => e.preventDefault())

  const results = h('section', { 'class': 'results', 'aria-labelledby': 'results-h' },
    txt('h2', 'resultsHeading', { id: 'results-h' }),
    status, monthlyBox, compare,
  )

  const yearly = h('section', { class: 'yearly-sec' }, toggle('yearly', 'yearly-region', yearlyBody), yearlyBody)

  const sha = forkCommit()
  const notes = h('footer', { 'class': 'notes', 'aria-labelledby': 'notes-h' },
    txt('h2', 'notesHeading', { id: 'notes-h' }),
    notice('noticeSchaedlich', 'noticeSchaedlichDetails'),
    notice('noticeKids', 'noticeKidsDetails'),
    h('p', { 'class': 'notice', 'data-testid': STR.noticeParams.id }, link(CORE_COMMIT_URL, t('noticeParams', { date: PARAMS_CHECK_DATE, sha: CORE_COMMIT_SHORT }))),
    txt('p', 'noticeDisclaimer', { class: 'notice' }),
    txt('p', 'noticeBrowser', { class: 'notice' }),
    h('p', { 'class': 'notice', 'data-testid': STR.noticeSource.id }, t('noticeSource'), ' ', link(forkSourceUrl(), t('noticeSourceLink', { sha: /^[0-9a-f]{40}$/.test(sha) ? sha.slice(0, 7) : sha }), STR.noticeSourceLink.id)),
    txt('p', 'noticeNotAffiliated', { class: 'notice' }),
  )

  const app = h('main', { class: 'app' },
    h('header', {}, txt('h1', 'title', {}, {}), txt('p', 'subtitle', { class: 'subtitle' }),
      h('div', { 'class': 'banner', 'role': 'note' }, txt('p', 'noticeStart', { class: 'notice' }), notice('noticeLock', 'noticeLockDetails'))),
    txt('p', 'numberFormat', { class: 'numfmt' }),
    bar,
    h('div', { class: 'grid' }, form, results),
    cmp3.section,
    early.section,
    // Mandatory notices sit above the (possibly very long) yearly table so they are always reachable.
    notes,
    yearly,
  )
  // Title shows the German term in brackets.
  app.querySelector('h1')!.textContent = `${t('title')}（${STR.title.de}）`
  document.body.append(app)
  update()
}

// ---------- iframe height (ResizeObserver → postMessage) ----------

function reportHeight() {
  if (window.parent === window)
    return
  document.documentElement.classList.add('embedded')
  let last = 0
  const send = () => {
    const height = Math.ceil(document.documentElement.getBoundingClientRect().height)
    if (height !== last) {
      last = height
      window.parent.postMessage({ type: HEIGHT_MESSAGE_TYPE, height }, '*')
    }
  }
  new ResizeObserver(send).observe(document.body)
  window.addEventListener('load', send)
  send()
}

build()
reportHeight()
