import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../src/engine/constants'
import { mergeInputs } from '../src/engine/validate'
import {
  buildShareUrl,
  extractInstanceSearch,
  inputsToQuery,
  isHttpUrl,
  queryToInputs,
  resolveShareBase,
} from '../src/ui/url'

describe('share link vs effective defaults', () => {
  it('omits inputs that match the effective (admin) defaults', () => {
    const admin = mergeInputs({ price: 350_000, rent: 1600 })
    expect(inputsToQuery(admin, admin)).toBe('')
  })

  it('encodes only values that differ from the admin defaults, not the built-in ones', () => {
    const admin = mergeInputs({ price: 350_000, rent: 1600 })
    const current = mergeInputs({ ...admin, price: 400_000 })
    const q = inputsToQuery(current, admin)
    expect(q).toContain('price=400000')
    expect(q).not.toContain('rent=')
    const fromBuiltin = inputsToQuery(current, DEFAULT_INPUTS)
    expect(fromBuiltin).not.toContain('price=')
    expect(fromBuiltin).toContain('rent=1600')
  })

  it('ignores a legacy bundesland param and mc_sigma_house in the query', () => {
    const parsed = queryToInputs(
      '?bundesland=BY&mc_sigma_house=0.1&price=350000',
    )
    expect('bundesland' in parsed).toBe(false)
    expect('mc_sigma_house' in parsed).toBe(false)
    expect(parsed.price).toBe(350_000)
  })

  it('round-trips the Sparerpauschbetrag switch and Kirchensteuer rate', () => {
    const inputs = mergeInputs({ use_sparer_kirchen: true, kirchen_rate: 0.08 })
    const q = inputsToQuery(inputs)
    expect(q).toContain('use_sparer_kirchen=1')
    expect(q).toContain('kirchen_rate=0.08')
    const parsed = queryToInputs(`?${q}`)
    expect(parsed.use_sparer_kirchen).toBe(true)
    expect(parsed.kirchen_rate).toBe(0.08)
  })

  it('falls back to defaults for unknown or invalid params', () => {
    const parsed = queryToInputs(
      '?foo=bar&price=not-a-number&horizon_years=2.5&rent=1500',
    )
    expect('foo' in parsed).toBe(false)
    expect('price' in parsed).toBe(false)
    expect('horizon_years' in parsed).toBe(false)
    expect(parsed.rent).toBe(1500)
  })
})

describe('resolveShareBase', () => {
  it('prefers the parent page URL, then referrer, then the iframe URL', () => {
    expect(
      resolveShareBase(
        'https://caifudeguo.de/page/?utm=1#h',
        'https://example.com/ref',
        'https://cdn.example/app/index.html',
      ),
    ).toBe('https://caifudeguo.de/page/?utm=1#h')
    expect(
      resolveShareBase(
        'javascript:alert(1)',
        'https://example.com/ref',
        'https://cdn.example/app/index.html',
      ),
    ).toBe('https://example.com/ref')
    expect(
      resolveShareBase('', '', 'https://cdn.example/app/index.html?x=1'),
    ).toBe('https://cdn.example/app/index.html?x=1')
  })

  it('rejects non-http(s) candidates', () => {
    expect(isHttpUrl('https://ok.example/a')).toBe(true)
    expect(isHttpUrl('http://localhost:4178/x')).toBe(true)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('data:text/html,hi')).toBe(false)
    expect(isHttpUrl('/relative')).toBe(false)
  })
})

describe('extractInstanceSearch namespacing', () => {
  it('uses unprefixed keys on a single-instance page (backward compatible)', () => {
    const q = extractInstanceSearch('?utm=keep&price=350000&rent=1500', {
      instanceId: 'bvr1',
      multi: false,
      first: true,
    })
    const parsed = queryToInputs(`?${q}`)
    expect(parsed.price).toBe(350_000)
    expect(parsed.rent).toBe(1500)
    expect(q).not.toContain('utm')
  })

  it('lets prefixed keys win over unprefixed for that instance', () => {
    const q = extractInstanceSearch(
      '?price=111&bvr2.price=350000&bvr2.rent=1500',
      {
        instanceId: 'bvr2',
        multi: true,
        first: false,
      },
    )
    const parsed = queryToInputs(`?${q}`)
    expect(parsed.price).toBe(350_000)
    expect(parsed.rent).toBe(1500)
  })

  it('applies unprefixed keys only to the first instance on a multi-instance page', () => {
    const first = extractInstanceSearch('?price=350000', {
      instanceId: 'bvr1',
      multi: true,
      first: true,
    })
    const second = extractInstanceSearch('?price=350000', {
      instanceId: 'bvr2',
      multi: true,
      first: false,
    })
    expect(queryToInputs(`?${first}`).price).toBe(350_000)
    expect(second).toBe('')
  })

  it('ignores another instance’s prefix', () => {
    const q = extractInstanceSearch('?bvr2.price=350000', {
      instanceId: 'bvr1',
      multi: true,
      first: true,
    })
    expect(q).toBe('')
  })

  it('supports a custom instance id as the prefix', () => {
    const q = extractInstanceSearch('?extra.price=350000', {
      instanceId: 'extra',
      multi: true,
      first: false,
    })
    expect(queryToInputs(`?${q}`).price).toBe(350_000)
  })
})

describe('buildShareUrl', () => {
  const changed = mergeInputs({ price: 350_000 })

  it('keeps the parent path, unrelated query, and hash, and uses unprefixed keys when alone', () => {
    const url = buildShareUrl(
      'https://caifudeguo.de/rechner/?utm=keep#faq',
      changed,
      DEFAULT_INPUTS,
      { instanceId: 'bvr1', namespaced: false },
    )
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe(
      'https://caifudeguo.de/rechner/',
    )
    expect(parsed.searchParams.get('utm')).toBe('keep')
    expect(parsed.searchParams.get('price')).toBe('350000')
    expect(parsed.searchParams.get('bvr1.price')).toBeNull()
    expect(parsed.hash).toBe('#faq')
  })

  it('replaces previous unprefixed calculator params without dropping others', () => {
    const url = buildShareUrl(
      'https://caifudeguo.de/rechner/?price=111&utm=keep',
      changed,
      DEFAULT_INPUTS,
      { namespaced: false },
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get('price')).toBe('350000')
    expect(parsed.searchParams.get('utm')).toBe('keep')
  })

  it('namespaces params when the page has multiple instances', () => {
    const url = buildShareUrl(
      'https://caifudeguo.de/rechner/?utm=keep#faq',
      changed,
      DEFAULT_INPUTS,
      { instanceId: 'bvr2', namespaced: true },
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get('utm')).toBe('keep')
    expect(parsed.searchParams.get('price')).toBeNull()
    expect(parsed.searchParams.get('bvr2.price')).toBe('350000')
    expect(parsed.hash).toBe('#faq')
  })

  it('replaces only this instance’s prefixed params', () => {
    const url = buildShareUrl(
      'https://caifudeguo.de/rechner/?bvr1.price=111&bvr2.price=222&utm=keep',
      changed,
      DEFAULT_INPUTS,
      { instanceId: 'bvr2', namespaced: true },
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get('bvr1.price')).toBe('111')
    expect(parsed.searchParams.get('bvr2.price')).toBe('350000')
    expect(parsed.searchParams.get('utm')).toBe('keep')
  })

  it('omits params that still match the defaults', () => {
    const url = buildShareUrl(
      'https://caifudeguo.de/rechner/',
      mergeInputs({}),
      DEFAULT_INPUTS,
      { namespaced: false },
    )
    expect(new URL(url).search).toBe('')
  })
  it('drops leftover prefixed keys on a single-instance copy so they cannot win on reopen', () => {
    const url = buildShareUrl(
      'https://caifudeguo.de/rechner/?bvr1.price=430000&utm=keep',
      mergeInputs({ price: 440_000 }),
      DEFAULT_INPUTS,
      { instanceId: 'bvr1', namespaced: false },
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get('price')).toBe('440000')
    expect(parsed.searchParams.get('bvr1.price')).toBeNull()
    expect(parsed.searchParams.get('utm')).toBe('keep')
  })

  it('drops leftover unprefixed keys on a first-instance namespaced copy', () => {
    const url = buildShareUrl(
      'https://caifudeguo.de/rechner/?price=420000&utm=keep',
      mergeInputs({}),
      DEFAULT_INPUTS,
      { instanceId: 'bvr1', namespaced: true, first: true },
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get('price')).toBeNull()
    expect(parsed.searchParams.get('bvr1.price')).toBeNull()
    expect(parsed.searchParams.get('utm')).toBe('keep')
  })

  it('does not drop unprefixed keys when copying a later instance', () => {
    const url = buildShareUrl(
      'https://caifudeguo.de/rechner/?price=420000&utm=keep',
      mergeInputs({ price: 350_000 }),
      DEFAULT_INPUTS,
      { instanceId: 'bvr2', namespaced: true, first: false },
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get('price')).toBe('420000')
    expect(parsed.searchParams.get('bvr2.price')).toBe('350000')
    expect(parsed.searchParams.get('utm')).toBe('keep')
  })
})
