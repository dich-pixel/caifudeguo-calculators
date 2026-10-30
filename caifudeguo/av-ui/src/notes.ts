/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Licensed under AGPL-3.0-only.
 *
 * 0.3.2: reference notes that are folded into one 「详情与依据」 <details> (same wording, same order as before); the other
 * notes stay visible. No inline styles.
 */
import type { StrKey } from './strings'
import { h, txt } from './dom'

/** one <details>「详情与依据」 holding the given notes, in the given order */
export function foldedNotes(keys: StrKey[]): HTMLElement {
  return h('details', { class: 'notes-fold' }, txt('summary', 'noticeDetailsSummary'), ...keys.map(k => txt('p', k, { class: 'help' })))
}

/** notes under the overall result table: footnotes stay visible; taxNote, jointApproxNotice, foerBonus are folded */
export function resultNotes(kidsCounted: boolean): HTMLElement[] {
  const visible: StrKey[] = ['resultSubsidyFootnote', 'singleOnlyFootnote', 'spouseOnlyNotice']
  if (kidsCounted)
    visible.push('foerKids')
  return [...visible.map(k => txt('p', k, { class: 'help' })), foldedNotes(['taxNote', 'jointApproxNotice', 'foerBonus'])]
}

/** footer: the two sentences stay visible, their details + legal basis share one <details> */
export function footerNotices(): HTMLElement[] {
  return [
    txt('div', 'noticeSchaedlich', { class: 'notice' }),
    txt('div', 'noticeKids', { class: 'notice' }),
    h('details', {}, txt('summary', 'noticeDetailsSummary'), txt('p', 'noticeSchaedlichDetails'), txt('p', 'noticeKidsDetails')),
  ]
}
