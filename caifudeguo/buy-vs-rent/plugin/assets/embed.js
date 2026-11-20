/*
 * caifu-buy-vs-rent embed: iframe height + settings injection.
 * Trust model: a message is used only if BOTH hold: (a) event.source is the contentWindow of one of our iframes and
 * (b) event.origin is the origin of that iframe, taken from new URL(data-lazy-src || src, page base URI), or an origin
 * listed in the optional window.caifuBuyVsRent.origins. The page's own origin is never accepted implicitly.
 * The config is read at message time, never at script start, so it works even if the inline config script runs later
 * (WP Rocket "Delay JavaScript execution", defer, async). On start the script asks every iframe to repeat its height
 * and pushes current settings, because the calculator may have started before this script ran.
 * Copyright (C) 2026 Rich Dr (caifudeguo.de). AGPL-3.0-only.
 */
(function () {
  'use strict'
  const MIN = 100
  const MAX = 200000
  const SELECTOR = 'iframe.caifu-buy-vs-rent'
  const HEIGHT_TYPE = 'caifu-buy-vs-rent:height'
  const RESEND_TYPE = 'caifu-buy-vs-rent:resend'
  const SETTINGS_TYPE = 'caifu-buy-vs-rent:settings'
  const NEED_TYPE = 'caifu-buy-vs-rent:need-settings'

  const originOf = (frame) => {
    const raw = frame.getAttribute('data-lazy-src') || frame.getAttribute('src')
    if (!raw)
      return ''
    try {
      const o = new URL(raw, document.baseURI).origin
      return o === 'null' ? '' : o
    }
    // eslint-disable-next-line unused-imports/no-unused-vars -- keep the catch binding (older browsers)
    catch (e) {
      return ''
    }
  }

  const cfg = () => window.caifuBuyVsRent
  const extraOrigins = () => {
    const c = cfg()
    return c && Array.isArray(c.origins) ? c.origins : []
  }

  const accepted = (event, frame) => {
    if (!event.source || frame.contentWindow !== event.source)
      return false
    const own = originOf(frame)
    if (own === '')
      return false
    return event.origin === own || extraOrigins().includes(event.origin)
  }

  const pushSettings = (frame) => {
    const target = originOf(frame)
    const c = cfg()
    if (target === '' || !frame.contentWindow || !c || !c.settings)
      return
    frame.contentWindow.postMessage({ type: SETTINGS_TYPE, settings: c.settings }, target)
  }

  window.addEventListener('message', (event) => {
    const data = event.data
    if (!data || typeof data !== 'object')
      return
    const frames = document.querySelectorAll(SELECTOR)
    for (let i = 0; i < frames.length; i++) {
      if (!accepted(event, frames[i]))
        continue
      if (data.type === HEIGHT_TYPE) {
        const height = data.height
        if (typeof height !== 'number' || !Number.isFinite(height) || height < MIN)
          continue
        frames[i].style.height = `${Math.ceil(Math.min(height, MAX))}px`
      }
      if (data.type === NEED_TYPE)
        pushSettings(frames[i])
    }
  })

  const frames0 = document.querySelectorAll(SELECTOR)
  for (let i = 0; i < frames0.length; i++) {
    const target = originOf(frames0[i])
    if (target !== '' && frames0[i].contentWindow) {
      frames0[i].contentWindow.postMessage({ type: RESEND_TYPE }, target)
      pushSettings(frames0[i])
    }
  }
})()
