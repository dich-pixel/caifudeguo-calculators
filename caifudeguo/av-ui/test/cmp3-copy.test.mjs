// Stage 3 g4: wording of the comparison block = plan text (PLAN_stage3.md a, b, b2), no style attributes.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { t } from '../src/strings.ts'

const src = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')

describe('g4 wording', () => {
  it('plan texts', () => {
    expect(t('cmp3Toggle')).toBe('不同存钱额的比较（表格 + 曲线）')
    expect(t('cmp3Single')).toBe('按单人报税（Grundtarif）')
    expect(t('cmp3Intro')).toBe('其他输入都按你现在填的值；只按单人报税（Grundtarif）计算，不支持合并报税（Zusammenveranlagung）。')
    expect(t('cmp3ColFoer')).toBe('国家补贴*')
    expect(t('subsidyFootnote')).toBe('* 整个存钱期的合计，是存进去的钱（税前），不是领取时到手的钱。选『花掉』时只算补贴，选另外两种时也算上退税。其他『合计』都指整个领取期。')
    expect(t('resultSubsidyFootnote')).toBe('* 整个存钱期的合计，是存进去的钱（税前），不是领取时到手的钱。选『花掉』时只算补贴，选另外两种时也算上退税。')
    expect(t('cmp3Invalid')).toBe('输入有误，暂无比较')
    expect(t('cmp3Label360')).toBe('360 € 以上的部分每存 1 € 补 0,25 €（前 360 € 仍是每 1 € 补 0,50 €）')
    expect(t('cmp3Label1800')).toBe('补贴和抵税都到顶：超过 1.800 € 的部分没有补贴，也不能抵税，领钱时按另一套规则交税')
    expect(t('cmp3Note1800Reinvest')).toBe('选『再存进 AV』时，再存进去的退税也算在超出的部分里。')
    expect(t('cmp3Note13680')).toBe('存入 13.680 € 时，选『存回 AV』和『另存普通账户』结果相同，选『花掉』不同（这是计算核心的处理办法，不是法律规定）。')
    expect(t('cmp3ColMarginal')).toBe('每多存 1 €，整个领取期税后一共多拿约 … €（没有按时间折算）')
    expect(t('cmp3SplitUnder')).toBe('按你的收入和收益率假设计算，换了假设结果可能不同。')
    expect(t('cmp3SplitNote')).toContain('可能偏高')
    expect(t('cmp3SplitNote')).toContain('例如退休后收入 10.000 € 时约 3,4 %')
    expect(t('cmp3SplitNote')).not.toContain('最多')
    expect(t('cmp3ColSplit')).toContain('（约数）')
  })
  it('no recommendation words in cmp3 copy', () => {
    const cmp = src('strings.ts').split('\n').filter(l => /cmp3|kind|sens|max|marginal|foer/.test(l))
    expect(cmp.join('\n')).not.toMatch(/推荐|最优|最佳/)
  })
  it('csp: no style attributes / innerHTML in stage-3 code', () => {
    for (const f of ['cmp3.ts', 'compare.ts', 'dom.ts', 'main.ts'])
      expect(src(f)).not.toMatch(/setAttribute\('style'|\.style\.|innerHTML|style=/)
  })
})

describe('g8 narrow error banner', () => {
  it('wording and behaviour hooks', () => {
    expect(t('errBanner')).toBe('请先改正标红的项目')
    expect(t('errJump')).toBe('跳到第一个标红项')
    const main = src('main.ts')
    expect(main).toContain('input[aria-invalid="true"]')
    expect(main).toMatch(/errBanner\.hidden = outcome\.ok/)
    expect(src('style.css')).toMatch(/@media \(min-width: 1000px\) \{ \.err-banner \{ display: none; \} \}/)
  })
})

describe('g12 testids and live regions', () => {
  it('t3-93: footnotes and the recalculating status have their own testids', async () => {
    const { STR } = await import('../src/strings.ts')
    const ids = Object.values(STR).map(v => v.id)
    expect(ids.filter(id => id.startsWith('cmp3-split-'))).toEqual([])
    expect(ids.filter(id => id === 'cmp3-status')).toHaveLength(1)
    expect(STR.cmp3Rebusy.id).toBe('cmp3-status-recalc')
    expect([STR.cmp3SplitUnder.id, STR.cmp3SplitNote.id, STR.cmp3SplitNoteSecondary.id, STR.cmp3SplitLe1800.id, STR.cmp3SplitLt120.id])
      .toEqual(['cmp3-splitnote-under', 'cmp3-splitnote-approx', 'cmp3-splitnote-secondary', 'cmp3-splitnote-le1800', 'cmp3-splitnote-lt120'])
  })
  it('t3-84: the invalid text in the comparison block is not in a live region', () => {
    const cmp = src('cmp3.ts')
    const invalid = cmp.indexOf("summary.replaceChildren(txt('p', 'cmp3Invalid'))")
    expect(cmp.lastIndexOf("summary.removeAttribute('aria-live')", invalid)).toBeGreaterThan(cmp.lastIndexOf('if (!main)', invalid))
    expect(cmp).toContain("summary.setAttribute('aria-live', 'polite')")
  })
})

describe('stage 4: single filing only (PLAN_stage4.md 2.2, 2.3, Q9, Q10)', () => {
  const FOOT = '已婚合并报税（Zusammenveranlagung，§26b EStG）按 Splittingtarif（§32a Abs. 5 EStG）算税，夫妻的储蓄者免税额合计 2.000 €（§20 Abs. 9 S. 2 EStG），配偶自己的合同和补贴也要另算（只靠配偶才有资格的一方，补贴最多 175 €，存的钱算进配偶的抵税额度里）。这些计算器都没有算，结果只适用于单人。'
  const SPOUSE = '如果你自己没有交法定养老保险，只是因为配偶有资格才能拿补贴（mittelbar zulageberechtigt，§79 S. 2 EStG），这个计算器不适合你：你的补贴最多 175 €，存的钱也要算进配偶的抵税额度，计算器算不出这些。'
  it('plan texts', async () => {
    const { STR } = await import('../src/strings.ts')
    expect(t('noticeSingle')).toBe('本计算器只按单人的基本税率（Grundtarif）和 2026 年税表计算，不支持已婚合并报税（Zusammenveranlagung）。合并报税时退税和领取时的税可能不同。')
    expect(STR.noticeSingle.source).toBe('§32a Abs. 1 EStG（Grundtarif）；§26b EStG（Zusammenveranlagung）')
    expect(t('singleOnlyFootnote')).toBe(FOOT)
    expect(t('spouseOnlyNotice')).toBe(SPOUSE)
    expect(t('singleOnlyFootnote').startsWith('*')).toBe(false)
    expect('joint' in STR).toBe(false)
    expect(Object.values(STR).map(v => v.id)).not.toContain('placeholder-joint')
    expect(Object.values(STR).map(v => v.zh).join('')).not.toContain('即将推出')
  })
  it('footnotes: after both subsidy footnotes, spouseOnlyNotice right after singleOnlyFootnote', () => {
    const main = src('main.ts')
    const m0 = main.indexOf("txt('p', 'resultSubsidyFootnote'")
    const m1 = main.indexOf("txt('p', 'singleOnlyFootnote'")
    const m2 = main.indexOf("txt('p', 'spouseOnlyNotice'")
    expect(m0).toBeGreaterThan(0)
    expect(m1).toBeGreaterThan(m0)
    expect(m2).toBeGreaterThan(m1)
    expect(main.slice(m0, m2).split('\n')).toHaveLength(3)
    const cmp = src('cmp3.ts')
    expect(cmp).toMatch(/'subsidyFootnote',\n\s*'singleOnlyFootnote',\n\s*'spouseOnlyNotice',/)
  })
  it('no placeholder button, .placeholder css removed, .joint kept', () => {
    expect(src('main.ts')).not.toMatch(/placeholder|txt\('button', 'joint'/)
    const css = src('style.css')
    expect(css).not.toContain('.placeholder')
    expect(css).toContain('.joint { margin')
    expect(css).toContain('.joint .notice')
  })
  it('csp: no style attributes anywhere in the UI source; notices rendered', () => {
    for (const f of ['main.ts', 'cmp3.ts', 'compare.ts', 'chart.ts', 'dom.ts'])
      expect(src(f)).not.toMatch(/style=|\.style\.|setAttribute\('style'/)
    expect(src('main.ts')).toContain("h('div', { class: 'joint' }, txt('p', 'noticeSingle', { class: 'notice' }))")
    expect(src('cmp3.ts')).toContain("txt('p', 'cmp3Intro', { class: 'help' })")
  })
})
