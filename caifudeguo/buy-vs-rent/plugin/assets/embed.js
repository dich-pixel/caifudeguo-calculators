/*
 * caifu-buy-vs-rent embed: iframe height + settings injection + share-link parent URL.
 * Trust model: a message is used only if BOTH hold: (a) event.source is the contentWindow of one of our iframes and
 * (b) event.origin is the origin of that iframe, taken from new URL(data-lazy-src || src, page base URI), or an origin
 * listed in the optional window.caifuBuyVsRent.origins. The page's own origin is never accepted implicitly.
 * The config is read at message time, never at script start, so it works even if the inline config script runs later
 * (WP Rocket "Delay JavaScript execution", defer, async). On start the script asks every iframe to repeat its height
 * and pushes current settings, because the calculator may have started before this script ran.
 *
 * Share params are read from location.href at runtime (never baked into cached HTML) and forwarded onto the iframe
 * src / data-lazy-src. The parent page URL and instance id are also postMessage'd so "copy link" can rebuild a
 * parent-page URL. Instance ids come from data-cbr-id (shortcode id="…") or auto bvr1, bvr2, … in document order.
 * Copyright (C) 2026 Rich Dr (caifudeguo.de). AGPL-3.0-only.
 */
;(function () {
  'use strict'
  const MIN = 100
  const MAX = 200000
  const SELECTOR = 'iframe.caifu-buy-vs-rent'
  const HEIGHT_TYPE = 'caifu-buy-vs-rent:height'
  const RESEND_TYPE = 'caifu-buy-vs-rent:resend'
  const SETTINGS_TYPE = 'caifu-buy-vs-rent:settings'
  const NEED_TYPE = 'caifu-buy-vs-rent:need-settings'
  const PAGE_TYPE = 'caifu-buy-vs-rent:page'
  const INSTANCE_RE = /^[a-z][\w-]{0,31}$/i
  const RESERVED_IDS = {
    lang: 1,
    v: 1,
    cbr: 1,
    cbr_test: 1,
    defaults: 1,
    test: 1,
    preset: 1,
  }
  // Keep in sync with DEFAULT_INPUTS in src/engine/constants.ts (except mc_sigma_house, which is never shared).
  const INPUT_KEYS = {
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

  const originOf = (frame) => {
    const raw =
      frame.getAttribute('data-lazy-src') ||
      frame.getAttribute('data-src') ||
      frame.getAttribute('src')
    if (!raw) return ''
    try {
      const o = new URL(raw, document.baseURI).origin
      return o === 'null' ? '' : o
    } catch {
      return ''
    }
  }

  const cfg = () => window.caifuBuyVsRent
  const extraOrigins = () => {
    const c = cfg()
    return c && Array.isArray(c.origins) ? c.origins : []
  }

  const accepted = (event, frame) => {
    if (!event.source || frame.contentWindow !== event.source) return false
    const own = originOf(frame)
    if (own === '') return false
    return event.origin === own || extraOrigins().includes(event.origin)
  }

  const framesOf = () => document.querySelectorAll(SELECTOR)

  const assignIds = (frames) => {
    const used = Object.create(null)
    for (let i = 0; i < frames.length; i++) {
      const raw = frames[i].getAttribute('data-cbr-id')
      if (raw && INSTANCE_RE.test(raw) && !RESERVED_IDS[raw] && !used[raw])
        used[raw] = true
      else frames[i].setAttribute('data-cbr-id', '')
    }
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].getAttribute('data-cbr-id')) continue
      let n = i + 1
      let id = `bvr${n}`
      while (used[id]) {
        n += 1
        id = `bvr${n}`
      }
      frames[i].setAttribute('data-cbr-id', id)
      used[id] = true
    }
  }

  const shareParams = () =>
    typeof window !== 'undefined' ? window.caifuBvrShareParams : null

  const extractSearch = (instanceId, multi, first) => {
    const share = shareParams()
    if (share && typeof share.extractInstanceSearch === 'function') {
      return share.extractInstanceSearch(location.search, {
        instanceId,
        multi,
        first,
      })
    }
    return new URLSearchParams()
  }

  const inputKeys = () => {
    const share = shareParams()
    return share && share.INPUT_KEYS ? share.INPUT_KEYS : INPUT_KEYS
  }

  const frameAlreadyLoaded = (frame) => {
    if (frame.getAttribute('data-cbr-attached') === '1') return true
    try {
      const w = frame.contentWindow
      if (!w || !w.location) return false
      const href = w.location.href
      return href !== '' && href !== 'about:blank'
    } catch {
      return Boolean(
        frame.getAttribute('src') &&
        frame.getAttribute('src') !== 'about:blank',
      )
    }
  }

  const watchFrame = (frame) => {
    if (frame.getAttribute('data-cbr-watch') === '1') return
    frame.setAttribute('data-cbr-watch', '1')
    frame.addEventListener('load', () => {
      frame.setAttribute('data-cbr-attached', '1')
    })
  }

  const applyParamsToFrame = (frame, extra) => {
    watchFrame(frame)
    // Never replace src after the calculator has loaded: that reloads the iframe
    // and wipes values the user already typed (F1). Late params go by postMessage.
    if (frameAlreadyLoaded(frame)) return
    const lazy = frame.hasAttribute('data-lazy-src')
    const dataSrc = frame.hasAttribute('data-src')
    const raw =
      frame.getAttribute('data-lazy-src') ||
      frame.getAttribute('data-src') ||
      frame.getAttribute('src')
    if (!raw || raw === 'about:blank') return
    let url
    try {
      url = new URL(raw, document.baseURI)
    } catch {
      return
    }
    Object.keys(inputKeys()).forEach((key) => {
      url.searchParams.delete(key)
    })
    extra.forEach((v, k) => {
      url.searchParams.set(k, v)
    })
    const next = url.toString()
    const setIfChanged = (name) => {
      const cur = frame.getAttribute(name)
      if (!cur || cur === 'about:blank') {
        if (name === 'src' && (lazy || dataSrc)) return
        frame.setAttribute(name, next)
        return
      }
      let abs = cur
      try {
        abs = new URL(cur, document.baseURI).toString()
      } catch {
        abs = cur
      }
      if (abs !== next) frame.setAttribute(name, next)
    }
    if (lazy) setIfChanged('data-lazy-src')
    if (dataSrc) setIfChanged('data-src')
    setIfChanged('src')
  }

  const syncFrames = () => {
    const frames = framesOf()
    assignIds(frames)
    const multi = frames.length > 1
    for (let i = 0; i < frames.length; i++) {
      const id = frames[i].getAttribute('data-cbr-id')
      applyParamsToFrame(frames[i], extractSearch(id, multi, i === 0))
    }
    return frames
  }

  const pagePayload = (frame) => {
    const frames = framesOf()
    const multi = frames.length > 1
    let index = -1
    for (let i = 0; i < frames.length; i++) {
      if (frames[i] === frame) index = i
    }
    const instanceId = frame.getAttribute('data-cbr-id') || ''
    // Raw parent query; the iframe runs the shared extractInstanceSearch.
    return {
      type: PAGE_TYPE,
      pageUrl: location.href,
      instanceId,
      namespaced: multi,
      first: index === 0,
      search: location.search,
    }
  }

  const pushSettings = (frame) => {
    const target = originOf(frame)
    const c = cfg()
    if (target === '' || !frame.contentWindow) return
    const page = pagePayload(frame)
    frame.contentWindow.postMessage(page, target)
    if (c && c.settings) {
      frame.contentWindow.postMessage(
        {
          type: SETTINGS_TYPE,
          settings: c.settings,
          pageUrl: page.pageUrl,
          instanceId: page.instanceId,
          namespaced: page.namespaced,
          first: page.first,
          search: page.search,
        },
        target,
      )
    }
  }

  window.addEventListener('message', (event) => {
    const data = event.data
    if (!data || typeof data !== 'object') return
    const frames = framesOf()
    for (let i = 0; i < frames.length; i++) {
      if (!accepted(event, frames[i])) continue
      if (data.type === HEIGHT_TYPE) {
        const height = data.height
        if (
          typeof height !== 'number' ||
          !Number.isFinite(height) ||
          height < MIN
        )
          continue
        frames[i].style.height = `${Math.ceil(Math.min(height, MAX))}px`
      }
      if (data.type === NEED_TYPE) pushSettings(frames[i])
    }
  })

  const boot = () => {
    const frames = syncFrames()
    for (let i = 0; i < frames.length; i++) {
      const target = originOf(frames[i])
      if (target !== '' && frames[i].contentWindow) {
        frames[i].contentWindow.postMessage({ type: RESEND_TYPE }, target)
        pushSettings(frames[i])
      }
    }
  }

  boot()
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot)
})()
