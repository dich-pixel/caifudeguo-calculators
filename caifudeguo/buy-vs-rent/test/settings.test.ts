import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../src/engine/constants'
import {
  explicitPageLang,
  officialSettingsUrl,
  sanitizeDefaults,
  sanitizePageSettings,
  sanitizeVersion,
} from '../src/ui/settings'

describe('sanitizePageSettings', () => {
  it('accepts a well-formed official payload', () => {
    const clean = sanitizePageSettings({
      lang: 'de',
      basiszins: 0.032,
      basiszins_year: 2026,
      version: '1.0.0',
      disclaimer_zh: '仅供参考',
      disclaimer_de: 'Nur zur Information',
      testInterface: true,
      defaults: { price: 350_000, rent: 1350 },
    })
    expect(clean).toEqual({
      lang: 'de',
      basiszins: 0.032,
      basiszins_year: 2026,
      version: '1.0.0',
      disclaimer_zh: '仅供参考',
      disclaimer_de: 'Nur zur Information',
      testInterface: true,
      defaults: { price: 350_000, rent: 1350 },
    })
  })

  it('rejects HTML injection in version and basiszins_year', () => {
    const clean = sanitizePageSettings({
      version: '<a href=https://evil.example/login>登录领取</a>',
      basiszins_year: '<img src=x onerror=alert(1)>',
      defaults: { price: 777_000 },
    })
    expect(clean.version).toBeUndefined()
    expect(clean.basiszins_year).toBeUndefined()
    expect(clean.defaults?.price).toBe(777_000)
  })

  it('drops a price that is out of range and ignores unknown keys', () => {
    const clean = sanitizePageSettings({
      defaults: { price: 9, rent: 1350, mc_sigma_house: 0.5, evil: 1 },
      __proto__: { lang: 'de' },
      toString: 'nope',
    })
    expect(clean.defaults?.price).toBeUndefined()
    expect(clean.defaults?.rent).toBe(1350)
    expect(clean.defaults).not.toHaveProperty('mc_sigma_house')
    expect(clean.defaults).not.toHaveProperty('evil')
    expect(clean.lang).toBeUndefined()
  })

  it('ignores non-string disclaimer and version so the footer can use built-ins', () => {
    const clean = sanitizePageSettings({
      disclaimer_zh: 1,
      disclaimer_de: { html: '<img>' },
      version: 1,
      basiszins: '0.032',
      basiszins_year: 2026.5,
      lang: 'fr',
      testInterface: 'yes',
    })
    expect(clean).toEqual({})
  })

  it('strips a leading v from a numeric version but not free text', () => {
    expect(sanitizeVersion('v1.0.0')).toBe('1.0.0')
    expect(sanitizeVersion('1.2.3')).toBe('1.2.3')
    expect(sanitizeVersion('v<script>')).toBeUndefined()
  })

  it('rejects a non-object payload', () => {
    expect(sanitizePageSettings(null)).toEqual({})
    expect(sanitizePageSettings('{"price":1}')).toEqual({})
    expect(sanitizePageSettings([{ price: 350_000 }])).toEqual({})
  })
})

describe('sanitizeDefaults', () => {
  it('keeps inherited nulls and enumerated values', () => {
    expect(sanitizeDefaults({ rent_growth: null, nk_mode: 'total' })).toEqual({
      rent_growth: null,
      nk_mode: 'total',
    })
  })

  it('rejects a numeric string and an invalid enum', () => {
    expect(sanitizeDefaults({ price: '350000', nk_mode: 'sneaky' })).toEqual({})
  })

  it('does not treat the built-in default object as dirty', () => {
    const clean = sanitizeDefaults(DEFAULT_INPUTS)
    expect(clean?.price).toBe(DEFAULT_INPUTS.price)
    expect(clean?.rent).toBe(DEFAULT_INPUTS.rent)
  })
})

describe('officialSettingsUrl', () => {
  it('derives the same-origin REST settings URL from the plugin app path', () => {
    expect(
      officialSettingsUrl(
        'https://caifudeguo.de/wp-content/plugins/caifu-buy-vs-rent/app/index.html?v=abc',
        'de',
      ),
    ).toBe(
      'https://caifudeguo.de/wp-json/caifu-buy-vs-rent/v1/settings?lang=de',
    )
    expect(
      officialSettingsUrl(
        'https://caifudeguo.de/sub/wp-content/plugins/caifu-buy-vs-rent/app/index.html',
      ),
    ).toBe('https://caifudeguo.de/sub/wp-json/caifu-buy-vs-rent/v1/settings')
    expect(
      officialSettingsUrl('https://caifudeguo.de/app/index.html'),
    ).toBeNull()
  })

  it('prefers a same-origin advertised REST URL and still attaches lang', () => {
    expect(
      officialSettingsUrl(
        'https://caifudeguo.de/wp-content/plugins/caifu-buy-vs-rent/app/index.html',
        'de',
        'https://caifudeguo.de/wp-json/caifu-buy-vs-rent/v1/settings',
      ),
    ).toBe(
      'https://caifudeguo.de/wp-json/caifu-buy-vs-rent/v1/settings?lang=de',
    )
    expect(
      officialSettingsUrl(
        'https://caifudeguo.de/wp-content/plugins/caifu-buy-vs-rent/app/index.html',
        'de',
        'https://evil.example/wp-json/caifu-buy-vs-rent/v1/settings',
      ),
    ).toBe(
      'https://caifudeguo.de/wp-json/caifu-buy-vs-rent/v1/settings?lang=de',
    )
  })
})

describe('explicitPageLang', () => {
  it('reads zh or de from the query and ignores anything else', () => {
    expect(explicitPageLang('?lang=de&foo=1')).toBe('de')
    expect(explicitPageLang('?lang=zh')).toBe('zh')
    expect(explicitPageLang('?lang=fr')).toBeUndefined()
    expect(explicitPageLang('')).toBeUndefined()
  })
})
