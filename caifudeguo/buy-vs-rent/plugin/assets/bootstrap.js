/**
 * Per-instance helper printed after each calculator iframe.
 * Runs even when embed.js is still delayed (nowprocket / exclusion).
 * Copies this instance’s share params onto the iframe src before it loads,
 * and postMessages official settings from data-cbr-settings.
 * Never replaces src after the iframe has loaded.
 */
;(function () {
  const script = document.currentScript
  const frame = script ? script.previousElementSibling : null
  if (!frame || !frame.classList) return
  if (!frame.classList.contains('caifu-buy-vs-rent')) return

  const SHARE_KEYS = {
    price: 1,
    renovation: 1,
    down_payment: 1,
    wealth: 1,
    nk_mode: 1,
    nk_total_pct: 1,
    grest_pct: 1,
    notary_pct: 1,
    broker_buy_pct: 1,
    maint_pct: 1,
    maint_base: 1,
    building_share: 1,
    maint_growth: 1,
    buyer_other_costs: 1,
    buyer_other_growth: 1,
    house_growth: 1,
    loan_rate: 1,
    init_tilgung: 1,
    fix_years: 1,
    follow_rate: 1,
    follow_mode: 1,
    follow_tilgung: 1,
    sondertilgung_pct: 1,
    rent: 1,
    rent_growth: 1,
    renter_nebenkosten: 1,
    renter_nk_growth: 1,
    renter_renovation: 1,
    cash_monthly: 1,
    cash_growth: 1,
    etf_return: 1,
    inflation: 1,
    horizon_years: 1,
    house_err: 1,
    etf_err: 1,
    borrow_rate: 1,
    sell_cost_pct: 1,
    self_use_exempt: 1,
    personal_tax_rate: 1,
    use_sparer_kirchen: 1,
    kirchen_rate: 1,
    mc_runs: 1,
    mc_sigma: 1,
    mc_seed: 1,
  }

  const alreadyLoaded = () => {
    if (frame.getAttribute('data-cbr-attached') === '1') return true
    try {
      const w = frame.contentWindow
      if (!w || !w.location) return false
      const href = w.location.href
      return href !== '' && href !== 'about:blank'
    } catch {
      const src = frame.getAttribute('src')
      return Boolean(src && src !== 'about:blank')
    }
  }

  const postSettings = () => {
    const raw = frame.getAttribute('data-cbr-settings')
    const w = frame.contentWindow
    if (!raw || !w) return
    let settings
    try {
      settings = JSON.parse(raw)
    } catch {
      return
    }
    if (!settings || typeof settings !== 'object') return
    const frames = document.querySelectorAll('iframe.caifu-buy-vs-rent')
    let index = -1
    for (let i = 0; i < frames.length; i++) {
      if (frames[i] === frame) index = i
    }
    const instanceId = frame.getAttribute('data-cbr-id') || ''
    try {
      w.postMessage(
        {
          type: 'caifu-buy-vs-rent:settings',
          settings,
          pageUrl: location.href,
          instanceId,
          namespaced: frames.length > 1,
          first: index === 0,
          search: location.search,
        },
        '*',
      )
    } catch {
      // ignore a detached frame
    }
  }

  if (!alreadyLoaded()) {
    const raw =
      frame.getAttribute('data-lazy-src') ||
      frame.getAttribute('data-src') ||
      frame.getAttribute('src')
    if (raw && raw !== 'about:blank') {
      let url
      try {
        url = new URL(raw, document.baseURI)
      } catch {
        url = null
      }
      if (url) {
        const id = frame.getAttribute('data-cbr-id') || ''
        const frames = document.querySelectorAll('iframe.caifu-buy-vs-rent')
        let index = -1
        for (let i = 0; i < frames.length; i++) {
          if (frames[i] === frame) index = i
        }
        const first = index === 0
        const prefix = `${id}.`
        const params = new URLSearchParams(location.search)
        const pref = new URLSearchParams()
        const un = new URLSearchParams()
        let hasPref = false
        params.forEach((v, k) => {
          if (id && k.indexOf(prefix) === 0) {
            const key = k.slice(prefix.length)
            if (SHARE_KEYS[key]) {
              pref.set(key, v)
              hasPref = true
            }
            return
          }
          if (SHARE_KEYS[k]) un.set(k, v)
        })
        const extra = hasPref ? pref : first ? un : new URLSearchParams()
        Object.keys(SHARE_KEYS).forEach((k) => {
          url.searchParams.delete(k)
        })
        extra.forEach((v, k) => {
          url.searchParams.set(k, v)
        })
        const next = url.toString()
        let cur = raw
        try {
          cur = new URL(raw, document.baseURI).toString()
        } catch {
          // keep the raw attribute value
        }
        if (cur !== next) {
          const attr = frame.hasAttribute('data-lazy-src')
            ? 'data-lazy-src'
            : frame.hasAttribute('data-src')
              ? 'data-src'
              : 'src'
          frame.setAttribute(attr, next)
          if (attr !== 'src') {
            const curSrc = frame.getAttribute('src')
            if (curSrc && curSrc !== 'about:blank')
              frame.setAttribute('src', next)
          }
        }
      }
    }
  }

  postSettings()
  frame.addEventListener('load', () => {
    frame.setAttribute('data-cbr-attached', '1')
    postSettings()
  })
})()
