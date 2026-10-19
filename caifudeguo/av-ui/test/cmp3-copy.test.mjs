// Stage 3 g4: wording of the comparison block = plan text (PLAN_stage3.md a, b, b2), no style attributes.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { t } from '../src/strings.ts'

const src = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')

describe('g4 wording', () => {
  it('plan texts', () => {
    expect(t('cmp3Toggle')).toBe('不同存钱额的比较（表格 + 曲线）')
    expect(t('cmp3Single')).toBe('按单人报税（Grundtarif）')
    expect(t('cmp3Intro')).toBe('其他输入都按你现在填的值；按单人报税计算。')
    expect(t('cmp3ColFoer')).toBe('国家补贴*')
    expect(t('cmp3SubsidyFootnote')).toBe('* 整个存钱期的合计（税前）。选『花掉』时只算补贴，选另外两种时也算上退税。其他『合计』都指整个领取期。')
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
