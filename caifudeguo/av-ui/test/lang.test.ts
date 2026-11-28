// Language dictionary: every Chinese key has German UI copy, and zh sentences stay byte-identical.
import type { FormValues } from '../src/model'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { clearSweepCache, maxText, sensitivityText, sweep } from '../src/compare'
import { DE, documentTitle, getLang, htmlLang, langFromSearch, pageHeading, setLang, STR, t } from '../src/strings'
import { LEGACY_DEFAULTS as DEFAULTS } from './legacy-defaults'

const HAN = /\p{Script=Han}/u
const FULLWIDTH = /[，。：；「」『』]/
const TODAY = new Date(2026, 9, 17)

function tokens(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]!).sort()
}

function form(fields: Partial<FormValues['fields']> = {}): FormValues {
  return { ...structuredClone(DEFAULTS), fields: { ...DEFAULTS.fields, ...fields } }
}

afterEach(() => setLang('zh'))

describe('zh/de dictionary', () => {
  it('every zh key has a non-empty German string and the same placeholders', () => {
    expect(Object.keys(DE).sort()).toEqual(Object.keys(STR).sort())
    for (const key of Object.keys(STR) as (keyof typeof STR)[]) {
      expect(DE[key].trim().length, key).toBeGreaterThan(0)
      expect(tokens(DE[key]), key).toEqual(tokens(STR[key].zh))
    }
  })

  it('german UI copy has no Han characters except the 中文 button name', () => {
    for (const [key, text] of Object.entries(DE)) {
      expect(text, key).not.toMatch(FULLWIDTH)
      if (key === 'langZh') {
        expect(text).toBe('中文')
        continue
      }
      expect(text, key).not.toMatch(HAN)
    }
  })

  it('t() stays on the original Chinese until setLang(de)', () => {
    expect(getLang()).toBe('zh')
    expect(t('title')).toBe('养老投资账户计算器')
    expect(t('cmp3Toggle')).toBe('不同存钱额的比较（表格）')
    expect(pageHeading()).toBe('养老投资账户计算器（Altersvorsorgedepot）')
    expect(documentTitle()).toBe('养老投资账户计算器（Altersvorsorgedepot）· caifudeguo.de')
    expect(htmlLang()).toBe('zh-Hans')
    setLang('de')
    expect(t('title')).toBe('Altersvorsorgedepot-Rechner')
    expect(pageHeading()).toBe('Altersvorsorgedepot-Rechner')
    expect(documentTitle()).toBe('Altersvorsorgedepot-Rechner · caifudeguo.de')
    expect(htmlLang()).toBe('de')
    expect(t('errMin', { min: '120' })).toBe('Darf nicht kleiner als 120 sein.')
    setLang('zh')
    expect(t('title')).toBe('养老投资账户计算器')
  })

  it('only lang=de and lang=zh are accepted', () => {
    expect(langFromSearch('')).toBe('zh')
    expect(langFromSearch('?lang=zh')).toBe('zh')
    expect(langFromSearch('?lang=de')).toBe('de')
    expect(langFromSearch('?v=0.3.3&lang=de')).toBe('de')
    expect(langFromSearch('?lang=en')).toBe('zh')
    expect(langFromSearch('?lang=')).toBe('zh')
    expect(langFromSearch('?lang=DE')).toBe('zh')
  })

  it('does not use storage', () => {
    const src = ['main.ts', 'strings.ts', 'dom.ts', 'cmp3.ts', 'compare.ts', 'early-exit-view.ts', 'chart.ts', 'notes.ts']
      .map(f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')).join('\n')
    expect(src).not.toMatch(/localStorage|sessionStorage|document\.cookie/)
  })

  it('the toggle is at least 32px with a 14px font, and no text is below 0.75rem', () => {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.lang-toggle button \{[^}]*min-height:\s*32px/)
    expect(css).toMatch(/\.lang-toggle button \{[^}]*font-size:\s*14px/)
    expect(css).not.toMatch(/font-size:\s*0\.[0-6]\d*rem/)
    expect(css).not.toContain('0.7rem')
    expect(css).toMatch(/html\[lang='de'\] body \{ hyphens: auto/)
  })

  it('german Kinderzulage says 25 Jahre and the marginal header is a full sentence', () => {
    setLang('de')
    expect(t('noticeKids')).toContain('bis 25 Jahre')
    expect(t('cmp3ColMarginal')).toContain('den du einzahlst')
    expect(t('retirementAge')).toContain('\u00AD')
    setLang('zh')
    expect(t('retirementAge')).toBe('退休年龄')
    expect(t('noticeKids')).not.toContain('Jahre')
  })

  it('the WordPress shortcode forwards only lang=de or lang=zh', () => {
    const php = readFileSync(new URL('../../wp-plugin/caifudeguo-av-depot/caifudeguo-av-depot.php', import.meta.url), 'utf8')
    expect(php).toContain("'lang'")
    expect(php).toMatch(/\$lang !== 'de' && \$lang !== 'zh'/)
    expect(php).toContain("'AV-Depot-Rechner'")
    expect(php).toContain('中文和德文界面')
    const readme = readFileSync(new URL('../../wp-plugin/caifudeguo-av-depot/readme.txt', import.meta.url), 'utf8')
    expect(readme).toContain('中文和德文界面')
  })
})

describe('de sentences keep the same numbers', () => {
  it('sensitivity and max text translate without changing the figures', () => {
    clearSweepCache()
    const s = sweep(form(), undefined, { today: TODAY })
    if (!s)
      throw new Error('null sweep')
    setLang('zh')
    const zhSens = sensitivityText(s)
    const zhMax = maxText(s)
    expect(zhSens).toBe('按你现在的其他输入，在 6.840–8.400 € 之间变成两者基本相同，在 10.000–13.680 € 之间又变成普通账户多拿。')
    expect(zhMax).toBe('在这些档位里，差额最大的是 1.800 €（AV 多拿约 25.107\u00A0€，税后）。')
    setLang('de')
    const deSens = sensitivityText(s)
    const deMax = maxText(s)
    expect(deSens).not.toMatch(HAN)
    expect(deMax).not.toMatch(HAN)
    expect(deSens).toContain('6.840')
    expect(deSens).toContain('8.400')
    expect(deSens).toContain('10.000')
    expect(deSens).toContain('13.680')
    expect(deMax).toContain('1.800')
    expect(deMax).toContain('25.107')
  }, 20000)
})
